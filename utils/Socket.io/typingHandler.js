function handleTyping(socket, userId, userSocketMap, io) {
  socket.on("typing", ({ receiverId, groupId, isTyping }) => {
    if (groupId) {
      io.to(groupId).emit("groupTyping", { senderId: userId, isTyping });
    } else {
      const sock = userSocketMap[receiverId];
      if (sock) {
        io.to(sock).emit("typing", { senderId: userId, isTyping });
      }
    }
  });
}

module.exports = { handleTyping };
