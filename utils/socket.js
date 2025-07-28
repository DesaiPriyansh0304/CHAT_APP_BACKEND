// const { Server } = require("socket.io");
// const ConversationHistory = require("../model/Message-model");
// const cloudinary = require("../utils/Cloudinary");
// const mongoose = require("mongoose");

// const userSocketMap = {}; // userId => socket.id
// let io;

// function initSocket(server) {
//   io = new Server(server, {
//     cors: { origin: "*", methods: ["GET", "POST"] },
//     maxHttpBufferSize: 1e8,
//   });

//   io.on("connection", (socket) => {
//     console.log("🟣 New socket connected:", socket.id);

//     const userId = socket.handshake.query.userId;
//     console.log("🟢 Connected userId:", userId);
//     console.log("👉 userId from client:", socket.handshake.query.userId);

//     if (userId) {
//       userSocketMap[userId] = socket.id;
//       io.emit("getOnlineUsers", Object.keys(userSocketMap));
//     }

//     // PRIVATE MESSAGE
//     socket.on("privateMessage", async (data) => {
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

//         // let contentUrl = textMessage;
//         let contentUrls = [];
//         let rawSizes = [];
//         // console.log("rawSizes  --->", rawSizes);

//         const convertSizes = (bytesArray) => {
//           return bytesArray.map((bytes) => ({
//             bytes,
//             kb: (bytes / 1024).toFixed(2), // 1 KB = 1024 bytes
//             mb: (bytes / (1024 * 1024)).toFixed(2), // 1 MB = 1024 * 1024 bytes
//           }));
//         };

//         // let result = null;
//         let uploadedFileNames = Array.isArray(fileName) ? fileName : [];

//         if (Array.isArray(base64Image) && base64Image.length > 0) {
//           const imageUploadPromises = base64Image.map((img) =>
//             cloudinary.uploader.upload(img, { folder: "chat/images" })
//           );
//           const uploadResults = await Promise.all(imageUploadPromises);
//           contentUrls = uploadResults.map((res) => res.secure_url);
//           rawSizes = uploadResults.map((res) => res.bytes);
//         } else if (Array.isArray(base64File) && base64File.length > 0) {
//           const fileUploadPromises = base64File.map((file) =>
//             cloudinary.uploader.upload(file, {
//               folder: "chat/files",
//               resource_type: "auto",
//             })
//           );
//           const uploadResults = await Promise.all(fileUploadPromises);
//           contentUrls = uploadResults.map((res) => res.secure_url);
//           rawSizes = uploadResults.map((res) => res.bytes);
//         } else if (textMessage) {
//           contentUrls = [textMessage];
//         }

//         const convertedSizes = convertSizes(rawSizes);

//         //  Find or create private conversation
//         let conversation = await ConversationHistory.findOne({
//           chatType: "private",
//           userIds: {
//             $all: [
//               { $elemMatch: { user: senderObjectId } },
//               { $elemMatch: { user: receiverObjectId } },
//             ],
//           },
//         });

//         if (!conversation) {
//           conversation = new ConversationHistory({
//             chatType: "private",
//             userIds: [{ user: senderObjectId }, { user: receiverObjectId }],
//             messages: [],
//           });
//         }

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

//         // console.log(" Raw Message Object:", message);

//         //  Normalize message for frontend
//         const normalizedMessage = {
//           ...message,
//           image: messageType === "image" ? contentUrls : "",
//           file: messageType === "file" ? contentUrls : "",
//         };

//         // console.log(" Emitted to sender:", normalizedMessage);

//         //  Save to DB
//         conversation.messages.push(message);
//         await conversation.save();
//         console.log(" Message saved in DB");

//         // Emit to receiver if online
//         const isReceiverOnline = userSocketMap[receiverId];
//         const isSameChatOpen = openedChats[receiverId] === senderId.toString();

//         if (isReceiverOnline && isSameChatOpen) {
//           io.to(userSocketMap[receiverId]).emit(
//             "privateMessage",
//             normalizedMessage
//           );
//         } else {
//           // count update logic
//           const existing = conversation.unreadMessageCount.find((entry) =>
//             entry.user.equals(receiverObjectId)
//           );
//           if (existing) {
//             existing.count += 1;
//           } else {
//             conversation.unreadMessageCount.push({
//               user: receiverObjectId,
//               count: 1,
//             });
//           }
//         }

