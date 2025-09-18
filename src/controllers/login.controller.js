const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { fetchPostgREST } = require('../utils/scripts/postgrestHelper');
const { setupTokenCookie, findActiveSession } = require('../utils/middlewares/sessionManager');
/**
 * Constantes para la configuración del módulo de autenticación.
 */
const ERROR_MESSAGE = process.env.ERROR_MESSAGE;
const ROOT_USERNAME = process.env.ROOT_USERNAME;
const ROOT_PASSWORD = process.env.ROOT_PASSWORD;
const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Controla la creación de una sesión a través del LogIn en "public/login.js"
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<Object>} Respuesta JSON con el resultado de la autenticación.
 * @returns false = Se mostrará al usuario el campo Promise<Object>.message
 * @returns true = Se redirecionará el usuario a "/inicio"
 */
async function postAuthentication(req, res) {
    try {
        const { email, password, remember } = req.body;
        const doRefreshToken = true;

        // 1. isRootValid: Si el usuario ingresa como usuario raíz, otorga un solo *accessToken 
        const isRootValid = email === ROOT_USERNAME && await bcrypt.compare(password, ROOT_PASSWORD);
        if (isRootValid) {
            const tokenResponse = await setupTokenCookie(res, null, isRootValid, !doRefreshToken);
            if (!tokenResponse.success) return res.status(200).json({ success: true, message: tokenResponse.message });
            return res.status(200).json({ success: true });
        }

        // 2. isUserValid: Si el usuario ingresa un usuario incorrecto, indicalo
        const userValid = await isUserValid(email, password);
        if (!userValid.success) return res.status(200).json({ success: false, message: userValid.message });

        // 3. setupTokenCookie: Crea los tokens y las cookies de la sesión recién verificada
        const AT_response = await setupTokenCookie(res, userValid.data, isRootValid, !doRefreshToken);
        if (!AT_response.success) return res.status(200).json({ success: false, message: AT_response.message });

        if (remember) { // Crea una sesión larga solo si el usuario pide que lo recuerden y si no tiene una sesión activa
            const userSession = await findActiveSession(userValid.data.id);
            if (!userSession.hasLongSession) {
                const RF_response = await setupTokenCookie(res, userValid.data, isRootValid, doRefreshToken);
                if (!RF_response.success) return res.status(200).json({ success: false, message: RF_response.message });
            }
        }

        // exit
        return res.status(200).json({ success: true, message: '' });

    } catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: (ERROR_MESSAGE + '003'),
        });
    }
};

/**
 * Función para verficiar si un usuario es válido para crear una sesión
 * @async
 * @param {string} email - Email del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<Object>} - Objeto JSON indicando success si es válido
 */
async function isUserValid(email, password) {
    // Ejecuta el fetch de la información del usuario
    const pgRestRequest = {
        fetchMethod: 'GET',
        fetchUrl: `${BACKEND_URL}/usuario?select=id,dato_personal(nombre,apellido_p,apellido_m),privilegio,password,habilitado,pfp_almacenado,email&email=eq.${email}`,
        fetchBody: {}
    }
    
    // Captura el error al consultar la base de datos
    const response = await fetchPostgREST(pgRestRequest);
    if (!response.ok) {
        return {
            success: false,
            message: process.env.ERROR_MESSAGE + '006'
        };
    }

    const userDbData = await response.json();

    // Determina si el usuario existe, si está activo, y si tiene credenciales correctas
    if (userDbData.length === 0) {
        return {
            success: false,
            message: 'El usuario no fue encontrado.'
        }
    }
    const userJson = userDbData[0]; // Consigue el objeto del usuario
    if (!userJson.habilitado) {
        return {
            success: false,
            message: 'El usuario no se encuentra habilitado para iniciar sesión.'
        }
    }
    const isPasswordValid = await bcrypt.compare(password, userJson.password);
    if (!isPasswordValid) {
        return {
            success: false,
            message: 'La contraseña es incorrecta.'
        }
    }

    // Si la información ingresada es válida, otorga la información para generar tokens
    return {
        success: true,
        message: '',
        data: userJson
    };
};

/**
 * Remueve las cookies y también remueve la sesión de la base de datos
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<Object>} Respuesta JSON.
 */

async function doLogout(req, res) {
    // Ejecuta el fetch para borrar la sesión del usuario
    const user_id = res.locals.userId;
    const pgRestRequest = {
        fetchMethod: 'DELETE',
        fetchUrl: `${BACKEND_URL}/sesion_activa`,
        fetchBody: { user_id: user_id }
    }

    // Captura el error al consultar la base de datos
    const response = await fetchPostgREST(pgRestRequest);
    if (!response.ok) {
        return {
            success: false,
            message: process.env.ERROR_MESSAGE + '005'
        };
    }

    // Finaliza la petición borrando las cookies y redirige al usuario a '/login'
    res.clearCookie(process.env.AT_COOKIE_NAME);
    res.clearCookie(process.env.RT_COOKIE_NAME);
    return res.redirect(`${process.env.NGINX_TAG}${process.env.URL_TAG}/login`);
}

module.exports = { postAuthentication, doLogout };