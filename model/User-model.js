const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      require: true,
    },
    lastname: {
      type: String,
      require: true,
    },
    email: {
      type: String,
      require: true,
      unique: true,
    },
    mobile: {
      type: String,
      require: true,
    },
    dob: {
      type: Date,
      require: true,
    },
    gender: {
      type: String,
      require: true,
    },
    password: {
      type: String,
      require: true,
    },
    isadmin: {
      type: Boolean,
      default: false,
    },
    profile_avatar: {
      type: String,
    },
    bio: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    is_Confirmed: {
      type: Boolean,
      default: false,
    },
    invitedUsers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        email: String,
        invited_is_Confirmed: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
