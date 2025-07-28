const { userSocketMap, openedChats } = require("./socketmap");

class ConnectionHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.handshake.query.userId;
  }

  handleConnection() {
    console.log("🟢 Connected userId:", this.userId);

    if (this.userId) {
      userSocketMap[this.userId] = this.socket.id;
      this.io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  }

  handleChatOpen() {
    // જ્યારે યુઝર કોઈ chat open કરે
    this.socket.on(
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
  }

  handleGroupJoin() {
    // GROUP JOIN
    this.socket.on("joinGroup", ({ groupId }) => {
      this.socket.join(groupId);
      console.log(`👥 ${this.userId} joined group: ${groupId}`);
    });
  }

  handleDisconnect() {
    // DISCONNECT
    this.socket.on("disconnect", () => {
      delete userSocketMap[this.userId];
      delete openedChats[this.userId];
      this.io.emit("getOnlineUsers", Object.keys(userSocketMap));
      console.log("🔴 User disconnected:", this.userId);
    });
  }
}

module.exports = ConnectionHandler;
