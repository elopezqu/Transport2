const institutionModel = require("../models/institutionModel");

class InstitucionController {
    
    //
    async getInstitution(req, res){
        try{
            const { idUser } = req.body;
            
            if (!idUser) {
                return res.status(400).json({
                    success : false,
                    message : "No hay ID"
                });
            }
            
            const institution = await institutionModel.findByIdUser(idUser)


            if (!institution) {
                return res.status(401).json({
                    success : false,
                    message : "BD no encontro ID"
                });
            }
            
            console.log("bd: ", institution);

            res.json({
                success : true,
                message : "Se encontro:",
                institution : {
                    id: institution.id,
                    name : institution.nombre,
                    description : institution.descripcion
                }
            });
        } catch (error){
            console.error('Error :', error);
            res.status(500).json({
                success : false,
                message : error
            })
        }
    }

}

module.exports = new InstitucionController();