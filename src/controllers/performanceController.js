const performanceModel = require('../models/performanceModel');

class PerformanceController {
    // Guardar métricas de rendimiento
    async saveMetrics(req, res) {
        try {
            const metricsData = req.body;
            
            // Validar datos requeridos
            if (!metricsData.userId || !metricsData.latencia || !metricsData.precision) {
                return res.status(400).json({ 
                    error: 'Faltan datos requeridos: userId, latencia y precision son obligatorios' 
                });
            }

            const result = await performanceModel.savePerformanceMetrics(metricsData);
            
            res.status(201).json({
                message: 'Métricas guardadas exitosamente',
                data: result
            });
        } catch (error) {
            console.error('Error al guardar métricas:', error);
            res.status(500).json({ 
                error: 'Error al guardar métricas',
                details: error.message 
            });
        }
    }

    // Obtener métricas por usuario
    async getMetricsByUser(req, res) {
        try {
            const { userId } = req.params;
            const { limit } = req.query;
            
            const metrics = await performanceModel.getMetricsByUser(userId, limit ? parseInt(limit) : 100);
            
            res.json({
                message: 'Métricas obtenidas exitosamente',
                count: metrics.length,
                data: metrics
            });
        } catch (error) {
            console.error('Error al obtener métricas por usuario:', error);
            res.status(500).json({ 
                error: 'Error al obtener métricas',
                details: error.message 
            });
        }
    }

    // Obtener métricas por sala
    async getMetricsByRoom(req, res) {
        try {
            const { roomId } = req.params;
            const { limit } = req.query;
            
            const metrics = await performanceModel.getMetricsByRoom(roomId, limit ? parseInt(limit) : 100);
            
            res.json({
                message: 'Métricas obtenidas exitosamente',
                count: metrics.length,
                data: metrics
            });
        } catch (error) {
            console.error('Error al obtener métricas por sala:', error);
            res.status(500).json({ 
                error: 'Error al obtener métricas',
                details: error.message 
            });
        }
    }

    // Obtener estadísticas promedio por usuario
    async getAverageMetricsByUser(req, res) {
        try {
            const { userId } = req.params;
            
            const stats = await performanceModel.getAverageMetricsByUser(userId);
            
            if (!stats) {
                return res.status(404).json({ 
                    message: 'No se encontraron métricas para este usuario' 
                });
            }
            
            res.json({
                message: 'Estadísticas obtenidas exitosamente',
                data: stats
            });
        } catch (error) {
            console.error('Error al obtener estadísticas por usuario:', error);
            res.status(500).json({ 
                error: 'Error al obtener estadísticas',
                details: error.message 
            });
        }
    }

    // Obtener estadísticas promedio por sala
    async getAverageMetricsByRoom(req, res) {
        try {
            const { roomId } = req.params;
            
            const stats = await performanceModel.getAverageMetricsByRoom(roomId);
            
            res.json({
                message: 'Estadísticas obtenidas exitosamente',
                count: stats.length,
                data: stats
            });
        } catch (error) {
            console.error('Error al obtener estadísticas por sala:', error);
            res.status(500).json({ 
                error: 'Error al obtener estadísticas',
                details: error.message 
            });
        }
    }
}

module.exports = new PerformanceController();
