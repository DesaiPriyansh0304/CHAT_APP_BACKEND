const ConversationHistory = require("../../model/Message-model");
const cloudinary = require("../../utils/Cloudinary");
const mongoose = require("mongoose");
const { uploadFiles } = require("../../utils/Socket.io/fileUploader");
const { convertSizes } = require("../../utils/Socket.io/sizeConverter");

async function handlePrivateMessage(socket, userSocketMap, openedChats, io) {
  // PRIVATE MESSAGE
  socket.on("privateMessage", async (data) => {
    console.log("📩 Received from frontend: /PRIVATE MESSAGE", data);
    try {
      const {
        senderId,
        receiverId,
        textMessage,
        base64Image = [],
        base64File = [],
        messageType,
        fileName = [],
      } = data;

      const senderObjectId = new mongoose.Types.ObjectId(senderId);
      const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

      let contentUrls = [];
      let rawSizes = [];
      let uploadedFileNames = Array.isArray(fileName) ? fileName : [];

      // File upload logic
      const uploadResult = await uploadFiles(
        base64Image,
        base64File,
        textMessage
      );
      contentUrls = uploadResult.contentUrls;
      rawSizes = uploadResult.rawSizes;

      const convertedSizes = convertSizes(rawSizes);

      // Find or create private conversation
      let conversation = await ConversationHistory.findOne({
        chatType: "private",
        userIds: {
          $all: [
            { $elemMatch: { user: senderObjectId } },
            { $elemMatch: { user: receiverObjectId } },
          ],
        },
      });

      if (!conversation) {
        conversation = new ConversationHistory({
          chatType: "private",
          userIds: [{ user: senderObjectId }, { user: receiverObjectId }],
          messages: [],
        });
      }

      const message = {
        senderId: senderObjectId,
        receiverId: receiverObjectId,
        type: messageType,
        content: contentUrls,
        fileName: uploadedFileNames.length > 0 ? uploadedFileNames : undefined,
        fileSizes: convertedSizes,
        text: textMessage || undefined,
        seenBy: [senderObjectId],
        createdAt: new Date(),
      };

      // Normalize message for frontend
      const normalizedMessage = {
        ...message,
        image: messageType === "image" ? contentUrls : "",
        file: messageType === "file" ? contentUrls : "",
      };

      // Save to DB
      conversation.messages.push(message);
      await conversation.save();
      console.log("✅ Message saved in DB");

      // Emit to receiver if online
      const isReceiverOnline = userSocketMap[receiverId];
      const isSameChatOpen = openedChats[receiverId] === senderId.toString();

      if (isReceiverOnline && isSameChatOpen) {
        io.to(userSocketMap[receiverId]).emit(
          "privateMessage",
          normalizedMessage
        );
      } else {
        // Update unread count
        const existing = conversation.unreadMessageCount.find((entry) =>
          entry.user.equals(receiverObjectId)
        );
        if (existing) {
          existing.count += 1;
        } else {
          conversation.unreadMessageCount.push({
            user: receiverObjectId,
            count: 1,
          });
        }
      }

      // Emit to sender (self)
      socket.emit("privateMessage", normalizedMessage);
      await conversation.save();
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }
  });

  // MARK MESSAGES AS READ
  socket.on("markMessagesAsRead", async ({ senderId, receiverId }) => {
    try {
      const receiverObjectId = new mongoose.Types.ObjectId(receiverId);
      const conversation = await ConversationHistory.findOne({
        chatType: "private",
        userIds: {
          $all: [
            { $elemMatch: { user: new mongoose.Types.ObjectId(senderId) } },
            { $elemMatch: { user: receiverObjectId } },
          ],
        },
      });

      if (!conversation) return;

      conversation.messages.forEach((msg) => {
        if (!msg.seenBy.includes(receiverObjectId)) {
          msg.seenBy.push(receiverObjectId);
        }
      });

      const unreadEntry = conversation.unreadMessageCount.find((entry) =>
        entry.user.equals(receiverObjectId)
      );
      if (unreadEntry) unreadEntry.count = 0;

      await conversation.save();
    } catch (err) {
      console.error("❌ Error marking messages as read:", err);
    }
  });
}

module.exports = { handlePrivateMessage };
