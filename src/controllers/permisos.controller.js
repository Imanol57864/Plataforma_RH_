const IAM = require('../utils/IAM.json');
const { fetchPostgREST } = require('../utils/scripts/postgrestHelper');
const JWT = require('jsonwebtoken');

/**
 * Constantes para la configuración del módulo de usuarios.
 */
const TABLE_SECRETS = process.env.TABLE_SECRETS;
const ERROR_MESSAGE = process.env.ERROR_MESSAGE;
const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Controla el acceso y la carga de la vista del tablero de permisos
 * Todos los usuarios tienen acceso a este tablero, solo que con diferencias de los datos
 * @async req res next
 * @returns {Promise<Object>}
 */
async function verTableroPermisos(req, res) {

    // Consulta y valida los permisos de la petición
    const userRole = res.locals.privilegio;
    const privilegiosActuales = IAM.verTableroPermisos?.[userRole];
    if (!privilegiosActuales) {
        return res.status(401).send('No tienes permisos para acceder a este recurso.');
    }

    // Load in sequence: cargarTodosLosPermisos, cargarPermisosEquipo, cargarTusPermisos
    let tables = {};
    const userId = res.locals.userId;

    if (privilegiosActuales.cargarTodosLosPermisos) {
        const query = `/permiso?select=*,gestion_permiso(id_permiso,id_equipo,descripcion,estado,solicitado,revisado),usuario(dato_personal(nombre,apellido_p,apellido_m))&id_u_solicitante=neq.${userId}`;
        const fetchResponse = await fetchDataForTable(query);
        if (!fetchResponse.success) return res.status(500).send(ERROR_MESSAGE + '007.1');
        tables.cargarTodosLosPermisos = fetchResponse.dataJson;
        res.locals.cargarTodosLosPermisos = true;
    } else { res.locals.cargarTodosLosPermisos = false; }

    if (privilegiosActuales.cargarPermisosEquipo) {
        // Fetch the current user's team_id
        const pgRestRequest = {
            fetchMethod: 'GET',
            fetchUrl: `${BACKEND_URL}/usuario?select=dato_laboral(id_equipo)&id=eq.${userId}`,
            fetchBody: {}
        }
        const response = await fetchPostgREST(pgRestRequest);
        if (!response.ok) return res.status(500).send(ERROR_MESSAGE + '007.2A');
        const data = await response.json();
        const equipoId = data[0].dato_laboral.id_equipo;

        // Proceed with the origina query
        const query = `/permiso?select=*,usuario(dato_personal(nombre,apellido_p,apellido_m)),gestion_permiso!inner(id_permiso,id_equipo,descripcion,estado,solicitado,revisado)&gestion_permiso.id_equipo=eq.${equipoId}&id_u_solicitante=neq.${userId}`;
        const fetchResponse = await fetchDataForTable(query);
        if (!fetchResponse.success) return res.status(500).send(ERROR_MESSAGE + '007.2B');
        tables.cargarPermisosEquipo = fetchResponse.dataJson;
        res.locals.cargarPermisosEquipo = true;
    } else { res.locals.cargarPermisosEquipo = false; }

    if (privilegiosActuales.cargarTusPermisos) {
        const query = `/permiso?select=*,gestion_permiso(id_permiso,id_equipo,descripcion,estado,solicitado,revisado),usuario(dato_personal(nombre,apellido_p,apellido_m))&id_u_solicitante=eq.${userId}`;
        const fetchResponse = await fetchDataForTable(query);
        if (!fetchResponse.success) return res.status(500).send(ERROR_MESSAGE + '007.2C');
        tables.cargarTusPermisos = fetchResponse.dataJson;
        res.locals.cargarTusPermisos = true;
    } else { res.locals.cargarTusPermisos = false; }

    const dataJson = tables;
    return res.render('../views/permisos/tableroPermisos.ejs', { dataJson });
};

/**
 * Ejecuta la query de PostgREST y regresa la data en formato JSON
 * @async {query} - String que se agrega a la url para ejecutar una petición en PostgREST
 * @returns {Promise<Object>} dataJson - El json listo para mostrarse en una tabla
 */
async function fetchDataForTable(query) {
    const pgRestRequest = {
        fetchMethod: 'GET',
        fetchUrl: `${BACKEND_URL}${query}`,
        fetchBody: {}
    }
    const response = await fetchPostgREST(pgRestRequest);
    if (!response.ok) return { success: false, data: '' };
    const data = await response.json();
    const dataJson = data.map(u => ({
        id: JWT.sign({ id: String(u.id) }, TABLE_SECRETS, { expiresIn: '15m' }),
        solicitante_fullName:
            `${u.usuario?.dato_personal?.nombre || "Sin nombre"} ` +
            `${u.usuario?.dato_personal?.apellido_p || "Sin apellido"} ` +
            `${u.usuario?.dato_personal?.apellido_m || "Sin apellido"}`,
        tipo: u.tipo,
        descripcion: `${u.gestion_permiso?.descripcion || "-"} `,
        fecha_inicio: u.fecha_inicio,
        fecha_termino: u.fecha_termino,
        solicitado: u.gestion_permiso?.solicitado,
        revisado: u.gestion_permiso?.revisado,
        estado: `${u.gestion_permiso?.estado}`,
    }));
    return { success: true, dataJson: dataJson };
}

/**
 * Controla la petición del frontend para generar un nuevo permiso vacio según el id del usuario loggeado
 * Todos los usuarios tienen acceso a este tablero, solo que con diferencias de los datos
 * @async req res next
 * @returns {Promise<Object>}
 */
async function crearSolicitudPermiso(req, res) {

    // Create an empty permit for the current logged user
    // This works because PostgreSQL has a trigger to create a "gestion_permiso" after creating a new permiso
    const userId = res.locals.userId;
    const pgrestRequest_1 = {
        fetchMethod: 'POST',
        fetchUrl: `${BACKEND_URL}/permiso`,
        fetchBody: { id_u_solicitante: userId }
    };
    const permisoRes = await fetchPostgREST(pgrestRequest_1);
    if (!permisoRes.ok) return { ok: false };

    // exit
    return { ok: true };
}

module.exports = { verTableroPermisos, crearSolicitudPermiso };