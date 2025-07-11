const User = require("../model/User-model");
const MessageModel = require("../model/Message-model");
const mongoose = require("mongoose");
const { Types } = mongoose;

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
      const userId1Obj = new Types.ObjectId(userId1);
      const userId2Obj = new Types.ObjectId(userId2);
      // Private chat
      chat = await MessageModel.findOne({
        chatType: "private",
        userIds: {
          $all: [
            { $elemMatch: { user: userId1Obj } },
            { $elemMatch: { user: userId2Obj } },
          ],
        },
        // "userIds.user": { $all: [userId1, userId2] },
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
    const creatorId = req.user._id;

    const newGroup = new MessageModel({
      chatType: "group",
      groupName,
      description,
      userIds: [
        {
          user: creatorId,
          addedAt: new Date(),
          role: "admin", // creator is admin
        },
        ...members.map((id) => ({
          user: id,
          addedAt: new Date(),
          role: "member", // others are default members
        })),
      ],
      createdBy: creatorId,
      messages: [],
    });

    newGroup.groupId = newGroup._id;
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
      "userIds.user": userId,
    }).populate("createdBy", "firstname lastname email");

    res.status(200).json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//ADD Member
exports.GroupAddmember = async (req, res) => {
  try {
    const { groupId, newMemberIds } = req.body;
    const requesterId = req.user._id;

    const group = await MessageModel.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const requester = group.userIds.find(
      (u) => u.user.toString() === requesterId.toString()
    );

    if (!requester || !["admin", "subadmin"].includes(requester.role)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const newMembers = newMemberIds.map((id) => ({
      user: id,
      addedAt: new Date(),
      role: "member",
    }));

    group.userIds.push(...newMembers);
    await group.save();

    res.status(200).json({ message: "Members added", group });
  } catch (err) {
    console.error("Add member error:", err);
    res.status(500).json({ message: err.message });
  }
};

//Delete Group
// exports.deleteGroup = async (req, res) => {
//   try {
//     const { groupId } = req.body;
//     const userId = req.user._id;

//     const group = await MessageModel.findById(groupId);
//     const isAdmin = group.userIds.find(
//       (u) => u.user.toString() === userId.toString() && u.role === "admin"
//     );

//     if (!isAdmin) {
//       return res.status(403).json({ message: "Only admin can delete group" });
//     }

//     await MessageModel.findByIdAndDelete(groupId);

//     res.status(200).json({ message: "Group deleted successfully" });
//   } catch (error) {
//     console.error("Delete group error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

//leave Group
// exports.leaveGroup = async (req, res) => {
//   try {
//     const { groupId } = req.body;
//     const userId = req.user._id;

//     const group = await MessageModel.findById(groupId);
//     if (!group) return res.status(404).json({ message: "Group not found" });

//     group.userIds = group.userIds.filter((u) => u.user.toString() !== userId.toString());

//     await group.save();
//     res.status(200).json({ message: "Left group successfully" });
//   } catch (err) {
//     console.error("Leave group error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };
