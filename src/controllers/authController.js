const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

class AuthController {
    async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuario y contraseña son requeridos'
                });
            }

            // Buscar usuario
            const user = await userModel.findByEmail(username);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario o contraseña incorrectos'
                });
            }

            // Verificar contraseña (en producción usar bcrypt)
            //const isValidPassword = user.password_hash;

            if (password!=user.contra) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario o contraseña incorrectos'
                });
            }

            // Login exitoso
            res.json({
                success: true,
                message: 'Login exitoso',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.correo,
                    type: user.tipo
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                success: false,
                message: 'Error del servidor'
            });
        }
    }

    async register(req, res) {
        try {
            const { username, email, password, nombre_completo } = req.body;

            // Validaciones
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos los campos son requeridos'
                });
            }

            // Verificar si usuario existe
            const userExists = await userModel.exists(username, email);
            if (userExists) {
                return res.status(400).json({
                    success: false,
                    message: 'El usuario o email ya existe'
                });
            }

            // Hash de la contraseña
            const passwordHash = await bcrypt.hash(password, 10);

            // Crear usuario
            const newUser = await userModel.create({
                username,
                email,
                password_hash: passwordHash,
                nombre_completo
            });

            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                user: newUser
            });

        } catch (error) {
            console.error('Error en registro:', error);
            res.status(500).json({
                success: false,
                message: 'Error del servidor'
            });
        }
    }

    async verifyPassword(password, hash) {
        // Para demo, simplificamos la verificación
        // En producción: return await bcrypt.compare(password, hash);
        return password === 'demo123' || await bcrypt.compare(password, hash);
    }
}

module.exports = new AuthController();