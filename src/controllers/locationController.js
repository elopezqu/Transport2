const locationModel = require('../models/locationModel');

class LocationController {
    async saveLocation(req, res) {
        try {
            const locationData = req.body;
            
            // Guardar en base de datos (opcional)
            const savedLocation = await locationModel.saveLocation(locationData);
            
            res.json({
                success: true,
                message: 'Ubicación guardada',
                location: savedLocation
            });
        } catch (error) {
            console.error('Error guardando ubicación:', error);
            res.status(500).json({
                success: false,
                message: 'Error guardando ubicación'
            });
        }
    }

    async getLocationHistory(req, res) {
        try {
            const { userId } = req.params;
            const history = await locationModel.getLocationHistory(userId);
            
            res.json({
                success: true,
                history
            });
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo historial'
            });
        }
    }
}

module.exports = new LocationController();