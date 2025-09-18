const jwt = require('jsonwebtoken');
const { fetchPostgREST } = require('../scripts/postgrestHelper');
const NGINX_TAG = process.env.NGINX_TAG;
const URL_TAG = process.env.URL_TAG;
const ERROR_MESSAGE = process.env.ERROR_MESSAGE;
const ROOT_USERNAME = process.env.ROOT_USERNAME;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION;
const AT_COOKIE_NAME = process.env.AT_COOKIE_NAME;
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION;
const RT_COOKIE_NAME = process.env.RT_COOKIE_NAME;
const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Middleware global para gestionar las sesiones
 * @params req res next
 * @returns next();
 * @throws {error} Elige entre JWT inválido o sesión erronea.
 */
const sessionManager = async (req, res, next) => {
    // Global variables
    res.locals.NGINX_TAG = NGINX_TAG;
    res.locals.URL_TAG = URL_TAG;
    res.locals.ERROR_MESSAGE = ERROR_MESSAGE;
    res.locals.reqUrl = req.url;

    // Rutas de utilidades: el sistema accede a estas rutas para obtener recursos
    // No hay necesidad de agregar NGINX_TAG porque las rutas siguen siendo internas
    if (!req.url.startsWith(URL_TAG))
        return next();

    // Si no es una ruta publica, remueve la etiqueta y lee el modulo de origen y la actividad
    const reqUrl = req.url.substring(URL_TAG.length);

    // Rutas públicas: el usuario tiene permitido acceder sin importar su autenticación
    if ((["/login", "/login/postAuth", "/logout"].includes(reqUrl)))
        return next();

    // Obten las variables de la petición sin importar el estado de su sesión
    let payload = jwt.decode(req.cookies[AT_COOKIE_NAME]);

    // Verifica la autenticidad del *accessToken
    try {
        const accessToken = req.cookies[AT_COOKIE_NAME];
        jwt.verify(accessToken, ACCESS_TOKEN_SECRET); // case1&2 -> accessToken Working
    } catch (error) {
        // En caso de que el token no sea auténtico...
        // Consulta en la base de datos si el *refreshToken es auténtico
        const refreshToken = req.cookies[RT_COOKIE_NAME];
        const rationaleResponse = await rationaleRefreshToken(refreshToken);
        if (!rationaleResponse.success) return res.status(205).send(rationaleResponse.message);

        // Detén la petición por completo en caso que el *refreshToken sea inválido (case 3)
        if (!rationaleResponse.token) { // case3 -> both tokens are invalid
            return res.status(401).send(`
            <html>
                <head>
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="15;url=${NGINX_TAG}${URL_TAG}/login" />
                <title>Sesión Caducada</title>
                </head>
                <body>
                <p>Tu sesión ha caducado. Serás redirigido a la página de inicio de sesión en 15 segundos...</p>
                <p>Podrías guardar tu sesión si das clic en 'Recordarme' dentro de la página de LogIn. :)</p>
                </body>
            </html>
            `);
        }

        // O en otro caso, renueva el *accessToken en caso que su token de sesión sea válido
        const userDataRefactor = {
            privilegio: payload.privilegio || 'mockPrivilegio',
            pfp_almacenado: payload.pfp_almacenado || 'mockPfp_almacenado',
            email: payload.email || 'mockEmail',
            dato_personal: { nombre: payload.nameDisplay || 'mockName'},
            id: payload.userId || 'mockId'
        };
        const isRootUser = false;
        const doRefreshToken = false;
        const setupATresponse = setupTokenCookie(res, userDataRefactor, isRootUser, doRefreshToken);
        if (!setupATresponse.success) return res.status(205).send(setupATresponse.message);
        // case4 -> reload *accessToken
    }

    // Configura las variables de la petición antes de continuar
    res.locals.nameDisplay = payload.nameDisplay;
    res.locals.userId = payload.userId;
    res.locals.email = payload.email;
    res.locals.privilegio = payload.privilegio;
    res.locals.pfp_almacenado = payload.pfp_almacenado;

    // exit
    return next();
};

/**
 * Determina si existe un token no ha expirado en la DB relacionado con el usuario
 * @param {string} refreshToken - El token que se consultará.
 * @returns {bool} false - Indica que se debe ejecutar /logout
 * @returns {bool} true - Indica que se debe ejecutar /logout
 * @throws {Error} 
 */
async function rationaleRefreshToken(refreshToken) {

    // Ejecuta el fetch SELECT user_id FROM sesion_activa WHERE token = ${refreshToken};
    const pgRestRequest = {
        fetchMethod: 'GET',
        fetchUrl: `${BACKEND_URL}/sesion_activa?select=user_id&token=eq.${refreshToken}`,
        fetchBody: {}
    }

    // Captura el error al consultar la base de datos
    const response = await fetchPostgREST(pgRestRequest);
    if (!response.ok) {
        return {
            success: false,
            message: ERROR_MESSAGE + '002',
            token: false
        };
    }

    // Debido a que el *refreshToken no es válido, regresa false
    const tokenDbData = await response.json();
    if (!tokenDbData || tokenDbData.length === 0 || tokenDbData.expiresAt < Date.now()) {
        return {
            success: true,
            message: '',
            token: false
        };
    }

    // En caso contrario, regresa true indicando que se deberá generar un *accessToken
    return {
        success: true,
        message: '',
        token: true
    };
};


