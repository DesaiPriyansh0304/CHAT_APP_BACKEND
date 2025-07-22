const { Server } = require("socket.io");
const { handlePrivateMessage } = require("./privateMessageHandler");
const { handleGroupMessage } = require("./groupMessageHandler");
const { handleTyping } = require("./typingHandler");
const { handleConnection } = require("./connectionHandler");
const { handleChatTracking } = require("./chatTrackingHandler");

const userSocketMap = {}; // userId => socket.id
const openedChats = {}; // key: userId, value: chatUserId
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

    // Connection handler
    handleConnection(socket, userId, userSocketMap, io);

    // Private message handler
    handlePrivateMessage(socket, userSocketMap, openedChats, io);

    // Group message handler
    handleGroupMessage(socket, io);

    // Typing handler
    handleTyping(socket, userId, userSocketMap, io);

    // Chat tracking handler
    handleChatTracking(socket, openedChats, userId);

    // Disconnect handler
    socket.on("disconnect", () => {
      delete userSocketMap[userId];
      delete openedChats[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
      console.log("🔴User disconnected:", userId);
    });
  });
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO, userSocketMap, openedChats };
