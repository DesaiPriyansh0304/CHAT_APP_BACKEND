const express = require("express");
const router = express.Router();
const invitedcontctController = require("../../controller/Auth/InvitedContact-controller");
const UserMiddleware = require("../../middelware/User-middelware");

//invitedUsers
router.post(
  "/invitedUsers",
  UserMiddleware,
  invitedcontctController.invitedUsers
);
router.post("/invitedUsers-verify", invitedcontctController.invitedUsersverify);

module.exports = router;
