// const ConversationHistory = require("../../model/Message-model");
// const mongoose = require("mongoose");
// const { userSocketMap, openedChats } = require("./socketmap");
// const { uploadFiles, convertSizes } = require("./fileUploader");

// class PrivateMessageHandler {
//   constructor(io, socket) {
//     this.io = io;
//     this.socket = socket;
//     this.userId = socket.handshake.query.userId;
//   }

//   handlePrivateMessage() {
//     this.socket.on("privateMessage", async (data) => {
//       console.log("📩 Received from frontend: /PRIVATE MESSAGE", data);

//       try {
//         const {
//           senderId,
//           receiverId,
//           textMessage,
//           base64Image = [],
//           base64File = [],
//           messageType,
//           fileName = [],
//         } = data;

//         const senderObjectId = new mongoose.Types.ObjectId(senderId);
//         const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

//         // File/Image upload
//         const { contentUrls, rawSizes, uploadedFileNames } = await uploadFiles({
//           base64Image,
//           base64File,
//           textMessage,
//           fileName,
//         });

//         const convertedSizes = convertSizes(rawSizes);

//         // Find or create private conversation
//         let conversation = await this.findOrCreateConversation(
//           senderObjectId,
//           receiverObjectId
//         );

//         const message = {
//           senderId: senderObjectId,
//           receiverId: receiverObjectId,
//           type: messageType,
//           content: contentUrls,
//           fileName:
//             uploadedFileNames.length > 0 ? uploadedFileNames : undefined,
//           fileSizes: convertedSizes,
//           text: textMessage || undefined,
//           seenBy: [senderObjectId],
//           createdAt: new Date(),
//         };

//         const normalizedMessage = {
//           ...message,
//           image: messageType === "image" ? contentUrls : "",
//           file: messageType === "file" ? contentUrls : "",
//         };

//         // Message save કરો
//         conversation.messages.push(message);

//         // Handle unread count and message delivery
//         await this.handleUnreadCountAndDelivery(
//           conversation,
//           senderId,
//           receiverId,
//           receiverObjectId,
//           normalizedMessage
//         );

//         // Sender ને message emit કરો
//         this.socket.emit("privateMessage", normalizedMessage);

//         await conversation.save();
//         console.log("💾 Message saved in DB");
//       } catch (err) {
//         console.error("❌ Error saving private message:", err);
//       }
//     });
//   }

//   async findOrCreateConversation(senderObjectId, receiverObjectId) {
//     let conversation = await ConversationHistory.findOne({
//       chatType: "private",
//       userIds: {
//         $all: [
//           { $elemMatch: { user: senderObjectId } },
//           { $elemMatch: { user: receiverObjectId } },
//         ],
//       },
//     });

//     if (!conversation) {
//       conversation = new ConversationHistory({
//         chatType: "private",
//         userIds: [{ user: senderObjectId }, { user: receiverObjectId }],
//         messages: [],
//         unreadMessageCount: [],
//       });
//     }

//     return conversation;
//   }

//   async handleUnreadCountAndDelivery(
//     conversation,
//     senderId,
//     receiverId,
//     receiverObjectId,
//     normalizedMessage
//   ) {
//     // 🚨 મહત્વપૂર્ણ: Unread count logic
//     const isReceiverOnline = userSocketMap[receiverId];
//     const isReceiverChatOpen = openedChats[receiverId] === senderId.toString();

//     // જો receiver online છે અને same chat open છે
//     if (isReceiverOnline && isReceiverChatOpen) {
//       // Message emit કરો, count વધારવાની જરૂર નથી
//       this.io
//         .to(userSocketMap[receiverId])
//         .emit("privateMessage", normalizedMessage);
//       console.log("✅ Message delivered to online user with chat open");
//     } else {
//       // Count વધારો (receiver offline છે અથવા બીજી chat open છે)
//       let unreadEntry = conversation.unreadMessageCount.find((entry) =>
//         entry.user.equals(receiverObjectId)
//       );

