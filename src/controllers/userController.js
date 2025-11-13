const userModel = require('../models/userModel');

class UserController {
    async getUserById(req, res) {
        try {
            const { idUser } = req.body;
            if (!idUser) {
                return res.status(400).json({
                    success : false,
                    message : "No hay ID"
                });
            }
            const user = await userModel.findById(idUser);

            if (!user) { 
                return res.status(401).json({
                    success : false,
                    message : "BD no encontro ID"
                });  
            }

            console.log("bd: ", user);

            res.json({
                success : true,
                message : "Se encontro:",
                user : {
                    id: user.id,
                    name : user.nombre,
                    type : user.tipo,
                    institutionId : user.institucion
                }
            });

        } catch (error) {
            console.error('Error :', error);
            res.status(500).json({
                success : false,
                message : error
            })
        }
    }
}

module.exports = new UserController();  