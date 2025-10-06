const pool = require('./database');

class RouteModel {
    async findByIdInstitution(institutionId) {
        const result = await pool.query (
            'SELECT * FROM rutas WHERE institucion = $1',
            [institutionId]
        );  
        return result
    }

}

module.exports = new RouteModel();