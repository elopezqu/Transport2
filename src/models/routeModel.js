const pool = require('./database');

class RouteModel {
    async findByIdInstitution(institutionId) {
        const result = await pool.query (
            'SELECT * FROM rutas WHERE institucion = $1',
            [institutionId]
        );  
        return result
    }
    async findById(id) {
        const result = await pool.query (
            'SELECT * FROM rutas WHERE id = $1',
            [id]
        );  
        return result.rows[0];
    }


}

module.exports = new RouteModel();