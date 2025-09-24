const express = require('express');
const locationController = require('../controllers/locationController');
const router = express.Router();

router.post('/', locationController.saveLocation);
router.get('/history/:userId', locationController.getLocationHistory);

module.exports = router;