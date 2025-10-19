const routeModel = require("../models/routeModel.js");

class RouteController {
    async getRoutesbyIdInstitucion(req, res){
        try{
            const { idInstitution } = req.body;
                
            if (!idInstitution) {
                return res.status(400).json({
                    success : false,
                    message : "No hay ID"
                });
            }
                
                const route = await routeModel.findByIdInstitution(idInstitution)
    
    
                if (!route) {
                    return res.status(401).json({
                        success : false,
                        message : "BD no encontro ID"
                    });
                }
                
                console.log("bd: ", route);
    
                res.json({
                    success : true,
                    message : "Se encontro:",
                    route : route.rows
                });

        } catch (error){
            console.error('Error :', error);
            res.status(500).json({
                success : false,
                message : error
            })
        }
    }

    async getRoutesbyId(req, res){
        try{
            const { id } = req.body;
                
            if (!id) {
                return res.status(400).json({
                    success : false,
                    message : "No hay ID"
                });
            }
                
                const route = await routeModel.findById(id)
    
    
                if (!route) {
                    return res.status(401).json({
                        success : false,
                        message : "BD no encontro ID"
                    });
                }
                
                console.log("bd: ", route);
    
                res.json({
                    success : true,
                    message : "Se encontro:",
                    route : {
                        id: route.id,
                        institution: route.institucion,
                        name: route.nombre,
                        description: route.descripcion,
                        url: route.url
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
module.exports = new RouteController();