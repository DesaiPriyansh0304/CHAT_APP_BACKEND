const express = require("express");
const router = express.Router();
const AuthController = require("../controller/auth-control");
const UserMiddleware = require("../middelware/User-middelware");
const passwordrouter = require("../router/Auth/Password-router");
const userdatarouter = require("../router/Auth/UserData-router");
const invitecontactrouter = require("../router/Auth/InvitedContact-router");

router.use("/password", passwordrouter);
router.use("/userdata", userdatarouter);
router.use("/invite", invitecontactrouter);

// Register and Login Router
router.post("/signup", AuthController.Register);
router.post("/signin", AuthController.Login);

//Update-Profile
router.put("/update-profile", UserMiddleware, AuthController.updateProfile);

//favoriteItem
router.post("/favorite", UserMiddleware, AuthController.favorite);

//SearchUser
router.get("/serchuser", AuthController.SearchUser);

//getfilter Data
router.post("/get-filteruser", UserMiddleware, AuthController.getfilterByUser);

//online user
router.post("/get-onlineuser", AuthController.onlineByUser);

module.exports = router;
