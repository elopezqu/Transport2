const pool = require('./database');

class InstitutionModel {
    
    //Institucion por id Usuario
    async findByIdUser(userId){
        const result = await pool.query (
            'SELECT * FROM instituciones WHERE id = (SELECT institucion FROM usuarios WHERE id = $1)',
            [userId]
        );  
        return result.rows[0]
    }
}

module.exports = new InstitutionModel();