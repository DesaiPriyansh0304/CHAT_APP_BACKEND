const express = require("express");
const router = express.Router();
const UserDataController = require("../../controller/Auth/UserData-controller");
const UserMiddleware = require("../../middelware/User-middelware");

//Login User Check data
router.get("/check", UserMiddleware, UserDataController.checkAuth);

//
router.get("/getalluser", UserDataController.GetAlluserData);

//inviteduser Data
router.get(
  "/get-inviteduser",
  UserMiddleware,
  UserDataController.getinvitedByUser
);

//db store User
router.get("/dbuser", UserMiddleware, UserDataController.getdbUserdata);

module.exports = router;