/**
 * Determina si existe una sesión activa (refreshToken) para un user ID
 * @param {int} userId - El id que se consultará.
 * @returns {object} - success:true + hasLongSession:true = sesión activa y no requiere de sesión token
 * @throws {Error} 
 */
async function findActiveSession(userId) {

    // Ejecuta el fetch SELECT * FROM sesion_activa WHERE user_id = ${userId};
    const pgRestRequest = {
        fetchMethod: 'GET',
        fetchUrl: `${BACKEND_URL}/sesion_activa?user_id=eq.${userId}`,
        fetchBody: {}
    }

    // Captura el error al consultar la base de datos
    const response = await fetchPostgREST(pgRestRequest);
    if (!response.ok) {
        return {
            success: false,
            message: ERROR_MESSAGE + '008',
            hasLongSession: false
        };
    }

    // Debido a que no existe una sesión activa envia false
    const tokenDbData = await response.json();
    if (!tokenDbData || tokenDbData.length === 0) {
        return {
            success: true,
            message: '',
            hasLongSession: false
        };
    }

    // En caso contrario, regresa true indicando que se deberá generar un *accessToken
    return {
        success: true,
        message: '',
        hasLongSession: true
    };
};

/**
 * Función para CREAR una sola cookie (y/o token) de la sesión recién verificada 
 * @async
 * @param {object} res - Objeto de respuesta de Express.
 * @param {object} userData - El JSON del usuario con la información de la DB
 * @param {bool} isRootUser - Indica si el accessToken es para el usuario raíz
 * @param {bool} doRefreshToken - Indica si se requiere de un refresh token
 * @returns {bool} - Boolean que indica true si la operación fue exitosa
 */
async function setupTokenCookie(res, userData, isRootUser, doRefreshToken) {

    // Elige el payload correcto según si el usuario es el RootUser o un usuario común
    let userPayload = {};
    if (isRootUser) {
        userPayload = { nameDisplay: 'Usuario Raíz', userId: '000', email: ROOT_USERNAME, privilegio: 'DIRECCION' };
    } else {
        let name = `${userData.dato_personal?.nombre || 'Sin nombre'} ${userData.dato_personal?.apellido_p || ''} ${userData.dato_personal?.apellido_m || ''}`;
        const roles = {
            'COLABORADOR': 'Colaborador',
            'PERSONALRRHH': 'Recursos Humanos',
            'JEFEINMEDIATO': 'Jefe Inmediato',
            'DIRECCION': 'Dirección'
        };
        userPayload = { nameDisplay: name, userId: userData.id, 
            email: userData.email, privilegio: userData.privilegio, 
            pfp_almacenado: userData.pfp_almacenado};
    }

    // Elige si la cookie será para un *refreshToken o un *accessToken (newToken, maxAge, cookieName)
    const newToken = doRefreshToken //newToken
        ? require('crypto').randomBytes(64).toString('hex') // Utiliza hexadecimal para refresh
        : jwt.sign(userPayload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
    const maxAge = doRefreshToken //maxAge
        ? parseFloat(REFRESH_TOKEN_EXPIRATION.slice(0, -1)) * 24 * 60 * 60 * 1000
        : parseFloat(ACCESS_TOKEN_EXPIRATION.slice(0, -1)) * 24 * 60 * 60 * 1000;
    const cookieName = doRefreshToken //cookieName
        ? RT_COOKIE_NAME
        : AT_COOKIE_NAME;

    // Envia al navegador la cookie
    res.cookie(cookieName, newToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: maxAge,
    });

    // Si el token es *refreshToken entonces también añadelo a la base de datos (sesion_activa)
    if (doRefreshToken) {

        // Ejecuta el fetch SELECT user_id FROM sesion_activa WHERE token = ${refreshToken};
        const expires_at = new Date(Date.now() + maxAge);
        const pgRestRequest = {
            fetchMethod: 'POST',
            fetchUrl: `${BACKEND_URL}/sesion_activa`,
            fetchBody: {
                user_id: userData.id,
                token: newToken,
                expires_at: expires_at
            }
        }

        // Captura el error al consultar la base de datos
        const response = await fetchPostgREST(pgRestRequest);
        if (!response.ok) {
            return {
                success: false,
                message: ERROR_MESSAGE + '004',
            };
        }
    }

    // exit
    return {
        success: true,
        message: ''
    }
};

module.exports = { sessionManager, findActiveSession, setupTokenCookie };