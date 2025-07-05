const User = require("../model/User-model");
const MessageModel = require("../model/Message-model");

exports.getuserforsilder = async (req, res) => {
  try {
    const userId = req.user.userId;
    // console.log("userId --->/getuserforsilder/senderID", userId);

    if (!userId) {
      res.status(400).json({ message: "UserId is not Provided" });
    }

    const filterdUsers = await User.find({ _id: { $ne: userId } }).select(
      "-password"
    );
    // console.log("filterdUsers --->/getuserforsilder", filterdUsers);

    const unseenMessages = {};
    // console.log("unseenMessages --->/getuserforsilder", unseenMessages); ///null object give me

    // Declare promises first before using them
    const promises = filterdUsers.map(async (user) => {
      const message = await MessageModel.find({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (message.length > 0) {
        unseenMessages[user._id] = message.length;
      }
    });

    // console.log("senderId --->/getuserforsilder", senderId); //senderId is not defined
    // console.log("receiverId --->/getuserforsilder", receiverId); //userid give me
    // console.log("seen --->/getuserforsilder", seen);

    // You can now safely log after declaration
    // console.log("promises array created");

    await Promise.all(promises);

    res
      .status(201)
      .json({ success: true, users: filterdUsers, unseenMessages });
  } catch (error) {
    console.log(error.message, "getuserforsilder");
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const { userId1, userId2, groupId, page = 1 } = req.query;
    const pageSize = 10;
    const pageNumber = parseInt(page);

    if (!groupId && (!userId1 || !userId2)) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    let chat;

    if (groupId) {
      // Group chat
      chat = await MessageModel.findOne({
        chatType: "group",
        groupId: groupId,
      })
        .populate("messages.senderId", "name email profile avatar")
        .populate("messages.receiverId", "name email profile avatar")
        .populate("userIds", "name email profile avatar");
    } else {
      // Private chat
      chat = await MessageModel.findOne({
        chatType: "private",
        userIds: { $all: [userId1, userId2] },
      })
        .populate("messages.senderId", "name email profile avatar")
        .populate("messages.receiverId", "name email profile avatar");
    }

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "No chat history found",
      });
    }

    // Latest to Oldest
    const sortedMessages = chat.messages.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Pagination
    const totalMessages = sortedMessages.length;
    const totalPages = Math.ceil(totalMessages / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMessages = sortedMessages.slice(startIndex, endIndex);

    // Reverse again to display Oldest at top, Newest at bottom
    const finalMessages = paginatedMessages.reverse();

    const response = {
      success: true,
      currentPage: pageNumber,
      totalPages,
      totalMessages,
      chatHistory: finalMessages,
    };

    if (chat.chatType === "group") {
      response.groupUsers = chat.userIds;
    }

    res.json(response);
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { groupName, description, members } = req.body;
    console.log("req.body --->/cretgroupe", req.body);

    const creatorId = req.user._id;

    const newGroup = new MessageModel({
      chatType: "group",
      groupName,
      description,
      userIds: members,
      createdBy: creatorId,
      messages: [],
    });
    newGroup.groupId = newGroup._id;
    console.log(" Group created in DB:", newGroup);
    await newGroup.save();

    const populatedGroup = await newGroup.populate(
      "createdBy",
      "firstname lastname email"
    );

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("❌ Group creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//grop find in user
exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await MessageModel.find({
      chatType: "group",
      userIds: { $in: [userId] },
    }).populate("createdBy", "firstname lastname email");

    res.status(200).json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