//       if (unreadEntry) {
//         unreadEntry.count += 1;
//       } else {
//         conversation.unreadMessageCount.push({
//           user: receiverObjectId,
//           count: 1,
//         });
//       }

//       // જો receiver online છે પણ બીજી chat open છે તો પણ message emit કરો
//       if (isReceiverOnline) {
//         this.io
//           .to(userSocketMap[receiverId])
//           .emit("privateMessage", normalizedMessage);
//       }

//       console.log(`📊 Unread count increased for ${receiverId}`);
//     }
//   }
// }

// module.exports = PrivateMessageHandler;

const ConversationHistory = require("../../model/Message-model");
const mongoose = require("mongoose");
const { userSocketMap, openedChats } = require("./socketmap");
const { uploadFiles, convertSizes } = require("./fileUploader");
const UnreadCountService = require("./Unreadmessage");

class PrivateMessageHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.handshake.query.userId;
  }

  handlePrivateMessage() {
    this.socket.on("privateMessage", async (data) => {
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

        // File/Image upload
        const { contentUrls, rawSizes, uploadedFileNames } = await uploadFiles({
          base64Image,
          base64File,
          textMessage,
          fileName,
        });

        const convertedSizes = convertSizes(rawSizes);

        // Find or create private conversation
        let conversation = await this.findOrCreateConversation(
          senderObjectId,
          receiverObjectId
        );

        const message = {
          senderId: senderObjectId,
          receiverId: receiverObjectId,
          type: messageType,
          content: contentUrls,
          fileName:
            uploadedFileNames.length > 0 ? uploadedFileNames : undefined,
          fileSizes: convertedSizes,
          text: textMessage || undefined,
          seenBy: [senderObjectId],
          createdAt: new Date(),
        };

        const normalizedMessage = {
          ...message,
          image: messageType === "image" ? contentUrls : "",
          file: messageType === "file" ? contentUrls : "",
        };

        // Message save કરો
        conversation.messages.push(message);

        // Handle unread count and message delivery
        const countIncreased = UnreadCountService.handlePrivateUnreadCount(
          conversation,
          senderId,
          receiverId,
          receiverObjectId,
          normalizedMessage,
          this.io
        );

        // Sender ને message emit કરો
        this.socket.emit("privateMessage", normalizedMessage);

        await conversation.save();
        console.log("💾 Message saved in DB");
      } catch (err) {
        console.error("❌ Error saving private message:", err);
      }
    });
  }

  async findOrCreateConversation(senderObjectId, receiverObjectId) {
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
        unreadMessageCount: [],
      });
    }

    return conversation;
  }

  async handleUnreadCountAndDelivery(
    conversation,
    senderId,
    receiverId,
    receiverObjectId,
    normalizedMessage
  ) {
    // 🚨 મહત્વપૂર્ણ: Unread count logic
    const isReceiverOnline = userSocketMap[receiverId];
    const isReceiverChatOpen = openedChats[receiverId] === senderId.toString();

    // જો receiver online છે અને same chat open છે
    if (isReceiverOnline && isReceiverChatOpen) {
      // Message emit કરો, count વધારવાની જરૂર નથી
      this.io
        .to(userSocketMap[receiverId])
        .emit("privateMessage", normalizedMessage);
      console.log("✅ Message delivered to online user with chat open");
    } else {
      // Count વધારો (receiver offline છે અથવા બીજી chat open છે)
      let unreadEntry = conversation.unreadMessageCount.find((entry) =>
        entry.user.equals(receiverObjectId)
      );

      if (unreadEntry) {
        unreadEntry.count += 1;
      } else {
        conversation.unreadMessageCount.push({
          user: receiverObjectId,
          count: 1,
        });
      }

      // જો receiver online છે પણ બીજી chat open છે તો પણ message emit કરો
      if (isReceiverOnline) {
        this.io
          .to(userSocketMap[receiverId])
          .emit("privateMessage", normalizedMessage);
      }

      console.log(`📊 Unread count increased for ${receiverId}`);
    }
  }
}

module.exports = PrivateMessageHandler;
