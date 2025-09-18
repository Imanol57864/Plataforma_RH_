const viewableTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

function openDescripcionModal(text) {
    // First, inserta los botones y activa el modal haciendolo visible
    const modal = document.getElementById("descripcionModal");
    const content = document.getElementById("descripcionModalContent");
    content.textContent = text;
    modal.classList.remove("hidden");

    // Second, crea la instancia de Pond para poder gestionar los archivos
    FilePond.registerPlugin(
        FilePondPluginImagePreview,
        FilePondPluginFileValidateSize,
        FilePondPluginFileValidateType
    );

    const pond = FilePond.create(document.querySelector('.filepond'), {
        allowMultiple: true,
        maxFiles: 3,
        allowFileTypeValidation: true,
        acceptedFileTypes: ['image/*', ...viewableTypes],
        allowFileSizeValidation: true,
        maxFileSize: '10MB',
        minFileSize: '1KB',

        // Callbacks para agregar eventos cuando los archivos se procesan
        onaddfile: (error, file) => {
            if (!error) {
                setTimeout(addClickEvents, 100);
            }
        },

        onprocessfile: (error, file) => {
            if (!error) {
                setTimeout(addClickEvents, 100);
            }
        },

        server: {
            process: {
                url: '/api/upload',
                method: 'POST',
                onload: (response) => {
                    const file = JSON.parse(response);
                    return file.id;
                }
            },
            revert: (uniqueFileId, load, error) => {
                fetch(`/api/upload/${uniqueFileId}`, { method: 'DELETE' })
                    .then(() => load())
                    .catch(() => error('Error deleting file'));
            },
            remove: (uniqueFileId, load, error) => {
                fetch(`/api/upload/${uniqueFileId}`, { method: 'DELETE' })
                    .then(() => load())
                    .catch(() => error('Error deleting file'));
            },
            load: async (uniqueFileId, load, error) => {
                try {
                    const res = await fetch(`/uploads/${uniqueFileId}`);
                    if (!res.ok) throw new Error('File not found');
                    const blob = await res.blob();
                    const file = new File([blob], uniqueFileId, { type: blob.type });
                    load(file);
                } catch (err) {
                    error('Error loading file');
                }
            }
        },
    });

    // TO WORK, 3rdly
    // Esta sería como la función que cumple el controller de permisos, obtiene la METADATA de los archivos
    // SI! porque funciona con solo JSON (file data)
    // as que dataJson tenga un campo dataJson.fileData donde venga la metada lista para filePond
    fetch("/api/files")
        .then(res => res.json())
        .then(files => {
            files.forEach(fileData => {
                pond.addFile(fileData.id, { type: 'local' }).then(file => {
                    file.serverId = fileData.id;
                    setTimeout(addClickEvents, 200);
                });
            });
        })
        .catch(err => console.error('Error loading existing files:', err));


    // Last, añade los los "onclick=()" después de que la FilePond actual haya sido cargada exitosamente
    setTimeout(() => {
        const pondWrapper = document.querySelector('.filepond');

        const observer = new MutationObserver(() => {
            addClickEvents();
        });

        observer.observe(pondWrapper, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // Llamada inicial
        addClickEvents();
    }, 100);
}

// TO WORK (Not just hide it, destroy the Pond instance so the user can juggle between REVISOR & SOLICITANTE)
function closeDescripcionModal() {
    document.getElementById("descripcionModal").classList.add("hidden");
}

/* Function (DEPRECADA) - Obtiene los IDs según el titulo del file-wrapper */ // TO WORK
/* Returns - El nombre que encuentre en el DOM del archivo que clikeó */
// No se debe usar esta función, lo ideal es que es obtuviera el nombre desde el controller y este fuese accedido dinámicamente
function llamarEndpoint(fileName) { // Si, mira, llamarEndpoint 'view'
    window.open(`/api/view/${encodeURIComponent(fileName)}`, '_blank');
}
// Por favor, utiliza el middleware 'getFile' y adapta esta y la función 'addClickEvents' para funcionar más limpiamente
// Por favor, utiliza el middleware 'getFile' y adapta esta y la función 'addClickEvents' para funcionar más limpiamente
// Por favor, utiliza el middleware 'getFile' y adapta esta y la función 'addClickEvents' para funcionar más limpiamente
function getFileNameFromElement(fileElement) {
    // Intenta diferentes selectores según la estructura DOM
    let fileName = '';

    // Para archivos con preview de imagen
    const legend = fileElement.querySelector('legend');
    if (legend) {
        fileName = legend.textContent.trim();
    }

    // Para archivos sin preview - busca en el nombre del archivo
    if (!fileName) {
        const fileInfo = fileElement.querySelector('.filepond--file-info-main');
        if (fileInfo) {
            fileName = fileInfo.textContent.trim();
        }
    }

    // Fallback - busca en cualquier elemento que contenga el nombre
    if (!fileName) {
        const fileStatus = fileElement.querySelector('.filepond--file-status-main');
        if (fileStatus && fileStatus.textContent.includes('.')) {
            fileName = fileStatus.textContent.trim();
        }
    }

    // Último fallback - busca en los datos del archivo
    if (!fileName && fileElement._file) {
        fileName = fileElement._file.filename || fileElement._file.file.name;
    }

    return fileName;
}
/* Void Function - Agrega los eventos onClick para poder visualizar los archivos al darles clic */
/* Returns - Void (Agrega los eventos onClick) */
function addClickEvents() {
    // Busca todos los elementos de archivo, tanto con wrapper como sin él
    const fileElements = document.querySelectorAll('.filepond--file');

    fileElements.forEach(fileElement => {
        if (!fileElement.dataset.clickAdded) {
            const fileName = getFileNameFromElement(fileElement);

            if (fileName) {
                fileElement.addEventListener('click', (e) => {
                    // Evita que el click interfiera con los botones de acción
                    if (e.target.closest('.filepond--file-action-button')) {
                        return;
                    }

                    llamarEndpoint(fileName);
                });

                fileElement.dataset.clickAdded = 'true';
                console.log('Click event añadido para:', fileName);
            }
        }
    });
}

/* Void Function - Sirve para abrir un PopUp que indica al usuario que se está creando un nuevo permiso */
async function openPermisoNotification() {
    const modal = document.getElementById("crearPermisoModal");
    modal.classList.remove("hidden");
    await new Promise(resolve => setTimeout(resolve, 5000));
    location.href = location.href;
}