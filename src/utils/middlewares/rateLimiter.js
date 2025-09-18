// Rate Limiting
const rateLimit = require('express-rate-limit');
const generalLimiter = rateLimit({
    windowMs: 30 * 1000, // 1 minuto
    max: 18,
    handler: (req, res, next) => {
        return res.status(429).json({
            success: false,
            message: 'Se excedió el número de intentos máximos, intenta nuevamente en unos segundos.',
        });
    }
});

const crearSolicitudPermiso_Limiter = rateLimit({
    windowMs: 30 * 1000, // 1 minuto
    max: 3,
    handler: (req, res, next) => {
        return res.status(429).json({
            success: false,
            message: 'Se excedió el número de intentos máximos, intenta nuevamente en unos segundos.',
        });
    }
});

module.exports = { generalLimiter, crearSolicitudPermiso_Limiter };