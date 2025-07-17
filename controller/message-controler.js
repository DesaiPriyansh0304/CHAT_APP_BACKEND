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
    const { userId1, userId2, groupId, page = 1, searchText = "" } = req.query;
    const pageSize = 10;
    const pageNumber = parseInt(page);
    const userSelectFields =
      "firstname lastname email profile_avatar bio gender dob";

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
        .populate({
          path: "messages.senderId",
          select: userSelectFields,
        })
        .populate({
          path: "messages.receiverId",
          select: userSelectFields,
        });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "No chat history found",
        });
      }

      // 🔧 Manually fetch user details
      const groupUsers = await Promise.all(
        chat.userIds.map(async (entry) => {
          const userData = await User.findById(entry.user, userSelectFields);
          return {
            user: userData || {},
            role: entry.role,
            addedAt: entry.addedAt,
          };
        })
      );

      // 🔍 Filter and sort
      let filteredMessages = chat.messages;

      if (searchText.trim()) {
        const lowerSearch = searchText.toLowerCase();
        filteredMessages = filteredMessages.filter((msg) =>
          msg.content?.toLowerCase().includes(lowerSearch)
        );
      }

      const sortedMessages = filteredMessages.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const totalMessages = sortedMessages.length;
      const totalPages = Math.ceil(totalMessages / pageSize);
      const paginatedMessages = sortedMessages
        .slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
        .reverse();

      const cleanMessages = paginatedMessages.map((msg) => ({
        ...msg.toObject(),
        senderId: msg.senderId?._id || msg.senderId,
        receiverId: msg.receiverId?._id || msg.receiverId,
      }));

      return res.json({
        success: true,
        currentPage: pageNumber,
        totalPages,
        totalMessages,
        chatHistory: cleanMessages,
        groupUsers,
      });
    } else {
      // Private chat
      const userId1Obj = new Types.ObjectId(userId1);
      const userId2Obj = new Types.ObjectId(userId2);

      chat = await MessageModel.findOne({
        chatType: "private",
        userIds: {
          $all: [
            { $elemMatch: { user: userId1Obj } },
            { $elemMatch: { user: userId2Obj } },
          ],
        },
      })
        .populate({
          path: "messages.senderId",
          select: userSelectFields,
        })
        .populate({
          path: "messages.receiverId",
          select: userSelectFields,
        });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "No chat history found",
        });
      }

      // 🔍 Filter and sort
      let filteredMessages = chat.messages;

      if (searchText.trim()) {
        const lowerSearch = searchText.toLowerCase();
        filteredMessages = filteredMessages.filter((msg) =>
          msg.content?.toLowerCase().includes(lowerSearch)
        );
      }

      const sortedMessages = filteredMessages.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const totalMessages = sortedMessages.length;
      const totalPages = Math.ceil(totalMessages / pageSize);
      const paginatedMessages = sortedMessages
        .slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
        .reverse();

      const firstMsg = chat.messages.find((m) => m.senderId && m.receiverId);
      const sender = firstMsg?.senderId || null;
      const receiver = firstMsg?.receiverId || null;

      const cleanMessages = paginatedMessages.map((msg) => ({
        ...msg.toObject(),
        senderId: msg.senderId?._id || msg.senderId,
        receiverId: msg.receiverId?._id || msg.receiverId,
      }));

      return res.json({
        success: true,
        currentPage: pageNumber,
        totalPages,
        totalMessages,
        chatHistory: cleanMessages,
        sender,
        receiver,
      });
    }
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
    const groups = await MessageModel.find({ chatType: "group" })
      .select("-messages") // optional: exclude messages
      .populate({
        path: "createdBy",
        select: "_id firstname lastname email",
      })
      .populate({
        path: "userIds.user",
        model: "User",
        select: "_id firstname lastname email",
      });

    res.json({
      success: true,
      groups,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user._id;

    const group = await MessageModel.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.userIds.find(
      (u) => u.user.toString() === userId.toString() && u.role === "admin"
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    await MessageModel.findByIdAndDelete(groupId);
    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//leave Group
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user._id;

    const group = await MessageModel.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const currentUser = group.userIds.find(
      (u) => u.user.toString() === userId.toString()
    );

    if (!currentUser) {
      return res.status(403).json({ message: "User not in group" });
    }

    // Block admin from leaving directly
    if (currentUser.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admin cannot leave group directly" });
    }

    // Remove user from group
    await MessageModel.findByIdAndUpdate(groupId, {
      $pull: { userIds: { user: userId } },
    });

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
