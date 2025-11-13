const pool = require('./database');

class UserModel {
    // Buscar usuario por username o email
    async findByEmail(identifier) {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1',
            [identifier]
        );
        return result.rows[0];
    }

    // Crear nuevo usuario
    async create(userData) {
        const { username, email, password_hash, nombre_completo } = userData;
        const result = await pool.query(
            `INSERT INTO usuarios (username, email, password_hash, nombre_completo) 
             VALUES ($1, $2, $3, $4) RETURNING id, username, email, nombre_completo, created_at`,
            [username, email, password_hash, nombre_completo]
        );
        return result.rows[0];
    }

    // Verificar si usuario existe
    async exists(username, email) {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE username = $1 OR email = $2',
            [username, email]
        );
        return result.rows.length > 0;
    }

    // Obtener usuario por ID
    async findById(userId) {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    }
}

module.exports = new UserModel();