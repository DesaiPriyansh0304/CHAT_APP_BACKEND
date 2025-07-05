const express = require("express");
const router = express.Router();
const MessageController = require("../controller/message-controler");
const UserMiddleware = require("../middelware/User-middelware");

router.get("/user", UserMiddleware, MessageController.getuserforsilder);
router.get("/chat-history", MessageController.getChatHistory);

//group
router.post("/creategroup", UserMiddleware, MessageController.createGroup); ///create group
router.get("/usergroups", UserMiddleware, MessageController.getUserGroups); //get groups

module.exports = router;
