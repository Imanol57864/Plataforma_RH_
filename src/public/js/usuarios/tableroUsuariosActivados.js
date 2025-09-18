// users-module.js - Simplified version

function usersModule() {
    return {
        // Data properties
        usersRows: [],
        searchQuery: '',
        table: null,
        isLoading: true,
        hasError: false,

        // Configuration
        areaToPuestos: {
            "Administración": ["Director General", "Coordinador de Finanzas", "Gestora de Tesorería", "Coordinador de Recursos Humanos", "Gestor de Recursos Humanos", "Analista de Recursos Humanos"],
            "Ventas": ["Coordinador Comercial", "Gestor de Ventas", "Analista de Ventas"],
            "Calidad": ["Coordinador de Calidad", "Gestor de Calidad", "Analista de Calidad"],
            "Operativo": ["Coordinador Operacional", "Gestor de Ingeniería", "Analista de Ingeniería", "Gestor de Compras", "Analista de Compras", "Gestor de Manufactura", "Analista de Manufactura", "Analista de Almacén"],
            "Pruebas": ["Gestor de Pruebas", "Ingeniero de Servicio A", "Ingeniero de Servicio B", "Ingeniero de Servicio C"]
        },

        // Initialize
        init() {
            this.loadUsersData();
        },

        // Load users data from API
        async loadUsersData() {
            this.isLoading = true;
            this.hasError = false;

            if (dataUsuarios) {
                this.usersRows = dataUsuarios;
            } else {
                this.usersRows = [];
                console.error(ERROR_MESSAGE, '011');
            }

            // Initialize table after data is loaded
            this.$nextTick(() => {
                //if (this.usersRows.length > 0) {
                    this.initializeTable();
                //}
            });

            this.isLoading = false;
        },

        // Initialize Tabulator table
        initializeTable() {
            // Destroy existing table if it exists
            if (this.table) {
                this.table.destroy();
                this.table = null;
            }

            this.table = new Tabulator("#users-table", {
                data: this.usersRows,
                layout: "fitColumns",
                paginationSize: 15,
                height: "240px",
                columns: [
                    {
                        title: "Nombre Completo",
                        field: "fullName",
                        minWidth: 125
                    },
                    {
                        title: "Email",
                        field: "email",
                        //headerFilter: "input",
                        width: 240
                    },
                    {
                        title: "Área",
                        field: "area",
                        //headerFilter: "select",
                        headerFilterParams: {
                            values: Object.keys(this.areaToPuestos).reduce((acc, area) => {
                                acc[area] = area;
                                return acc;
                            }, {})
                        },
                        width: 170
                    },
                    {
                        title: "Puesto",
                        field: "puesto",
                        //headerFilter: "input",
                        width: 200
                    },
                    {
                        title: "Privilegio",
                        field: "privilegio",
                        formatter: (cell) => {
                            const privilegio = cell.getValue();
                            const text = this.getPrivilegeText(privilegio);
                            const className = this.getPrivilegeClass(privilegio);
                            return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${className}">${text}</span>`;
                        },
                        //headerFilter: "select",
                        headerFilterParams: {
                            values: {
                                'COLABORADOR': 'Colaborador',
                                'PERSONALRRHH': 'Recursos Humanos',
                                'JEFEINMEDIATO': 'Jefe Inmediato',
                                'DIRECCION': 'Dirección'
                            }
                        },
                        width: 130
                    },
                    {
                    title: "Habilitado",
                    field: "habilitado",
                    formatter: "tickCross",    
                    //editor: "tickCross", // Permite editar con click la casilla
                    hozAlign: "center",
                    width: 130,
                    },
                ]
            });
        },

        // Filter table based on search query
        filterTable() {
            if (this.table) {
                if (this.searchQuery.trim()) {
                    this.table.setFilter([
                        [
                            { field: "nombre", type: "like", value: this.searchQuery },
                            { field: "apellidoP", type: "like", value: this.searchQuery },
                            { field: "apellidoM", type: "like", value: this.searchQuery },
                            { field: "area", type: "like", value: this.searchQuery },
                            { field: "email", type: "like", value: this.searchQuery }
                        ]
                    ]);
                } else {
                    this.table.clearFilter();
                }
            }
        },

        // Privilege display helpers
        getPrivilegeText(privilegio) {
            const privileges = {
                'COLABORADOR': 'Colaborador',
                'PERSONALRRHH': 'Recursos Humanos',
                'JEFEINMEDIATO': 'Jefe Inmediato',
                'DIRECCION': 'Dirección'
            };
            return privileges[privilegio];
        },

        getPrivilegeClass(privilegio) {
            const classes = {
                'JEFEINMEDIATO': 'bg-green-100 text-green-800',
                'PERSONALRRHH': 'bg-blue-100 text-blue-800',
                'DIRECCION': 'bg-red-100 text-red-800'
            };
            return classes[privilegio] || 'bg-yellow-100 text-yellow-800';
        },

        // Show notification
        showNotification(title, message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`;
            notification.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-1">
                        <h4 class="font-bold">${DOMPurify.sanitize(title)}</h4>
                        <p class="text-sm">${DOMPurify.sanitize(message)}</p>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        },

        // Button functionality placeholders (only navigation)
        addUser() {
            this.showNotification('Información', 'Funcionalidad de añadir usuario no implementada.', 'info');
        },

        // Navigation functions
        async restoreUsersView() {
            try {
                window.location.href = `${NGINX_TAG}/usuarios/restoreUsersView`;
            } catch (error) {
                console.log("error catch", error);
                this.showNotification('Error', 'Error al navegar.', 'error');
            }
        },

        async configureTeamView() {
            try {
                window.location.href = `${NGINX_TAG}/usuarios/configureTeamView`;
            } catch (error) {
                console.log("error catch", error);
                this.showNotification('Error', 'Error al navegar.', 'error');
            }
        },

        // Download functions using Tabulator's built-in functionality
        async downloadPDF() {
            try {
                if (this.table) {
                    this.table.download("pdf", "usuarios.pdf", {
                        orientation: "landscape",
                        title: "Lista de Usuarios - SIVOC"
                    });
                    this.showNotification('Éxito', 'PDF descargado correctamente.');
                } else {
                    this.showNotification('Error', 'No hay datos para descargar.', 'error');
                }
            } catch (error) {
                console.log("error catch", error);
                this.showNotification('Error', 'Error al descargar PDF.', 'error');
            }
        },

        async downloadExcel() {
            try {
                if (this.table) {
                    this.table.download("xlsx", "usuarios.xlsx", {
                        sheetName: "Usuarios"
                    });
                    this.showNotification('Éxito', 'Excel descargado correctamente.');
                } else {
                    this.showNotification('Error', 'No hay datos para descargar.', 'error');
                }
            } catch (error) {
                console.log("error catch", error);
                this.showNotification('Error', 'Error al descargar Excel.', 'error');
            }
        }
    };
}