//         // Emit to sender (self)
//         socket.emit("privateMessage", normalizedMessage);
//         await conversation.save();
//         // console.log(" Message emitted to users:", normalizedMessage);
//       } catch (err) {
//         console.error(" Error saving message:", err);
//       }
//     });

//     socket.on("markMessagesAsRead", async ({ senderId, receiverId }) => {
//       try {
//         const receiverObjectId = new mongoose.Types.ObjectId(receiverId);
//         const conversation = await ConversationHistory.findOne({
//           chatType: "private",
//           userIds: {
//             $all: [
//               { $elemMatch: { user: new mongoose.Types.ObjectId(senderId) } },
//               { $elemMatch: { user: receiverObjectId } },
//             ],
//           },
//         });

//         if (!conversation) return;

//         conversation.messages.forEach((msg) => {
//           if (!msg.seenBy.includes(receiverObjectId)) {
//             msg.seenBy.push(receiverObjectId);
//           }
//         });

//         const unreadEntry = conversation.unreadMessageCount.find((entry) =>
//           entry.user.equals(receiverObjectId)
//         );
//         if (unreadEntry) unreadEntry.count = 0;

//         await conversation.save();
//       } catch (err) {
//         console.error("Error marking messages as read:", err);
//       }
//     });

//     //  TYPING
//     socket.on("typing", ({ receiverId, groupId, isTyping }) => {
//       // console.log(" Private message received:", message);
//       if (groupId) {
//         io.to(groupId).emit("groupTyping", { senderId: userId, isTyping });
//       } else {
//         const sock = userSocketMap[receiverId];
//         if (sock) {
//           io.to(sock).emit("typing", { senderId: userId, isTyping });
//         }
//       }
//     });

//     //  GROUP JOIN
//     socket.on("joinGroup", ({ groupId }) => {
//       socket.join(groupId);
//       console.log(` ${userId} joined group: ${groupId}`);
//     });

//     //  GROUP MESSAGE
//     socket.on("groupMessage", async (data) => {
//       console.log("📩 data --->/groupMessage", data);
//       const {
//         groupId,
//         senderId,
//         groupName,
//         textMessage,
//         base64Image = [],
//         base64File = [],
//         messageType,
//         fileName = [],
//         // fileSizes = [],
//       } = data;

//       try {
//         const senderObjectId = new mongoose.Types.ObjectId(senderId);
//         const groupObjectId = new mongoose.Types.ObjectId(groupId);

//         const conversation = await ConversationHistory.findOne({
//           chatType: "group",
//           groupId: groupObjectId,
//         });

//         if (!conversation) {
//           return socket.emit("error", { message: "Group not found" });
//         }

//         //  Get role of sender
//         const userInGroup = conversation.userIds.find(
//           (u) => u.user.toString() === senderId
//         );

//         if (!userInGroup) {
//           return socket.emit("error", {
//             message: "User not part of this group",
//           });
//         }

//         const role = userInGroup.role;

//         //If user is not part of group or blocked
//         if (!["admin", "subadmin", "member"].includes(role)) {
//           return socket.emit("error", {
//             message: "Not allowed to send messages",
//           });
//         }

//         let contentUrls = [];

//         if (Array.isArray(base64Image) && base64Image.length > 0) {
//           const imageUploadPromises = base64Image.map((img) =>
//             cloudinary.uploader.upload(img, { folder: "chat/images" })
//           );
//           const uploadResults = await Promise.all(imageUploadPromises);
//           contentUrls = uploadResults.map((res) => res.secure_url);
//         } else if (Array.isArray(base64File) && base64File.length > 0) {
//           const fileUploadPromises = base64File.map((file) =>
//             cloudinary.uploader.upload(file, {
//               folder: "chat/files",
//               resource_type: "auto",
//             })
//           );
//           const uploadResults = await Promise.all(fileUploadPromises);
//           contentUrls = uploadResults.map((res) => res.secure_url);
//         } else if (textMessage) {
//           contentUrls = [textMessage];
//         }

//         // let conversation = await ConversationHistory.findOne({
//         //   chatType: "group",
//         //   groupId: groupObjectId,
//         // });

