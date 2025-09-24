const pool = require('./database');

class LocationModel {
    // Guardar ubicación en base de datos (opcional)
    async saveLocation(locationData) {
        const { userId, latitude, longitude, roomId, timestamp } = locationData;
        const result = await pool.query(
            `INSERT INTO user_locations (user_id, latitude, longitude, room_id, timestamp) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, latitude, longitude, roomId, timestamp || new Date()]
        );
        return result.rows[0];
    }

    // Obtener historial de ubicaciones de un usuario
    async getLocationHistory(userId, limit = 10) {
        const result = await pool.query(
            `SELECT * FROM user_locations 
             WHERE user_id = $1 
             ORDER BY timestamp DESC 
             LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    // Obtener ubicaciones actuales de una sala
    async getCurrentRoomLocations(roomId) {
        const result = await pool.query(
            `SELECT ul.*, u.username, u.nombre_completo 
             FROM user_locations ul
             JOIN usuarios u ON ul.user_id = u.id
             WHERE ul.room_id = $1 
             AND ul.timestamp > NOW() - INTERVAL '5 minutes'
             ORDER BY ul.timestamp DESC`,
            [roomId]
        );
        return result.rows;
    }
}

module.exports = new LocationModel();