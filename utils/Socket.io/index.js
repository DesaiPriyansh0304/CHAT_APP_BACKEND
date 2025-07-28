const { Server } = require("socket.io");
const ConnectionHandler = require("./connectionHandler");
const PrivateMessageHandler = require("./privateMessageHandler");
const GroupMessageHandler = require("./groupMessageHandler");
const ReadReceiptsHandler = require("./Readhandle");
const TypingHandler = require("./typingHandler");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e8,
  });

  io.on("connection", (socket) => {
    console.log("🟣 New socket connected:", socket.id);

    // Initialize handlers
    const connectionHandler = new ConnectionHandler(io, socket);
    const privateMessageHandler = new PrivateMessageHandler(io, socket);
    const groupMessageHandler = new GroupMessageHandler(io, socket);
    const readReceiptsHandler = new ReadReceiptsHandler(io, socket);
    const typingHandler = new TypingHandler(io, socket);

    // Connection events
    connectionHandler.handleConnection();
    connectionHandler.handleChatOpen();
    connectionHandler.handleGroupJoin();
    connectionHandler.handleDisconnect();

    // Message events
    privateMessageHandler.handlePrivateMessage();
    groupMessageHandler.handleGroupMessage();

    // Read receipts events
    readReceiptsHandler.handleMarkAsRead();
    readReceiptsHandler.handleMarkGroupAsRead();

    // Typing events
    typingHandler.handleTyping();
  });
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
