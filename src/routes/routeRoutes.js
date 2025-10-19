const routeController = require("../controllers/routeController.js");
const express = require('express');
const router = express.Router();

router.post('/institution', routeController.getRoutesbyIdInstitucion);
router.post('/routeid', routeController.getRoutesbyId);

module.exports = router;