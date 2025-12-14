const pool = require('./database');

class PerformanceModel {
    // Guardar métricas de rendimiento (latencia, precisión)
    async savePerformanceMetrics(metricsData) {
        const { 
            userId, 
            latecia, 
            precision
        } = metricsData;
        
        const result = await pool.query(
            `INSERT INTO metricas (usuario, latencia, precision) VALUES ($1, $2, $3)`,
            [userId, latecia, precision]
        );
        return result.rows[0];
    }

    // Obtener métricas por usuario
    async getMetricsByUser(userId, limit = 100) {
        const result = await pool.query(
            `SELECT * FROM performance_metrics 
            WHERE user_id = $1 
            ORDER BY timestamp DESC 
            LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    // Obtener métricas por sala
    async getMetricsByRoom(roomId, limit = 100) {
        const result = await pool.query(
            `SELECT * FROM performance_metrics 
            WHERE room_id = $1 
            ORDER BY timestamp DESC 
            LIMIT $2`,
            [roomId, limit]
        );
        return result.rows;
    }

    // Obtener estadísticas promedio por usuario
    async getAverageMetricsByUser(userId) {
        const result = await pool.query(
            `SELECT 
                user_id,
                username,
                COUNT(*) as total_records,
                AVG(network_latency) as avg_latency,
                MIN(network_latency) as min_latency,
                MAX(network_latency) as max_latency,
                AVG(gps_accuracy) as avg_accuracy,
                MIN(gps_accuracy) as min_accuracy,
                MAX(gps_accuracy) as max_accuracy
            FROM performance_metrics 
            WHERE user_id = $1 
            GROUP BY user_id, username`,
            [userId]
        );
        return result.rows[0];
    }

    // Obtener estadísticas promedio por sala
    async getAverageMetricsByRoom(roomId) {
        const result = await pool.query(
            `SELECT 
                room_id,
                user_role,
                COUNT(*) as total_records,
                AVG(network_latency) as avg_latency,
                MIN(network_latency) as min_latency,
                MAX(network_latency) as max_latency,
                AVG(gps_accuracy) as avg_accuracy,
                MIN(gps_accuracy) as min_accuracy,
                MAX(gps_accuracy) as max_accuracy
            FROM performance_metrics 
            WHERE room_id = $1 
            GROUP BY room_id, user_role`,
            [roomId]
        );
        return result.rows;
    }
}

module.exports = new PerformanceModel();
