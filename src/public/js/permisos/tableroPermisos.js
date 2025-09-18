// users-module.js - Multi-table version

function tableroPermisos() {
    return {
        // Data properties for three tables
        dataRows1: [],
        dataRows2: [],
        dataRows3: [],
        table1: null,
        table2: null,
        table3: null,
        isLoading: true,
        hasError: false,
        show: false,
        descripcion: '',

        // Initialize
        init() {
            this.loadUsersData();
        },

        // Load users data from API
        async loadUsersData() {
            this.isLoading = true;
            this.hasError = false;

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

            // Initialize tables after data is loaded
            this.$nextTick(() => {
                this.initializeTable1();
                this.initializeTable2();
                this.initializeTable3();
            });

            this.isLoading = false;
        },

        // Get table configuration
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
                        field: "solicitante_fullName", // usuario.dato_personal.nombre||apellido_m||apellido_p ...
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
                        field: "solicitado", // gestion_permiso.solicitado
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
                        field: "revisado", // gestion_permiso.revisado
                        formatter: "tickCross",
                        //editor: "tickCross", // Permite editar con click la casilla
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
                        field: "estado", // gestion_permiso.estado
                        width: 110,
                        headerFilter: "select",
                        headerFilterParams: {
                            values: ['Aprobado', 'Pendiente', 'Cancelado', 'Justificado', 'Injustificado']
                        }
                    },
                    {
                        title: "Acciones",
                        field: "descripcion",
                        width: 280,
                        hozAlign: "center",
                        formatter: function (cell) {
                            const rawValue = cell.getValue() || '';

                            // Escapamos para seguridad
                            const safeValue = rawValue
                                .replace(/&/g, '&amp;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;');


                            // TO WORK
                            if (isRevisor) {
                                return `
                                    <button class="bg-blue-600 text-white rounded hover:bg-blue-700 mr-2 ml-2"
                                        onclick="openDescripcionModal('${safeValue}')" style="padding: 0.3rem 0.750rem">
                                        Consultar
                                    </button>
                                    <!-- 
                                    <button class="bg-blue-600 text-white rounded hover:bg-blue-700 mr-2 ml-2"
                                        Cambiar estado
                                    </button>
                                    <button class="bg-blue-600 text-white rounded hover:bg-blue-700 mr-2 ml-2"
                                        Terminar revisión
                                    </button>
                                    -->
                                `;
                            } else {
                                return `
                                    <button class="bg-blue-600 text-white rounded hover:bg-blue-700 mr-2 ml-2"
                                        onclick="openDescripcionModal('${safeValue}')" style="padding: 0.3rem 0.750rem">
                                        Editar
                                    </button>
                                    <!-- 
                                    <button class="bg-blue-600 text-white rounded hover:bg-blue-700 mr-2 ml-2"
                                        Enviar solicitud
                                    </button>
                                    <button class="bg-blue-600 text-white rounded hover:bg-blue-700 mr-2 ml-2"
                                        Borrar
                                    </button>
                                    -->
                                `;
                            }
                        }
                    }
                ],
            };
        },

        // Initialize Tabulator table 1
        initializeTable1() {
            // Destroy existing table if it exists
            if (this.table1) {
                this.table1.destroy();
                this.table1 = null;
            }

            this.table1 = new Tabulator("#data-table-1", this.getTableConfig(this.dataRows1, true));
        },

        // Initialize Tabulator table 2
        initializeTable2() {
            // Destroy existing table if it exists
            if (this.table2) {
                this.table2.destroy();
                this.table2 = null;
            }

            this.table2 = new Tabulator("#data-table-2", this.getTableConfig(this.dataRows2, true));
        },

        // Initialize Tabulator table 3
        initializeTable3() {
            // Destroy existing table if it exists
            if (this.table3) {
                this.table3.destroy();
                this.table3 = null;
            }

            this.table3 = new Tabulator("#data-table-3", this.getTableConfig(this.dataRows3, false));
        },

        // Download functions for Table 3
        /*
        async downloadPDF3() {
            try {
                if (this.table3) { // wanna do table 2? just do: this.table2
                    this.table3.download("pdf", "usuarios_tabla3.pdf", {
                        orientation: "landscape",
                        title: "Lista de Usuarios - Tabla 3 - SIVOC"
                    });
                    this.showNotification('Éxito', 'PDF de Tabla 3 descargado correctamente.');
                } else {
                    this.showNotification('Error', 'No hay datos para descargar en Tabla 3.', 'error');
                }
            } catch (error) {
                console.log("error catch", error);
                this.showNotification('Error', 'Error al descargar PDF de Tabla 3.', 'error');
            }
        },
        async downloadExcel1() {
            try {
                if (this.table1) {
                    this.table1.download("xlsx", "usuarios_tabla1.xlsx", {
                        sheetName: "Usuarios Tabla 1"
                    });
                    this.showNotification('Éxito', 'Excel de Tabla 1 descargado correctamente.');
                } else {
                    this.showNotification('Error', 'No hay datos para descargar en Tabla 1.', 'error');
                }
            } catch (error) {
                console.log("error catch", error);
                this.showNotification('Error', 'Error al descargar Excel de Tabla 1.', 'error');
            }
        },
        */


        // Combined download functions (downloads all tables data in one file)
        async downloadPDF() {
            try {
                // Combine all data from the three tables
                const combinedData = [
                    ...this.dataRows1,
                    ...this.dataRows2,
                    ...this.dataRows3
                ];

                if (combinedData.length > 0) {
                    // Create a temporary table with combined data for download
                    const tempTable = new Tabulator(document.createElement("div"), this.getTableConfig(combinedData));

                    tempTable.download("pdf", "permisos.pdf", {
                        orientation: "landscape",
                        title: "Lista Completa de Usuarios - SIVOC"
                    });

                    //this.showNotification('Éxito', 'PDF con todas las tablas descargado correctamente.');

                    // Clean up temporary table
                    tempTable.destroy();
                } else {
                    //this.showNotification('Error', 'No hay datos para descargar.', 'error');
                }
            } catch (error) {
                console.log("error catch", error);
                //this.showNotification('Error', 'Error al descargar PDF combinado.', 'error');
            }
        },

        async downloadExcel() {
            try {
                // Combine all data from the three tables
                const combinedData = [
                    ...this.dataRows1,
                    ...this.dataRows2,
                    ...this.dataRows3
                ];

                if (combinedData.length > 0) {
                    // Create a temporary table with combined data for download
                    const tempTable = new Tabulator(document.createElement("div"), this.getTableConfig(combinedData));

                    tempTable.download("xlsx", "permisos.xlsx", {
                        sheetName: "Usuarios Completo"
                    });

                    //this.showNotification('Éxito', 'Excel con todas las tablas descargado correctamente.');

                    // Clean up temporary table
                    tempTable.destroy();
                } else {
                    //this.showNotification('Error', 'No hay datos para descargar.', 'error');
                }
            } catch (error) {
                console.log("error catch", error);
                //this.showNotification('Error', 'Error al descargar Excel combinado.', 'error');
            }
        },
        async crearPermiso() {
            try {
                // Llamar al endpoint
                const url = `${NGINX_TAG}${URL_TAG}/permisos/crearSolicitudPermiso`;
                const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

                if (!response.ok) {
                    //this.showNotification('Error', 'Ocurrió un error al crear una nueva solicitud.', 'error');
                    return;
                }

                //this.showNotification('Éxito', 'Se creó un nuevo permiso vacío con éxito.');
            } catch (error) {
                console.error("error catch", error);
                document.querySelectorAll('.fixed.top-4.right-4').forEach(el => el.remove()); // borrar loading si quedó
                //this.showNotification('Error', 'Ocurrió un error al crear una nueva solicitud.', 'error');
            }
        }

    };
}