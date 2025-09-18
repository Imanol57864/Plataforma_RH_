/* --- Import routes.js logic --- */
const express = require('express');
const router = express.Router();
const { postAuthentication, doLogout } = require("../controllers/login.controller");
const { generalLimiter } = require("../utils/middlewares/rateLimiter");
const { getFile } = require("../utils/middlewares/fileManager");

const NGINX_TAG = process.env.NGINX_TAG;
const URL_TAG = process.env.URL_TAG;

// Rutas por defecto (los redirects ocupan ${NGINX_TAG} )
router.get('/', (req, res) => { res.redirect(`${NGINX_TAG}${URL_TAG}/login`) });
router.get(`${URL_TAG}/inicio`, (req, res) => { res.locals.sidebarPageTitle = 'Inicio'; res.render('inicio.ejs'); });
router.get(`${URL_TAG}/getPfp`, (req, res, next) => {
    res.locals.entidad_nombre = 'foto_perfil';
    res.locals.nombre_almacenado = res.locals.pfp_almacenado || '';
    res.locals.isDownload = false;
    next();
}, getFile);

// Rutas relacionadas con el Login
router.get(`${URL_TAG}/login`, (req, res) => { res.render('login.ejs'); });
router.post(`${URL_TAG}/login/postAuth`, generalLimiter, postAuthentication);
router.get(`${URL_TAG}/logout`, doLogout);

// Rutas hacia los módulos
router.use(`${URL_TAG}/usuarios`, generalLimiter, (req, res, next) => { res.locals.sidebarPageTitle = 'Usuarios'; next(); }, require('./usuarios.routes'));
router.use(`${URL_TAG}/permisos`, generalLimiter, (req, res, next) => { res.locals.sidebarPageTitle = 'Permisos'; next(); }, require('./permisos.routes'));
//router.use('/vacaciones', require('./vacaciones.routes'));
//router.use('/cursos', require('./cursos.routes'));

// Rutas relacionadas con FilePond
const FILEPOND_TAG = "/filepond";
router.use(`${URL_TAG}${FILEPOND_TAG}`, generalLimiter, require('./filepond.routes'));

module.exports = router;