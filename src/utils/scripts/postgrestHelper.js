const jwt = require('jsonwebtoken');

/**
 * Función para hacer fetch por completo a postgREST de manera segura.
 * @async
 * @param {object} requestJSON - Es el objeto con el que se genera la petición.
 * @subparam {string} fetchMethod - Indica el método para el cual se usará el JWT.
 * @subparam {string} fetchUrl - Indica el url que se consultará en postgREST.
 * @subparam {object} fetchBody - Indica el cuerpo de la petición en formato JSON.
 * @returns {object} response - El objeto de la respuesta del fetch.
 */
async function fetchPostgREST(requestJSON) {

    // Genera el Bearer token para autorizar la consulta a postgREST
    const roleMapping = {
        'POST': 'create_only_role',
        'GET': 'read_only_role',
        'UPDATE': 'update_only_role',
        'DELETE': 'delete_only_role',
    };
    const role = roleMapping[requestJSON.fetchMethod];
    const bearerToken = jwt.sign({ role: role, aud: 'postgrest' }, process.env.PGRST_JWT_SECRET,
        { expiresIn: process.env.POSTGREST_TOKEN_EXPIRATION });

    // Ejecuta la petición HTTP según los parámetros recibidos
    const fetchOptions = {
        method: requestJSON.fetchMethod,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bearerToken}`,
        },
    }
    if (requestJSON.fetchMethod !== 'GET') {
        fetchOptions.body = JSON.stringify(requestJSON.fetchBody);
    }
    const response = await fetch(requestJSON.fetchUrl, fetchOptions);
    return response;
}

module.exports = { fetchPostgREST };