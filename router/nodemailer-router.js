const express = require("express");
const router = express.Router();
const NodemailerController = require("../controller/nodemailer-controller");

router.post("/verify-otp", NodemailerController.verifyOtp);
router.post("/resend-otp", NodemailerController.resendOtp);

module.exports = router;
