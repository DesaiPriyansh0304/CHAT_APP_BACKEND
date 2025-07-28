const ConversationHistory = require("../../model/Message-model");
const mongoose = require("mongoose");
const { userSocketMap } = require("./socketmap");

class ReadReceiptsHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.handshake.query.userId;
  }

  handleMarkAsRead() {
    // MARK MESSAGES AS READ - Private Chat
    this.socket.on("markMessagesAsRead", async ({ senderId, receiverId }) => {
      try {
        const receiverObjectId = new mongoose.Types.ObjectId(receiverId);
        const senderObjectId = new mongoose.Types.ObjectId(senderId);

        const conversation = await ConversationHistory.findOne({
          chatType: "private",
          userIds: {
            $all: [
              { $elemMatch: { user: senderObjectId } },
              { $elemMatch: { user: receiverObjectId } },
            ],
          },
        });

        if (!conversation) return;

        // Messages ને seen કરો
        conversation.messages.forEach((msg) => {
          if (!msg.seenBy.includes(receiverObjectId)) {
            msg.seenBy.push(receiverObjectId);
          }
        });

        // Unread count reset કરો
        const unreadEntry = conversation.unreadMessageCount.find((entry) =>
          entry.user.equals(receiverObjectId)
        );
        if (unreadEntry) {
          unreadEntry.count = 0;
        }

        await conversation.save();
        console.log(`✅ Messages marked as read for ${receiverId}`);

        // Sender ને update મોકલો કે messages read થયા
        if (userSocketMap[senderId]) {
          this.io.to(userSocketMap[senderId]).emit("messagesRead", {
            readBy: receiverId,
            chatType: "private",
          });
        }
      } catch (err) {
        console.error("❌ Error marking messages as read:", err);
      }
    });
  }

  handleMarkGroupAsRead() {
    // MARK MESSAGES AS READ - Group Chat
    this.socket.on("markGroupMessagesAsRead", async ({ groupId, userId }) => {
      try {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const groupObjectId = new mongoose.Types.ObjectId(groupId);

        const conversation = await ConversationHistory.findOne({
          chatType: "group",
          groupId: groupObjectId,
        });

        if (!conversation) return;

        // Messages ને seen કરો
        conversation.messages.forEach((msg) => {
          if (!msg.seenBy.includes(userObjectId)) {
            msg.seenBy.push(userObjectId);
          }
        });

        // Unread count reset કરો
        const unreadEntry = conversation.unreadMessageCount.find((entry) =>
          entry.user.equals(userObjectId)
        );
        if (unreadEntry) {
          unreadEntry.count = 0;
        }

        await conversation.save();
        console.log(`✅ Group messages marked as read for ${userId}`);
      } catch (err) {
        console.error("❌ Error marking group messages as read:", err);
      }
    });
  }
}

module.exports = ReadReceiptsHandler;
