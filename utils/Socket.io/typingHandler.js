const { userSocketMap } = require("./socketmap");

class TypingHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.handshake.query.userId;
  }

  handleTyping() {
    // TYPING
    this.socket.on("typing", ({ receiverId, groupId, isTyping }) => {
      if (groupId) {
        // Group typing indicator
        this.socket.to(groupId).emit("groupTyping", {
          senderId: this.userId,
          isTyping,
        });
      } else {
        // Private typing indicator
        const receiverSocket = userSocketMap[receiverId];
        if (receiverSocket) {
          this.io.to(receiverSocket).emit("typing", {
            senderId: this.userId,
            isTyping,
          });
        }
      }
    });
  }
}

module.exports = TypingHandler;
