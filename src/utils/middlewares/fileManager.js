const path = require('path');
const fs = require('fs');

const getFile = async (req, res, next) => {
    const entidad_nombre = res.locals.entidad_nombre || '';
    const nombre_original = res.locals.nombre_original || '';
    const nombre_almacenado = res.locals.nombre_almacenado || '';
    const isDownload = res.locals.isDownload || '';
    const filePath = path.join(__dirname, '..', '..', 'uploads', entidad_nombre, nombre_almacenado);
    if (fs.existsSync(filePath)) {
        if (isDownload) {
            return res.download(filePath, nombre_original);
        }
        return res.sendFile(filePath);
    } else {
        return res.status(404).send('Archivo no encontrado');
    }
};

module.exports = { getFile };