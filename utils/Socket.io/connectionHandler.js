function handleConnection(socket, userId, userSocketMap, io) {
  if (userId) {
    userSocketMap[userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  }
}

module.exports = { handleConnection };
