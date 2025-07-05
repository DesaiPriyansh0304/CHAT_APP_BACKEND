const mongoose = require("mongoose");

const messageSubSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For private
    type: { type: String, enum: ["text", "image", "file"], required: true },
    content: [{ type: String }],
    text: { type: String },
    fileName: { type: String },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationHistorySchema = new mongoose.Schema(
  {
    chatType: { type: String, enum: ["private", "group"], required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For private Chat
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // For Group Chat
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupName: { type: String },
    messages: [messageSubSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ConversationHistory",
  conversationHistorySchema
);
