function handleChatTracking(socket, openedChats, userId) {
  socket.on("openChatWith", ({ userId, chatWithUserId }) => {
    openedChats[userId] = chatWithUserId;
  });
}

module.exports = { handleChatTracking };
