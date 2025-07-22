socket.on("openChatWith", ({ userId, chatWithUserId, chatType, groupId }) => {
  if (chatType === "private") {
    openedChats[userId] = chatWithUserId; // receiver id
  } else if (chatType === "group") {
    openedChats[userId] = groupId; // group id
  }
  console.log(`👀 ${userId} opened chat with: ${openedChats[userId]}`);
});