//         if (!conversation) {
//           conversation = new ConversationHistory({
//             chatType: "group",
//             groupId,
//             createdBy,
//             groupName: groupName,
//             userIds: members.map((id) => ({
//               user: id,
//               role: "member",
//               addedAt: new Date(),
//             })),
//             messages: [],
//           });
//         }

//         // if (!conversation) {
//         //   console.error(
//         //     " Group conversation not found. Aborting message store."
//         //   );
//         //   return;
//         // }

//         const message = {
//           senderId: senderObjectId,
//           groupId: groupObjectId,
//           groupName,
//           type: messageType,
//           content: contentUrls,
//           fileName: fileName.length > 0 ? fileName : undefined,
//           text: textMessage || undefined,
//           seenBy: [senderObjectId],
//           createdAt: new Date(),
//         };

//         //  Normalize for group
//         const normalizedMessage = {
//           ...message,
//           image: messageType === "image" ? contentUrls : "",
//           file: messageType === "file" ? contentUrls : "",
//         };
//         console.log("normalizedMessage --->/Group Message", normalizedMessage);

//         conversation.messages.push(message);
//         await conversation.save();

//         // io.to(groupId).emit("groupMessage", normalizedMessage);
//         const emitRoom = groupId || conversation.groupId?.toString();
//         if (emitRoom) {
//           io.to(emitRoom).emit("groupMessage", normalizedMessage);
//         }
//       } catch (error) {
//         console.error("⚫Error in groupMessage:", error);
//       }
//     });

//     const openedChats = {}; // key: userId, value: chatUserId

//     // frontend thi emit karo:
//     socket.on("openChatWith", ({ userId, chatWithUserId }) => {
//       openedChats[userId] = chatWithUserId;
//     });

//     // disconnect par clean karo:
//     socket.on("disconnect", () => {
//       delete openedChats[userId];
//     });

//     //  DISCONNECT
//     socket.on("disconnect", () => {
//       delete userSocketMap[userId];
//       io.emit("getOnlineUsers", Object.keys(userSocketMap));
//       console.log("🔴User disconnected:", userId);
//     });
//   });
// }

// function getIO() {
//   return io;
// }

// module.exports = { initSocket, getIO };

const { Server } = require("socket.io");
const ConversationHistory = require("../model/Message-model");
const cloudinary = require("../utils/Cloudinary");
const mongoose = require("mongoose");

