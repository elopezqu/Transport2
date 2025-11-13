const userController = require('../controllers/userController');
const express = require('express');
const router = express.Router();

router.post('/id', userController.getUserById);
    
module.exports = router;