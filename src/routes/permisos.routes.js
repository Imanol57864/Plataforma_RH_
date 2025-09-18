/* --- Import routes.js logic --- */
const express = require('express');
const router = express.Router();
const controller = require("../controllers/permisos.controller");
const { crearSolicitudPermiso_Limiter } = require("../utils/middlewares/rateLimiter");


// Rutas del módulo de usuarios
router.get('/verTableroPermisos', controller.verTableroPermisos);

router.get('/crearSolicitudPermiso', crearSolicitudPermiso_Limiter, controller.crearSolicitudPermiso);

module.exports = router;