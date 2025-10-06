const express = require("express");
const router = express.Router();
const institutionController = require("../controllers/institutionController");

router.post("/user",institutionController.getInstitution);

module.exports = router;
