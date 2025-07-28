const User = require("../../model/User-model");
const sendEmailUtil = require("../../utils/Nodemailerutil");
const jwt = require("jsonwebtoken");

//verify-inviteduser
exports.invitedUsersverify = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token not provided" });
    }

    const JWT_SECRET = process.env.JWT_SECRET_KEY;
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ success: false, message: "JWT secret not configured" });
    }

    // 🔐 Token verification
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("Token verification failed:", err.message);
      const msg =
        err.name === "TokenExpiredError"
          ? "Token has expired"
          : "Token invalid or expired";
      return res.status(401).json({ success: false, message: msg });
    }

    const invitedUserId = decoded.id;
    const invitedUser = await User.findById(invitedUserId);

    if (!invitedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Invited user not found" });
    }

    // 🔍 Find inviter who invited this user
    const inviter = await User.findOne({
      "invitedUsers.user": invitedUser._id,
    });

    if (!inviter) {
      return res
        .status(404)
        .json({ success: false, message: "Inviter not found" });
    }

    // ✅ 1. Update inviter's invitedUsers[].invited_is_Confirmed = true
    await User.updateOne(
      { _id: inviter._id, "invitedUsers.user": invitedUser._id },
      { $set: { "invitedUsers.$.invited_is_Confirmed": true } }
    );

    // ✅ 2. Update invited user's confirmation flags
    invitedUser.is_Confirmed = true;
    invitedUser.invited_is_Confirmed = true;

    // ✅ 3. Prevent duplicate inviter in invitedUser.invitedBy[]
    if (!Array.isArray(invitedUser.invitedBy)) {
      invitedUser.invitedBy = [];
    }

    const alreadyExists = invitedUser.invitedBy.some((entry) => {
      return (
        entry._id.toString() === inviter._id.toString() &&
        entry.email.toLowerCase() === inviter.email.toLowerCase()
      );
    });

    if (!alreadyExists) {
      invitedUser.invitedBy.push({
        _id: inviter._id,
        email: inviter.email,
      });
    }

    await invitedUser.save();

    return res.status(200).json({
      success: true,
      message: "Invitation verified successfully!",
      invitedUser: {
        _id: invitedUser._id,
        email: invitedUser.email,
        invitedBy: invitedUser.invitedBy,
        is_Confirmed: invitedUser.is_Confirmed,
      },
    });
  } catch (error) {
    console.error("Error in verifyInvitedUser:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//invitedUsers
exports.invitedUsers = async (req, res) => {
  try {
    const inviterId = req.user._id;
    const rawEmail = req.body.email;
    const message = req.body.message || "";

    if (!rawEmail) {
      return res.status(400).json({ message: "Email is required." });
    }

    const email = rawEmail.trim().toLowerCase();

    let invitedUser = await User.findOne({ email });

    // Create new invited user if doesn't exist
    if (!invitedUser) {
      invitedUser = new User({
        email,
        invited_is_Confirmed: false,
        is_Confirmed: false,
      });
      await invitedUser.save();
    }

    const token = jwt.sign(
      { id: invitedUser._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    const link = `http://localhost:5173/contact/${token}`;

    await sendEmailUtil({
      to: email,
      subject: "You're Invited!",
      text: `Hi,\n\nYou've been invited to join our chat app.\n\nMessage: ${message}\nClick here to join: ${link}`,
    });

    const inviter = await User.findById(inviterId);
    if (!inviter) {
      return res.status(404).json({ message: "Inviter not found." });
    }

    // Add to inviter's invitedUsers[] only if not already invited
    const alreadyInvited = inviter.invitedUsers.some(
      (entry) =>
        entry.email === invitedUser.email ||
        (entry.user && entry.user.toString() === invitedUser._id.toString())
    );

    if (!alreadyInvited) {
      inviter.invitedUsers.push({
        user: invitedUser._id,
        email: invitedUser.email,
        invitationMessage: message,
        invited_is_Confirmed: false,
      });
      await inviter.save();
    }

    // DO NOT add to invitedUser.invitedBy[] here
    // That will happen in the confirmation controller only

    const updatedInviter = await User.findById(inviterId).populate(
      "invitedUsers.user",
      "email is_Confirmed"
    );

    res.status(200).json({
      message: "Invitation sent successfully.",
      invitedUsers: updatedInviter.invitedUsers,
    });
  } catch (error) {
    console.error("InvitedUsers Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error during invitedUsers." });
  }
};
