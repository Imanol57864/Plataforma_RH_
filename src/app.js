/* Utilizando Node.js v20.13.1 */
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
app.disable('x-powered-by'); // <-- "security through obscurity" 

require('dotenv').config({ path: '../.env' }); // <- TO WORK (delete manually inside the server)
// app.set("trust proxy", 1); // <- TO WORK (delete on develop, keep on production)

// Utilidades
const { sessionManager } = require('./utils/middlewares/sessionManager');
const nginxRouter = express(); // <- router app for nginx

// Performance
const compression = require('compression')
app.use(compression())

/**
 * Configura los middlewares globales de la aplicación
 * @function
 * @returns {void}
 */
function setupMiddlewares() {
    app.use(express.json({ limit: '100kb' }));
    app.use(cookieParser());
    app.use(sessionManager);
    app.use('/', require('./routes/global.routes'));
};


/**
 * Configura todas las rutas para que el caché esté completamente desactivado
 * @function
 * @returns {void}
 */
function setupNoCaching() {
    app.use(`${process.env.NGINX_TAG}${process.env.URL_TAG}`, (req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        next();
    });
}

/**
 * Configura los archivos estáticos incluyendo el motor de vistas
 * @function
 * @returns {void}
 */
function setupStaticFilesAndViews() {
    app.use(express.static(path.join(__dirname, 'public')
        // ,{maxAge: '4h', etag: true }
    ));
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');
}

/**
 * Inicia el servidor en el puerto especificado
 * @function
 * @returns {void}
 */
function startServer() {
    nginxRouter.use(`${process.env.NGINX_TAG}`, app);
    nginxRouter.listen(3000, '0.0.0.0', () => {
        console.log(`[Server ✅]: Servidor corriendo en https://localhost:3000${process.env.NGINX_TAG}`);
    });
}

/**
 * Inicializa la aplicación y atrapa los errores de ejecución.
 * @async
 * @returns {Promise<void>}
 */
async function initializeApp() {
    setupMiddlewares();
    setupStaticFilesAndViews();
    setupNoCaching();
    startServer();
}
initializeApp().catch(error => {
    console.log(process.env.ERROR_MESSAGE, "001");
    console.log(error);
    process.exit(1);
});