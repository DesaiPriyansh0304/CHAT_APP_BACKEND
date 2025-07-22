const ConversationHistory = require("../../model/Message-model");
const mongoose = require("mongoose");
const { uploadFiles } = require("../../utils/Socket.io/fileUploader");

async function handleGroupMessage(socket, io) {
  // GROUP JOIN
  socket.on("joinGroup", ({ groupId }) => {
    socket.join(groupId);
    console.log(`👥 User joined group: ${groupId}`);
  });

  // GROUP MESSAGE
  socket.on("groupMessage", async (data) => {
    console.log("📩 data --->/groupMessage", data);
    const {
      groupId,
      senderId,
      groupName,
      textMessage,
      base64Image = [],
      base64File = [],
      messageType,
      fileName = [],
    } = data;

    try {
      const senderObjectId = new mongoose.Types.ObjectId(senderId);
      const groupObjectId = new mongoose.Types.ObjectId(groupId);

      const conversation = await ConversationHistory.findOne({
        chatType: "group",
        groupId: groupObjectId,
      });

      if (!conversation) {
        return socket.emit("error", { message: "Group not found" });
      }

      // Get role of sender
      const userInGroup = conversation.userIds.find(
        (u) => u.user.toString() === senderId
      );

      if (!userInGroup) {
        return socket.emit("error", {
          message: "User not part of this group",
        });
      }

      const role = userInGroup.role;

      // If user is not part of group or blocked
      if (!["admin", "subadmin", "member"].includes(role)) {
        return socket.emit("error", {
          message: "Not allowed to send messages",
        });
      }

      // File upload logic
      const uploadResult = await uploadFiles(
        base64Image,
        base64File,
        textMessage
      );
      const contentUrls = uploadResult.contentUrls;

      const message = {
        senderId: senderObjectId,
        groupId: groupObjectId,
        groupName,
        type: messageType,
        content: contentUrls,
        fileName: fileName.length > 0 ? fileName : undefined,
        text: textMessage || undefined,
        seenBy: [senderObjectId],
        createdAt: new Date(),
      };

      // Normalize for group
      const normalizedMessage = {
        ...message,
        image: messageType === "image" ? contentUrls : "",
        file: messageType === "file" ? contentUrls : "",
      };

      console.log("normalizedMessage --->/Group Message", normalizedMessage);

      conversation.messages.push(message);
      await conversation.save();

      const emitRoom = groupId || conversation.groupId?.toString();
      if (emitRoom) {
        io.to(emitRoom).emit("groupMessage", normalizedMessage);
      }
    } catch (error) {
      console.error("⚫ Error in groupMessage:", error);
    }
  });
}

module.exports = { handleGroupMessage };
