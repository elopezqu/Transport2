const routeModel = require("../models/routeModel.js");

class RouteController {
    async getRoutes(req, res){
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
}
module.exports = new RouteController();