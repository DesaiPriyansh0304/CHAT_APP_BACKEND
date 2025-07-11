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

//inviteduser Data
router.get("/get-inviteduser", UserMiddleware, AuthController.getinvitedByUser);

//db store User
router.get("/dbuser", UserMiddleware, AuthController.getdbUserdata);

//favoriteItem
router.post("/favorite", UserMiddleware, AuthController.favorite);

//invitedUsers
router.post("/invitedUsers", UserMiddleware, AuthController.invitedUsers);
router.post("/invitedUsers-verify", AuthController.invitedUsersverify);

//password
router.post("/forgotPassword", AuthController.forgotPassword);
router.post("/resetPassword", AuthController.resetPassword);

module.exports = router;
