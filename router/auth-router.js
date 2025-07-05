const express = require("express");
const router = express.Router();
const AuthController = require("../controller/auth-control");
const UserMiddleware = require("../middelware/User-middelware");

router.post("/signup", AuthController.Register);
router.post("/signin", AuthController.Login);
router.get("/check", UserMiddleware, AuthController.checkAuth);
router.put("/update-profile", UserMiddleware, AuthController.updateProfile);
router.get("/getloginuser", UserMiddleware, AuthController.GetLoginuserData);
router.get("/getalluser", AuthController.GetAlluserData);
router.get("/get-user/:id", AuthController.getUserById);

//invitedUsers
router.post("/invitedUsers", UserMiddleware, AuthController.invitedUsers);
router.post("/invitedUsers-verify", AuthController.invitedUsersverify);

//password
router.post("/forgotPassword", AuthController.forgotPassword);
router.post("/resetPassword", AuthController.resetPassword);

module.exports = router;
