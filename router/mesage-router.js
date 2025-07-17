const express = require("express");
const router = express.Router();
const MessageController = require("../controller/message-controler");
const UserMiddleware = require("../middelware/User-middelware");

router.get("/user", UserMiddleware, MessageController.getuserforsilder); //get dall user get
router.get("/chat-history", MessageController.getChatHistory); //chat-history

//group
router.post("/creategroup", UserMiddleware, MessageController.createGroup); //create group
router.get("/usergroups", UserMiddleware, MessageController.getUserGroups); //get groups
router.post("/addmember", UserMiddleware, MessageController.GroupAddmember); //add member
router.post("/deletegroup", UserMiddleware, MessageController.deleteGroup); //add member
router.post("/leavegroup", UserMiddleware, MessageController.leaveGroup);

module.exports = router;
