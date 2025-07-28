const { userSocketMap, openedChats } = require("./socketmap");

class UnreadCountService {
  static handlePrivateUnreadCount(
    conversation,
    senderId,
    receiverId,
    receiverObjectId,
    normalizedMessage,
    io
  ) {
    try {
      const isReceiverOnline = userSocketMap[receiverId] !== undefined;
      const isReceiverChatOpen =
        openedChats[receiverId] === senderId.toString();

      console.log(`📊 Unread Logic Check:`);
      console.log(`   Receiver (${receiverId}) Online: ${isReceiverOnline}`);
      console.log(`   Current opened chat: ${openedChats[receiverId]}`);
      console.log(`   Sender ID: ${senderId}`);
      console.log(`   Chat Open with Sender: ${isReceiverChatOpen}`);

      // Case 1: Receiver online
      if (isReceiverOnline && isReceiverChatOpen) {
        // Message emit
        io.to(userSocketMap[receiverId]).emit(
          "privateMessage",
          normalizedMessage
        );
        console.log(
          "✅ Message delivered - No count increase (Same chat open)"
        );
        return false;
      }

      // Case 2: Receiver offline
      this.increaseUnreadCount(conversation, receiverObjectId);

      if (isReceiverOnline) {
        io.to(userSocketMap[receiverId]).emit(
          "privateMessage",
          normalizedMessage
        );
        console.log(
          "📱 Message delivered - Count increased (Different chat open)"
        );
      } else {
        console.log("📴 Message stored - Count increased (User offline)");
      }

      return true;
    } catch (error) {
      console.error("❌ Error in handlePrivateUnreadCount:", error);
      return false;
    }
  }

  static handleGroupUnreadCount(
    conversation,
    senderId,
    groupId,
    normalizedMessage,
    io
  ) {
    try {
      console.log(`📊 Group Unread Logic for Group: ${groupId}`);

      let countIncreased = 0;

      conversation.userIds.forEach((userObj) => {
        const userId = userObj.user.toString();

        if (userId === senderId) return;

        const isUserOnline = userSocketMap[userId] !== undefined;
        const isGroupChatOpen = openedChats[userId] === groupId;

        console.log(`👤 Checking user: ${userId}`);
        console.log(`   Online: ${isUserOnline}`);
        console.log(`   Opened Chat: ${openedChats[userId]}`);
        console.log(`   Group Chat Open: ${isGroupChatOpen}`);

        if (!isUserOnline || !isGroupChatOpen) {
          this.increaseUnreadCount(conversation, userObj.user);
          console.log(`📈 Unread count increased for ${userId}`);
          countIncreased++;
        } else {
          console.log(`✅ No unread count change for ${userId} (chat open)`);
        }

        // Emit group message only to online users
        if (isUserOnline) {
          io.to(userSocketMap[userId]).emit("groupMessage", normalizedMessage);
          console.log(`📨 Group message emitted to ${userId}`);
        }
      });

      console.log(
        `📈 Total group unread count increased for ${countIncreased} users`
      );
      return countIncreased;
    } catch (error) {
      console.error("❌ Error in handleGroupUnreadCount:", error);
      return 0;
    }
  }

  static increaseUnreadCount(conversation, userObjectId) {
    let unreadEntry = conversation.unreadMessageCount.find((entry) =>
      entry.user.equals(userObjectId)
    );

    if (unreadEntry) {
      unreadEntry.count += 1;
      console.log(
        `📊 Count increased to ${unreadEntry.count} for user ${userObjectId}`
      );
    } else {
      conversation.unreadMessageCount.push({
        user: userObjectId,
        count: 1,
      });
      console.log(`📊 New unread entry created for user ${userObjectId}`);
    }
  }

  static resetUnreadCount(conversation, userObjectId) {
    const unreadEntry = conversation.unreadMessageCount.find((entry) =>
      entry.user.equals(userObjectId)
    );

    if (unreadEntry) {
      const previousCount = unreadEntry.count;
      unreadEntry.count = 0;
      console.log(
        `📊 Unread count reset from ${previousCount} to 0 for user ${userObjectId}`
      );
      return previousCount;
    }

    return 0;
  }

  static getUnreadCount(conversation, userObjectId) {
    const unreadEntry = conversation.unreadMessageCount.find((entry) =>
      entry.user.equals(userObjectId)
    );

    return unreadEntry ? unreadEntry.count : 0;
  }

  static debugSocketStates() {
    console.log("🔍 Current Socket States:");
    console.log("   Online Users:", Object.keys(userSocketMap));
    console.log("   Opened Chats:", openedChats);
  }
}

module.exports = UnreadCountService;
