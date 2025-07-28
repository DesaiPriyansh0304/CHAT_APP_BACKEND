const express = require("express");
const router = express.Router();
const PasswordController = require("../../controller/Auth/Password-controller");

//password
router.post("/forgotPassword", PasswordController.forgotPassword);
router.post("/resetPassword", PasswordController.resetPassword);

module.exports = router;
