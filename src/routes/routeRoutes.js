const routeController = require("../controllers/routeController.js");
const express = require('express');
const router = express.Router();

router.post('/institution', routeController.getRoutes);

module.exports = router;