const userSocketMap = {}; // userId => socket.id
const openedChats = {}; // userId => currentChatId (private માટે receiverId, group માટે groupId)
let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e8,
  });

  io.on("connection", (socket) => {
    console.log("🟣 New socket connected:", socket.id);

    const userId = socket.handshake.query.userId;
    console.log("🟢 Connected userId:", userId);

    if (userId) {
      userSocketMap[userId] = socket.id;
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    // જ્યારે યુઝર કોઈ chat open કરે
    socket.on(
      "openChatWith",
      ({ userId, chatWithUserId, chatType, groupId }) => {
        if (chatType === "private") {
          openedChats[userId] = chatWithUserId; // receiver id
        } else if (chatType === "group") {
          openedChats[userId] = groupId; // group id
        }
        console.log(`👀 ${userId} opened chat with: ${openedChats[userId]}`);
      }
    );

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

        const convertSizes = (bytesArray) => {
          return bytesArray.map((bytes) => ({
            bytes,
            kb: (bytes / 1024).toFixed(2),
            mb: (bytes / (1024 * 1024)).toFixed(2),
          }));
        };

        let uploadedFileNames = Array.isArray(fileName) ? fileName : [];

        // File/Image upload logic
        if (Array.isArray(base64Image) && base64Image.length > 0) {
          const imageUploadPromises = base64Image.map((img) =>
            cloudinary.uploader.upload(img, { folder: "chat/images" })
          );
          const uploadResults = await Promise.all(imageUploadPromises);
          contentUrls = uploadResults.map((res) => res.secure_url);
          rawSizes = uploadResults.map((res) => res.bytes);
        } else if (Array.isArray(base64File) && base64File.length > 0) {
          const fileUploadPromises = base64File.map((file) =>
            cloudinary.uploader.upload(file, {
              folder: "chat/files",
              resource_type: "auto",
            })
          );
          const uploadResults = await Promise.all(fileUploadPromises);
          contentUrls = uploadResults.map((res) => res.secure_url);
          rawSizes = uploadResults.map((res) => res.bytes);
        } else if (textMessage) {
          contentUrls = [textMessage];
        }

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
            unreadMessageCount: [],
          });
        }

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

        // 🚨 મહત્વપૂર્ણ: Unread count logic
        const isReceiverOnline = userSocketMap[receiverId];
        const isReceiverChatOpen =
          openedChats[receiverId] === senderId.toString();

        // જો receiver online છે અને same chat open છે
        if (isReceiverOnline && isReceiverChatOpen) {
          // Message emit કરો, count વધારવાની જરૂર નથી
          io.to(userSocketMap[receiverId]).emit(
            "privateMessage",
            normalizedMessage
          );
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
            io.to(userSocketMap[receiverId]).emit(
              "privateMessage",
              normalizedMessage
            );
          }

          console.log(`📊 Unread count increased for ${receiverId}`);
        }

        // Sender ને message emit કરો
        socket.emit("privateMessage", normalizedMessage);

        await conversation.save();
        console.log("💾 Message saved in DB");
      } catch (err) {
        console.error("❌ Error saving private message:", err);
      }
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

        const userInGroup = conversation.userIds.find(
          (u) => u.user.toString() === senderId
        );

        if (
          !userInGroup ||
          !["admin", "subadmin", "member"].includes(userInGroup.role)
        ) {
          return socket.emit("error", {
            message: "Not allowed to send messages",
          });
        }

        let contentUrls = [];

        // File upload logic (same as private)
        if (Array.isArray(base64Image) && base64Image.length > 0) {
          const imageUploadPromises = base64Image.map((img) =>
            cloudinary.uploader.upload(img, { folder: "chat/images" })
          );
          const uploadResults = await Promise.all(imageUploadPromises);
          contentUrls = uploadResults.map((res) => res.secure_url);
        } else if (Array.isArray(base64File) && base64File.length > 0) {
          const fileUploadPromises = base64File.map((file) =>
            cloudinary.uploader.upload(file, {
              folder: "chat/files",
              resource_type: "auto",
            })
          );
          const uploadResults = await Promise.all(fileUploadPromises);
          contentUrls = uploadResults.map((res) => res.secure_url);
        } else if (textMessage) {
          contentUrls = [textMessage];
        }

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

        const normalizedMessage = {
          ...message,
          image: messageType === "image" ? contentUrls : "",
          file: messageType === "file" ? contentUrls : "",
        };

        conversation.messages.push(message);

        // 🚨 Group માટે unread count logic
        conversation.userIds.forEach((userObj) => {
          const userId = userObj.user.toString();

          // Sender માટે count વધારવાની જરૂર નથી
          if (userId === senderId) return;

          const isUserOnline = userSocketMap[userId];
          const isGroupChatOpen = openedChats[userId] === groupId;

          // જો user offline છે અથવા બીજી chat open છે તો count વધારો
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

        await conversation.save();

        // All group members ને message emit કરો
        io.to(groupId).emit("groupMessage", normalizedMessage);
        console.log("💾 Group message saved and emitted");
      } catch (error) {
        console.error("⚫Error in groupMessage:", error);
      }
    });

    // MARK MESSAGES AS READ - Private Chat
    socket.on("markMessagesAsRead", async ({ senderId, receiverId }) => {
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
          io.to(userSocketMap[senderId]).emit("messagesRead", {
            readBy: receiverId,
            chatType: "private",
          });
        }
      } catch (err) {
        console.error("❌ Error marking messages as read:", err);
      }
    });

    // MARK MESSAGES AS READ - Group Chat
    socket.on("markGroupMessagesAsRead", async ({ groupId, userId }) => {
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

    // TYPING
    socket.on("typing", ({ receiverId, groupId, isTyping }) => {
      if (groupId) {
        socket.to(groupId).emit("groupTyping", { senderId: userId, isTyping });
      } else {
        const sock = userSocketMap[receiverId];
        if (sock) {
          io.to(sock).emit("typing", { senderId: userId, isTyping });
        }
      }
    });

    // GROUP JOIN
    socket.on("joinGroup", ({ groupId }) => {
      socket.join(groupId);
      console.log(`👥 ${userId} joined group: ${groupId}`);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      delete userSocketMap[userId];
      delete openedChats[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
      console.log("🔴 User disconnected:", userId);
    });
  });
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
