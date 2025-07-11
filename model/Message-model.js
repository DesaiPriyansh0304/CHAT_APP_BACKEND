// const mongoose = require("mongoose");

// const messageSubSchema = new mongoose.Schema(
//   {
//     messageId: {
//       type: mongoose.Schema.Types.ObjectId,
//       default: () => new mongoose.Types.ObjectId(),
//     },
//     senderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For private
//     type: { type: String, enum: ["text", "image", "file"], required: true },
//     content: [{ type: String }],
//     text: { type: String },
//     fileName: [{ type: String }],
//     fileSizes: [
//       {
//         bytes: Number,
//         kb: String,
//         mb: String,
//       },
//     ],
//     seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
//     createdAt: { type: Date, default: Date.now },
//   },
//   { _id: false }
// );

// const conversationHistorySchema = new mongoose.Schema(
//   {
//     chatType: { type: String, enum: ["private", "group"], required: true },
//     //user id
//     userIds: [
//       {
//         user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//         addedAt: { type: Date, default: Date.now },
//         role: {
//           type: String,
//           enum: ["admin", "subadmin", "member"],
//           default: "member",
//         },
//       },
//     ], // For private Chat
//     groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // For Group Chat
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     groupName: { type: String },
//     messages: [messageSubSchema],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model(
//   "ConversationHistory",
//   conversationHistorySchema
// );

const mongoose = require("mongoose");

// 📩 Message Sub-schema
const messageSubSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Private only
    type: { type: String, enum: ["text", "image", "file"], required: true },
    content: [{ type: String }],
    text: { type: String },
    fileName: [{ type: String }],
    fileSizes: [
      {
        bytes: Number,
        kb: String,
        mb: String,
      },
    ],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// 👥 Private Chat User Sub-schema
const privateUserSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

// 👥 Group Chat User Sub-schema
const groupUserSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    addedAt: { type: Date, default: Date.now },
    role: {
      type: String,
      enum: ["admin", "subadmin", "member"],
      default: "member",
    },
  },
  { _id: false }
);

// 🗃️ Main Conversation History Schema
const conversationHistorySchema = new mongoose.Schema(
  {
    chatType: { type: String, enum: ["private", "group"], required: true },

    // 👇 This will store either groupUserSchema or privateUserSchema
    userIds: {
      type: [mongoose.Schema.Types.Mixed], // Dynamic: you control the shape in logic
      default: [],
    },

    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // For group chats
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For group creation
    groupName: { type: String }, // Optional group name
    messages: [messageSubSchema], // All chat messages
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ConversationHistory",
  conversationHistorySchema
);
