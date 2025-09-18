/* --- Import routes.js logic --- */
const express = require('express');
const router = express.Router();
const controller = require("../controllers/usuarios.controller");

// Rutas del módulo de usuarios
router.get('/verTableroActivados', controller.verTableroActivados);

module.exports = router;