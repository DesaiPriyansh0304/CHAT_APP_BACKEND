const express = require("express");
const router = express.Router();
const authrouter = require("./auth-router");
const msgrouter = require("./mesage-router");
const mailrouter = require("./nodemailer-router");

router.use("/auth", authrouter);
router.use("/msg", msgrouter);
router.use("/otp", mailrouter);

module.exports = router;
