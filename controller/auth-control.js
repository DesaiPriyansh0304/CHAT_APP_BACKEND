const User = require("../model/User-model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
// const { formatDate } = require("../utils/UtcDate");
const conrdinary = require("../utils/Cloudinary");
const generateOtp = require("../utils/generateOTP");
const sendEmailUtil = require("../utils/Nodemailerutil");
const jwt = require("jsonwebtoken");

{
  /*Register Section*/
}
exports.Register = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      mobile,
      dob,
      gender,
      password,
      profile_avatar,
    } = req.body;

    // Check if user already exists
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "Email already exists." });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userCreated = await User.create({
      firstname,
      lastname,
      email,
      mobile,
      dob,
      gender,
      password: hashedPassword,
      profile_avatar,
      otp,
      otpExpiresAt,
      is_Confirmed: false,
    });

    // Send OTP email using utility
    await sendEmailUtil({
      to: email,
      subject: "Verify Your Email - OTP",
      text: `Hi ${firstname},\n\nYour OTP code is: ${otp}\n\nThis OTP is valid for 3 minutes.`,
    });

    // Send response
    res.status(201).json({
      success: true,
      msg: "SignUp Successful. OTP sent to your email.Please verify",
      // data: userCreated,
      userId: userCreated._id.toString(),
    });
  } catch (error) {
    console.error("Register Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error during registration." });
  }
};

{
  /*Login Section*/
}
exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // console.log("req.body --->/Login/SignIn//auth-controller", req.body);

    //email in valide
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res.status(400).json({ message: "Email/Uses Not Valide." });
    }

    //Compare hashed password
    const isMatch = await bcrypt.compare(password, userExist.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Password." });
    }

    //verifid email in nodemailer

    //Response Data
    res.status(201).json({
      msg: "SignIn Successful",
      success: true,
      data: userExist,
      token: generateToken(userExist),
      userId: userExist._id.toString(),
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error  Login/signIn" });
  }
};

{
  /*controller to checked if user is authnticated*/
}
exports.checkAuth = async (req, res) => {
  res.status(201).json({ success: true, decoded: req.user });
};

// get only login user data
exports.GetLoginuserData = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "-password -otp -otpExpiresAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "User fetched successfully.",
      user,
    });
  } catch (error) {
    console.error("GetLoginuserData Error:", error);
    res.status(500).json({ message: "Internal server error GetLoginuserData" });
  }
};

{
  /*update to user profile deatil*/
}
exports.updateProfile = async (req, res) => {
  try {
    const { profile_avatar, bio, firstname, lastname, mobile, dob, gender } =
      req.body;
    const userId = req.user.userId;
    // console.log("userId/upadte/auth controler --->", userId);
    // console.log(" Full req.user:", req.user);

    const existingUser = await User.findById(userId);
    console.log("Existing user before update:", existingUser);
    let updateUser;
    // console.log("✌️updateUser --->", updateUser);

    if (!profile_avatar) {
      await User.findByIdAndUpdate(
        userId,
        { bio, firstname, lastname, mobile, dob, gender },
        { new: true }
      );
    } else {
      const upload = await conrdinary.uploader.upload(profile_avatar);
      updateUser = await User.findByIdAndUpdate(
        userId,
        {
          profile_avatar: upload.secure_url,
          bio,
          firstname,
          lastname,
          mobile,
          dob,
          gender,
        },
        { new: true }
      );
      // console.log("updateUser --->auth controller", updateUser);
      res.status(201).json({ success: true, user: updateUser });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error  updateProfile" });
  }
};

//get all user data
exports.GetAlluserData = async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error GetAllUserdata" });
  }
};

//forgetpassword
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const otp = generateOtp();
    const otpExpiresAt = Date.now() + 3 * 60 * 1000;

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    await sendEmailUtil({
      to: user.email,
      subject: "Reset Password OTP",
      text: `Your OTP to reset password is: ${otp}. It is valid for 3 minutes.`,
    });

    return res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong.", error });
  }
};

//resetpassword
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword)
    return res.status(400).json({ message: "All fields are required." });

  try {
    const user = await User.findOne({ email });

    if (!user || !user.otp || user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP or user." });

    if (user.otpExpiresAt < Date.now())
      return res.status(400).json({ message: "OTP expired." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiresAt = null;

    await user.save();

    await sendEmailUtil({
      to: user.email,
      subject: "Password Reset Successful",
      text: `Hi ${user.firstname}, your password was successfully reset.`,
    });

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password.", error });
  }
};

//invitedUsers
exports.invitedUsers = async (req, res) => {
  try {
    const inviterId = req.user._id;
    const { email, message } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Find or create invited user
    let invitedUser = await User.findOne({ email });

    // ✅ If user doesn't exist, create new
    if (!invitedUser) {
      invitedUser = new User({
        email: email.toLowerCase(),
        invited_is_Confirmed: false,
      });
      await invitedUser.save();
    }

    // ✅ Send email even if is_Confirmed = true
    const token = jwt.sign(
      { id: invitedUser._id },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );

    const link = `http://localhost:5173/contact/${token}`;

    await sendEmailUtil({
      to: email,
      subject: "You're Invited!",
      text: `Hi,\n\nYou've been invited to join our chat app.\n\nMessage: ${message}\nClick here to join: ${link}`,
    });

    // ✅ Add to inviter's invitedUsers list if not already added
    const inviter = await User.findById(inviterId);
    if (!inviter) {
      return res.status(404).json({ message: "Inviter not found." });
    }

    const alreadyExists = inviter.invitedUsers.some(
      (entry) =>
        entry.email === invitedUser.email ||
        (entry.user && entry.user.toString() === invitedUser._id.toString())
    );

    if (!alreadyExists) {
      inviter.invitedUsers.push({
        user: invitedUser._id,
        email: invitedUser.email,
        is_Confirmed: invitedUser.is_Confirmed,
      });

      await inviter.save();
    }

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
    res.status(500).json({
      message: "Internal server error during invitedUsers.",
    });
  }
};

//verify-inviteduser
exports.invitedUsersverify = async (req, res) => {
  try {
    const { token } = req.body;
    // console.log("✌️req.body --->", req.body);

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token not provided" });
    }

    const JWT_SECRET = process.env.JWT_SECRET_KEY;
    if (!JWT_SECRET) {
      console.error("JWT_SECRET_KEY not defined in env");
      return res
        .status(500)
        .json({ success: false, message: "Server config error" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("Token verification failed:", err.message);
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ success: false, message: "Token has expired" });
      }
      return res
        .status(401)
        .json({ success: false, message: "Token invalid or expired" });
    }

    const invitedUserId = decoded.id;

    const invitedUser = await User.findById(invitedUserId);
    if (!invitedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const inviter = await User.findOne({
      "invitedUsers.user": invitedUser._id,
    });
    if (!inviter) {
      return res
        .status(404)
        .json({ success: false, message: "Inviter not found" });
    }
    const updated = await User.updateOne(
      {
        _id: inviter._id,
        "invitedUsers.user": invitedUser._id,
      },
      {
        $set: {
          "invitedUsers.$.invited_is_Confirmed": true,
        },
      }
    );

    invitedUser.is_Confirmed = true;
    await invitedUser.save();

    // Optional: Confirm invited user
    await User.findByIdAndUpdate(invitedUserId, { is_Confirmed: true });

    return res
      .status(200)
      .json({ success: true, message: "Invitation verified successfully!" });
  } catch (error) {
    console.error(" Error in verifyInvitedUser:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// auth-control.js
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error("getUserById Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
