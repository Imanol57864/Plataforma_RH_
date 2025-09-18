// modalManager.js - Centralized modal management
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.filePondInstances = new Map();
    }

    // Generic modal methods
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("hidden");
            this.activeModals.set(modalId, modal);
        }
    }

    closeModal(modalId) {
        //console.log('ModalManager closeModal called with:', modalId); // Debug log
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("hidden");
            this.activeModals.delete(modalId);

            // Clean up FilePond instance if exists
            this.destroyFilePond(modalId);
        } else {
            //console.log('Modal element not found:', modalId); // Debug log
        }
    }



    // FilePond management
    createFilePond(modalId, selector = '.filepond', options = {}) {
        // Destroy existing instance if any
        this.destroyFilePond(modalId);

        const defaultOptions = {
            name: 'filepond',
            allowMultiple: true,
            maxFiles: 3,
            allowFileTypeValidation: true,
            acceptedFileTypes: ['image/*', ...this.getViewableTypes()],
            allowFileSizeValidation: true,
            maxFileSize: '10MB',
            minFileSize: '1KB',
            server: this.getServerConfig(),
            onaddfile: (error, file) => {
                if (!error) {
                    setTimeout(() => this.addFileClickEvents(modalId), 100);
                }
            },
            onprocessfile: (error, file) => {
                if (!error) {
                    setTimeout(() => this.addFileClickEvents(modalId), 100);
                }
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };

        FilePond.registerPlugin(
            FilePondPluginImagePreview,
            FilePondPluginFileValidateSize,
            FilePondPluginFileValidateType
        );

        const element = document.querySelector(selector);
        if (element) {
            const pond = FilePond.create(element, mergedOptions);
            this.filePondInstances.set(modalId, pond);

            // Set up mutation observer for dynamic file events
            this.setupFileObserver(modalId);

            return pond;
        }
        return null;
    }

    destroyFilePond(modalId) {
        const pond = this.filePondInstances.get(modalId);
        if (pond) {
            pond.destroy();
            this.filePondInstances.delete(modalId);
        }
    }

    // File handling
    getViewableTypes() {
        return [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
    }

    getServerConfig() {
        return {
            process: {
                url: `${NGINX_TAG}${URL_TAG}${FILEPOND_TAG}/upload`,
                method: 'POST',
                ondata: (formData) => {
                    formData.append('entidad_nombre', 'permiso');  // obligatorio
                    formData.append('entidad_id', permisoId); // obligatorio
                    return formData;
                },
                onload: (response) => {
                    const file = JSON.parse(response);
                    return file.id;
                }
            },
            revert: (uniqueFileId, load, error) => {
                fetch(`${NGINX_TAG}${URL_TAG}${FILEPOND_TAG}/upload/${uniqueFileId}`, { method: 'DELETE' })
                    .then(() => load())
                    .catch(() => error('Error deleting file'));
            },
            remove: (uniqueFileId, load, error) => {
                fetch(`${NGINX_TAG}${URL_TAG}${FILEPOND_TAG}/upload/${uniqueFileId}`, { method: 'DELETE' })
                    .then(() => load())
                    .catch(() => error('Error deleting file'));
            },
            load: async (uniqueFileId, load, error) => {
                try {
                    const res = await fetch(`${NGINX_TAG}${URL_TAG}/uploads/${uniqueFileId}`);
                    if (!res.ok) throw new Error('File not found');
                    const blob = await res.blob();
                    const file = new File([blob], uniqueFileId, { type: blob.type });
                    load(file);
                } catch (err) {
                    error('Error loading file');
                }
            }
        };
    }

    async loadExistingFiles(modalId, apiEndpoint = `${NGINX_TAG}${URL_TAG}${FILEPOND_TAG}/files`) {
        const pond = this.filePondInstances.get(modalId);
        if (!pond) return;

        try {
            const response = await fetch(apiEndpoint);
            const files = await response.json();
            if (!Array.isArray(files)) {
                console.error('Invalid files response:', files);
                return;
            }
            for (const fileData of files) {
                const file = await pond.addFile(fileData.id, { type: 'local' });
                file.serverId = fileData.id;
            }

            setTimeout(() => this.addFileClickEvents(modalId), 200);
        } catch (error) {
            console.error('Error loading existing files:', error);
        }
    }

    setupFileObserver(modalId) {
        const pondWrapper = document.querySelector('.filepond');
        if (!pondWrapper) return;

        const observer = new MutationObserver(() => {
            this.addFileClickEvents(modalId);
        });

        observer.observe(pondWrapper, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        setTimeout(() => this.addFileClickEvents(modalId), 100);
    }

    addFileClickEvents(modalId) {
        const fileElements = document.querySelectorAll('.filepond--file');

        fileElements.forEach(fileElement => {
            if (!fileElement.dataset.clickAdded) {
                const fileName = this.getFileNameFromElement(fileElement);

                if (fileName) {
                    fileElement.addEventListener('click', (e) => {
                        if (e.target.closest('.filepond--file-action-button')) {
                            return;
                        }
                        this.viewFile(fileName);
                    });

                    fileElement.dataset.clickAdded = 'true';
                }
            }
        });
    }

    getFileNameFromElement(fileElement) {
        // Try different selectors based on DOM structure
        let fileName = '';

        const legend = fileElement.querySelector('legend');
        if (legend) {
            fileName = legend.textContent.trim();
        }

        if (!fileName) {
            const fileInfo = fileElement.querySelector('.filepond--file-info-main');
            if (fileInfo) {
                fileName = fileInfo.textContent.trim();
            }
        }

        if (!fileName) {
            const fileStatus = fileElement.querySelector('.filepond--file-status-main');
            if (fileStatus && fileStatus.textContent.includes('.')) {
                fileName = fileStatus.textContent.trim();
            }
        }

        if (!fileName && fileElement._file) {
            fileName = fileElement._file.filename || fileElement._file.file.name;
        }

        return fileName;
    }

    viewFile(fileName) {
        window.open(`${NGINX_TAG}${URL_TAG}${FILEPOND_TAG}/view/${encodeURIComponent(fileName)}`, '_blank');
    }
}

// Create global instance
const modalManager = new ModalManager();
const FILEPOND_TAG = "/filepond";

// Enhanced tableroPermisos function with integrated modal management
function tableroPermisos() {
    return {
        // Data properties
        dataRows1: [],
        dataRows2: [],
        dataRows3: [],
        table1: null,
        table2: null,
        table3: null,
        isLoading: true,
        hasError: false,

        // Modal state
        currentModalData: {
            descripcion: '',
            isRevisor: false,
            permisoId: null
        },

        // Initialize
        init() {
            this.loadUsersData();
        },



        // Load data
        async loadUsersData() {
            this.isLoading = true;
            this.hasError = false;

            try {
                if (dataJson) {
                    this.dataRows1 = dataJson.cargarTodosLosPermisos || [];
                    this.dataRows2 = dataJson.cargarPermisosEquipo || [];
                    this.dataRows3 = dataJson.cargarTusPermisos || [];
                } else {
                    this.dataRows1 = [];
                    this.dataRows2 = [];
                    this.dataRows3 = [];
                    console.error(ERROR_MESSAGE, '012');
                }

                this.$nextTick(() => {
                    this.initializeTable1();
                    this.initializeTable2();
                    this.initializeTable3();
                });
            } catch (error) {
                console.error('Error loading data:', error);
                this.hasError = true;
            } finally {
                this.isLoading = false;
            }
        },

        // Modal methods
        openDescripcionModal(descripcion, isRevisor = false, permisoId = null) {
            this.currentModalData = {
                descripcion: descripcion || '',
                isRevisor,
                permisoId
            };

            // Set modal content
            const content = document.getElementById("descripcionModalContent");
            if (content) {
                content.textContent = this.currentModalData.descripcion;
            }

            // Open modal
            modalManager.openModal("descripcionModal");

            // Create FilePond instance
            const pond = modalManager.createFilePond("descripcionModal");

            // Load existing files if permisoId is provided
            if (permisoId) {
                modalManager.loadExistingFiles("descripcionModal", `${NGINX_TAG}${URL_TAG}${FILEPOND_TAG}/files/${permisoId}`);
            }
        },

        closeDescripcionModal() {
            modalManager.closeModal("descripcionModal");
            this.currentModalData = {
                descripcion: '',
                isRevisor: false,
                permisoId: null
            };
        },

        async openPermisoNotification() {
            modalManager.openModal("crearPermisoModal");
            await new Promise(resolve => setTimeout(resolve, 5000));
            location.href = location.href;
        },

        // Table configuration and initialization
        getTableConfig(data, isRevisor) {
            return {
                data: data,
                layout: "fitColumns",
                movableColumns: true,
                resizableRows: true,
                headerFilterPlaceholder: "Filtrar...",
                height: "415px",
                columns: [
                    {
                        title: "Nombre del solicitante",
                        field: "solicitante_fullName",
                        minWidth: 280,
                        headerFilter: "input"
                    },
                    {
                        title: "Tipo",
                        field: "tipo",
                        width: 125,
                        headerFilter: "select",
                        headerFilterParams: {
                            values: ['Home Office', 'Incapacidad', 'Cita médica', 'Asunto familiar']
                        }
                    },
                    {
                        title: "Inicio",
                        field: "fecha_inicio",
                        width: 120,
                        headerFilter: "input"
                    },
                    {
                        title: "Termino",
                        field: "fecha_termino",
                        width: 120,
                        headerFilter: "input"
                    },
                    {
                        title: "¿Solicitado?",
                        field: "solicitado",
                        formatter: "tickCross",
                        width: 115,
                        headerFilter: "select",
                        headerFilterParams: {
                            values: {
                                true: "Sí",
                                false: "No"
                            }
                        }
                    },
                    {
                        title: "¿Revisado?",
                        field: "revisado",
                        formatter: "tickCross",
                        width: 110,
                        headerFilter: "select",
                        headerFilterParams: {
                            values: {
                                true: "Sí",
                                false: "No"
                            }
                        }
                    },
                    {
                        title: "Estado",
                        field: "estado",
                        width: 110,
                        headerFilter: "select",
                        headerFilterParams: {
                            values: ['Aprobado', 'Pendiente', 'Cancelado', 'Justificado', 'Injustificado']
                        }
                    },
                    {
                        title: "Acciones",
                        field: "actions",
                        width: 280,
                        hozAlign: "center",
                        formatter: (cell) => {
                            const rowData = cell.getRow().getData();
                            const descripcion = rowData.descripcion || '';
                            const permisoId = rowData.id || null; // data is JWT encoded

                            // Escape description for safe HTML
                            const safeDescripcion = descripcion
                                .replace(/&/g, '&amp;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;');

                            const buttonText = isRevisor ? 'Consultar' : 'Editar';
                            
                            return `
                                <button 
                                    class="bg-blue-600 text-white rounded hover:bg-blue-700 mr-2 ml-2"
                                    onclick="window.tableroPermisosInstance?.openDescripcionModal('${safeDescripcion}', '${permisoId}')" 
                                    style="padding: 0.3rem 0.750rem">
                                    ${buttonText}
                                </button>
                            `;
                        }
                    }
                ]
            };
        },

        initializeTable1() {
            if (this.table1) {
                this.table1.destroy();
                this.table1 = null;
            }
            this.table1 = new Tabulator("#data-table-1", this.getTableConfig(this.dataRows1, true));
        },

        initializeTable2() {
            if (this.table2) {
                this.table2.destroy();
                this.table2 = null;
            }
            this.table2 = new Tabulator("#data-table-2", this.getTableConfig(this.dataRows2, true));
        },

        initializeTable3() {
            if (this.table3) {
                this.table3.destroy();
                this.table3 = null;
            }
            this.table3 = new Tabulator("#data-table-3", this.getTableConfig(this.dataRows3, false));
        },

        // Download methods
        async downloadPDF() {
            try {
                const combinedData = [
                    ...this.dataRows1,
                    ...this.dataRows2,
                    ...this.dataRows3
                ];

                if (combinedData.length > 0) {
                    const tempTable = new Tabulator(document.createElement("div"), this.getTableConfig(combinedData));
                    tempTable.download("pdf", "permisos.pdf", {
                        orientation: "landscape",
                        title: "Lista Completa de Permisos 1 - SIVOC"
                    });
                    tempTable.destroy();
                }
            } catch (error) {
                console.error("Error downloading PDF:", error);
            }
        },

        async downloadExcel() {
            try {
                const combinedData = [
                    ...this.dataRows1,
                    ...this.dataRows2,
                    ...this.dataRows3
                ];

                if (combinedData.length > 0) {
                    const tempTable = new Tabulator(document.createElement("div"), this.getTableConfig(combinedData));
                    tempTable.download("xlsx", "permisos.xlsx", {
                        sheetName: "Permisos 2 Completo"
                    });
                    tempTable.destroy();
                }
            } catch (error) {
                console.error("Error downloading Excel:", error);
            }
        },

        async crearPermiso() {
            try {
                const url = `${NGINX_TAG}${URL_TAG}/permisos/crearSolicitudPermiso`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    console.error('Error creating permission request');
                    return;
                }

                console.log('Permission request created successfully');
            } catch (error) {
                console.error("Error creating permission:", error);
            }
        }
    };
}

// Make instance globally available for table button clicks
window.tableroPermisosInstance = null;

// Global helper functions for backward compatibility
window.closeDescripcionModal = function () {
    if (window.tableroPermisosInstance) {
        window.tableroPermisosInstance.closeDescripcionModal();
    } else {
        // Fallback - direct DOM manipulation
        const modal = document.getElementById("descripcionModal");
        if (modal) {
            modal.classList.add("hidden");
            modalManager.destroyFilePond("descripcionModal");
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    if (typeof Alpine !== 'undefined') {
        Alpine.data('tableroPermisos', tableroPermisos);
    }
});