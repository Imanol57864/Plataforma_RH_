const IAM = require('../utils/IAM.json');
const { fetchPostgREST } = require('../utils/scripts/postgrestHelper');

/**
 * Constantes para la configuración del módulo de usuarios.
 */
const ERROR_MESSAGE = process.env.ERROR_MESSAGE;
const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Controla el acceso y la carga de la vista del tablero de los usuarios
 * Tambien tiene acceso a edición directamente sobre la tabla, activación y desactivacion shinshon
 * @async req res next
 * @returns {Promise<Object>}
 */
async function verTableroActivados(req, res) {
    // Consulta los permisos de la petición

    const userRole = res.locals.privilegio;
    const privilegiosActuales = IAM.verTableroActivados?.[userRole];
    if (!privilegiosActuales) {
        return res.status(401).send('No tienes permisos para acceder a este recurso.');
    }

    // Ejecuta el fetch de la información de los usuarios
    const pgRestRequest = {
        fetchMethod: 'GET',
        fetchUrl: `${BACKEND_URL}/usuario?select=id,email,habilitado,privilegio,dato_personal(nombre,apellido_p,apellido_m),dato_laboral(fecha_ingreso,area,puesto)`,
        fetchBody: {}
    }

    // Captura el error al consultar la base de datos
    const response = await fetchPostgREST(pgRestRequest);
    if (!response.ok) {
        return res.status(500).send(ERROR_MESSAGE + '007');
    }

    const data = await response.json();

    // Transformar datos
    const dataUsuarios = data.map(u => ({
        //id: String(u.id),
        fullName:
            `${u.dato_personal?.nombre || "Sin nombre"} ` +
            `${u.dato_personal?.apellido_p || "Sin apellido"} ` +
            `${u.dato_personal?.apellido_m || "Sin apellido"}`, 
        email: u.email,
        fechaIngreso: u.dato_laboral?.fecha_ingreso || "Sin fecha",
        area: u.dato_laboral?.area || "Sin área",
        puesto: u.dato_laboral?.puesto || "Sin puesto",
        privilegio: u.privilegio,
        habilitado: u.habilitado
    }));

    return res.render('../views/usuarios/tableroUsuariosActivados.ejs', { dataUsuarios });
};

module.exports = { verTableroActivados };