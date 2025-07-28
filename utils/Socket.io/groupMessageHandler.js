// groupMessageHandler.js - Fixed Version
const ConversationHistory = require("../../model/Message-model");
const mongoose = require("mongoose");
const { userSocketMap, openedChats } = require("./socketmap");
const { uploadFiles } = require("./fileUploader");
const UnreadCountService = require("./Unreadmessage");

const processedMessages = new Map();

class GroupMessageHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.handshake.query.userId;
  }

  handleGroupMessage() {
    this.socket.on("groupMessage", async (data) => {
      console.log("📩 Group message data received:", data);

      const {
        groupId,
        senderId,
        groupName,
        textMessage,
        base64Image = [],
        base64File = [],
        messageType,
        fileName = [],
        fileNames = [],
      } = data;

      try {
        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const groupObjectId = new mongoose.Types.ObjectId(groupId);

        // ✅ Handle file names safely
        const finalFileNames =
          Array.isArray(fileName) && fileName.length > 0
            ? fileName
            : Array.isArray(fileNames)
            ? fileNames
            : [];

        // ✅ Handle image and file arrays safely
        const sanitizedBase64Image = Array.isArray(base64Image)
          ? base64Image
          : [];
        const sanitizedBase64File = Array.isArray(base64File) ? base64File : [];

        // Duplicate message check
        const messageHash = this.generateMessageHash(data);
        if (processedMessages.has(messageHash)) {
          console.log("🚫 Duplicate message detected, ignoring:", messageHash);
          return;
        }

        processedMessages.set(messageHash, Date.now());
        this.cleanupProcessedMessages();

        const conversation = await ConversationHistory.findOne({
          chatType: "group",
          groupId: groupObjectId,
        });

        if (!conversation) {
          return this.socket.emit("error", { message: "Group not found" });
        }

        // Check user permission
        if (!this.checkUserPermission(conversation, senderId)) {
          return this.socket.emit("error", {
            message: "Not allowed to send messages",
          });
        }

        const { contentUrls } = await uploadFiles({
          base64Image: sanitizedBase64Image,
          base64File: sanitizedBase64File,
          textMessage,
          fileName: finalFileNames,
        });

        const messageId = new mongoose.Types.ObjectId();
        const message = {
          _id: messageId,
          senderId: senderObjectId,
          groupId: groupObjectId,
          groupName,
          type: messageType,
          content: contentUrls,
          fileName: finalFileNames.length > 0 ? finalFileNames : undefined,
          text: textMessage || undefined,
          seenBy: [senderObjectId],
          createdAt: new Date(),
        };

        const normalizedMessage = {
          ...message,
          messageId: messageId.toString(),
          senderId: senderObjectId,
          groupId: groupObjectId,
          image: messageType === "image" ? contentUrls : "",
          file: messageType === "file" ? contentUrls : "",
          isGroupMessage: true,
        };

        conversation.messages.push(message);

        this.handleGroupUnreadCount(conversation, senderId, groupId);

        await conversation.save();
        console.log("💾 Message saved to database successfully");

        this.emitToGroupMembers(conversation, normalizedMessage, senderId);

        UnreadCountService.handleGroupUnreadCount(
          conversation,
          senderId,
          groupId,
          normalizedMessage,
          this.io
        );
      } catch (error) {
        console.error("⚫ Error in groupMessage:", error);
        this.socket.emit("error", { message: "Failed to send message" });
      }
    });
  }

  generateMessageHash(data) {
    const { groupId, senderId, textMessage, messageType } = data;
    const timestamp = Date.now();
    return `${groupId}_${senderId}_${textMessage}_${messageType}_${Math.floor(
      timestamp / 1000
    )}`;
  }

  cleanupProcessedMessages() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [hash, timestamp] of processedMessages.entries()) {
      if (timestamp < fiveMinutesAgo) {
        processedMessages.delete(hash);
      }
    }
  }

  emitToGroupMembers(conversation, message, senderId) {
    let sentCount = 0;

    conversation.userIds.forEach((userObj) => {
      const userId = userObj.user.toString();

      if (userId === senderId) {
        console.log(`🚫 Skipping sender: ${userId}`);
        return;
      }

      const userSocket = userSocketMap[userId];

      if (userSocket && userSocket.connected) {
        userSocket.emit("groupMessage", {
          ...message,
          recipientId: userId,
        });

        sentCount++;
        console.log(`📤 Message sent to user: ${userId}`);
      } else {
        console.log(`👤 User ${userId} is offline, message stored in DB`);
      }
    });

    console.log(
      `✅ Group message emitted to ${sentCount} members (excluding sender)`
    );
  }

  checkUserPermission(conversation, senderId) {
    const userInGroup = conversation.userIds.find(
      (u) => u.user.toString() === senderId
    );

    return (
      userInGroup && ["admin", "subadmin", "member"].includes(userInGroup.role)
    );
  }

  handleGroupUnreadCount(conversation, senderId, groupId) {
    conversation.userIds.forEach((userObj) => {
      const userId = userObj.user.toString();

      if (userId === senderId) return;

      const isUserOnline = userSocketMap[userId];
      const isGroupChatOpen = openedChats[userId] === groupId;

      if (!isUserOnline || !isGroupChatOpen) {
        let unreadEntry = conversation.unreadMessageCount.find((entry) =>
          entry.user.equals(userObj.user)
        );

        if (unreadEntry) {
          unreadEntry.count += 1;
        } else {
          conversation.unreadMessageCount.push({
            user: userObj.user,
            count: 1,
          });
        }
      }
    });
  }
}

module.exports = GroupMessageHandler;
