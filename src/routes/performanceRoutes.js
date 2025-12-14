const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');

// Guardar métricas de rendimiento
router.post('/metrics', performanceController.saveMetrics);

// Obtener métricas por usuario
router.get('/metrics/user/:userId', performanceController.getMetricsByUser);

// Obtener métricas por sala
router.get('/metrics/room/:roomId', performanceController.getMetricsByRoom);

// Obtener estadísticas promedio por usuario
router.get('/stats/user/:userId', performanceController.getAverageMetricsByUser);

// Obtener estadísticas promedio por sala
router.get('/stats/room/:roomId', performanceController.getAverageMetricsByRoom);

module.exports = router;
