// Global socket mappings
const userSocketMap = {}; // userId => socket.id
const openedChats = {}; // userId => currentChatId (private માટે receiverId, group માટે groupId)

module.exports = {
  userSocketMap,
  openedChats,
};
