const User = require("../model/User-model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const conrdinary = require("../utils/Cloudinary");
const generateOtp = require("../utils/generateOTP");
const sendEmailUtil = require("../utils/Nodemailerutil");
const mongoose = require("mongoose");
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
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Email already exists.",
      });
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

    //invited by
    const inviter = await User.findOne({ "invitedUsers.email": email });
    if (inviter) {
      // Add invitedBy info to the new user
      userCreated.invitedBy = [
        {
          _id: inviter._id,
          email: inviter.email,
        },
      ];
      const invitedUser = inviter.invitedUsers.find((u) => u.email === email);
      if (invitedUser) {
        invitedUser.user = userCreated._id;
        invitedUser.invited_is_Confirmed = false;
      }
      await inviter.save();
    }

    await userCreated.save();

    // Send OTP email using utility
    await sendEmailUtil({
      to: email,
      subject: "Verify Your Email - OTP",
      text: `Hi ${firstname},\n\nYour OTP code is: ${otp}\n\nThis OTP is valid for 3 minutes.`,
    });

    // Send response
    res.status(201).json({
      status: 201,
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

    // Check if user exists
    const userExist = await User.findOne({ email });
    if (!userExist) {
      return res.status(400).json({
        status: 400,
        message: "Email/User Not Valid.",
      });
    }

    // Check if email is verified
    if (!userExist.is_Confirmed) {
      return res.status(403).json({
        status: 403,
        message:
          "Email not verified. Please verify your email before logging in.",
      });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, userExist.password);
    if (!isMatch) {
      return res.status(400).json({
        status: 400,
        message: "Invalid Password.",
      });
    }

    // Successful login response
    res.status(200).json({
      status: 200,
      success: true,
      message: "Login successful",
      userData: userExist,
      token: generateToken(userExist),
      userId: userExist._id.toString(),
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error during login.",
    });
  }
};

{
  /*controller to checked if user is authnticated*/
}
exports.checkAuth = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password -otp");
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "User authenticated",
      user,
    });
  } catch (err) {
    console.error("🔴 Error in checkAuth:", err.message);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Server Error",
    });
  }
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

// Invited-UserData
exports.getinvitedByUser = async (req, res) => {
  try {
    const searchQuery = (req.query.search || "").toLowerCase(); // search from query
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔹 1. Fetch invitedBy users
    let invitedByUsers = await Promise.all(
      (user.invitedBy || []).map(async (inviter) => {
        if (inviter._id && mongoose.Types.ObjectId.isValid(inviter._id)) {
          return await User.findById(inviter._id).select(
            "firstname lastname email profile_avatar bio gender mobile dob isadmin is_Confirmed"
          );
        }
        return null;
      })
    );

    invitedByUsers = invitedByUsers.filter((u) => u !== null); // Remove nulls

    // 🔹 2. Filter invitedBy users by searchQuery
    if (searchQuery) {
      invitedByUsers = invitedByUsers.filter((u) => {
        const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
        return (
          fullName.includes(searchQuery) ||
          u.email.toLowerCase().includes(searchQuery)
        );
      });
    }

    // 🔹 3. Fetch invitedUsers
    let invitedUsersWithDetails = await Promise.all(
      (user.invitedUsers || []).map(async (invitedUser) => {
        let populatedUser = null;

        if (
          invitedUser.user &&
          mongoose.Types.ObjectId.isValid(invitedUser.user)
        ) {
          populatedUser = await User.findById(invitedUser.user).select(
            "firstname lastname email profile_avatar bio is_Confirmed gender mobile dob isadmin"
          );
        }

        return {
          _id: invitedUser._id,
          email: invitedUser.email,
          invited_is_Confirmed: invitedUser.invited_is_Confirmed,
          invitationMessage: invitedUser.invitationMessage,
          user: populatedUser,
        };
      })
    );

    // 🔹 4. Filter invitedUsers by searchQuery (based on user field)
    if (searchQuery) {
      invitedUsersWithDetails = invitedUsersWithDetails.filter((entry) => {
        const u = entry.user;
        if (!u) return false;

        const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
        return (
          fullName.includes(searchQuery) ||
          u.email.toLowerCase().includes(searchQuery)
        );
      });
    }

    // ✅ Final Response
    res.status(200).json({
      message: "User and invitation data fetched successfully.",
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        profile_avatar: user.profile_avatar,
        bio: user.bio,
        is_Confirmed: user.is_Confirmed,
        gender: user.gender,
        mobile: user.mobile,
        dob: user.dob,
        isadmin: user.isadmin,
      },
      invitedBy: invitedByUsers,
      invitedUsers: invitedUsersWithDetails,
    });
  } catch (error) {
    console.error("getinvitedByUser Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//getdbUserdata
exports.getdbUserdata = async (req, res) => {
  try {
    const loginUserId = req.user._id.toString();

    const loginUser = await User.findById(loginUserId).select(
      "invitedUsers invitedBy"
    );

    const invitedUserIds = loginUser.invitedUsers.map((invite) =>
      invite.user.toString()
    );

    const invitedByIds = loginUser.invitedBy.map((invite) =>
      invite._id.toString()
    );

    const excludeIds = [loginUserId, ...invitedUserIds, ...invitedByIds];

    // 🔍 Search query
    const searchQuery = req.query.search || "";
    const searchRegex = new RegExp(searchQuery, "i");

    // 🔎 Mongo query
    const filter = {
      _id: { $nin: excludeIds },
    };

    if (searchQuery.trim()) {
      filter.$or = [
        { firstname: { $regex: searchRegex } },
        { lastname: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
    }

    const otherUsers = await User.find(filter).select(
      "-password -otp -otpExpiresAt"
    );

    res.status(200).json(otherUsers);
  } catch (error) {
    console.error("❌ Error in getdbUserdata:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

//favoriteItem
exports.favorite = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("✌️userId --->", userId);

    const { messageId, chatType, content, type } = req.body;
    console.log("✌️req.body --->", req.body);
    console.log("✅ userId:", userId);
    console.log("✅ req.body:", req.body);
    console.log("✅ messageId:", messageId);
    console.log("✅ chatType:", chatType);
    console.log("✅ type:", type);
    console.log("✅ content:", content);

    // if (!messageId || !chatType || !type) {
    //   return res.status(400).json({ msg: "All fields are required" });
    // }
    if (!messageId)
      return res.status(400).json({ msg: "messageId is required" });
    if (!chatType) return res.status(400).json({ msg: "chatType is required" });
    if (!type) return res.status(400).json({ msg: "type is required" });

    // Avoid duplicate entries
    const user = await User.findById(userId);
    const alreadyFavorited = user.isFavorite.some(
      (fav) => fav.messageId.toString() === messageId
    );

    if (alreadyFavorited) {
      return res.status(400).json({ msg: "Message already in favorites" });
    }

    await User.findByIdAndUpdate(userId, {
      $push: {
        isFavorite: {
          messageId,
          chatType,
          content,
          type,
        },
      },
    });

    res.status(200).json({ msg: "Message added to favorites" });
  } catch (error) {
    console.error("Favorite Error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
  ``;
};

//SerchUser/
exports.SearchUser = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Case-insensitive partial match in firstname, lastname, or email
    const users = await User.find({
      $or: [
        { firstname: { $regex: query, $options: "i" } },
        { lastname: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("firstname lastname email profile_avatar"); // select only needed fields

    res.status(200).json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getfilterByUser = async (req, res) => {
  try {
    const { filter, searchQuery } = req.body; // include searchQuery
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get invited users and populate details
    const invitedUsersWithDetails = await Promise.all(
      (user.invitedUsers || []).map(async (invitedUser) => {
        try {
          let populatedUser = null;

          if (
            invitedUser.user &&
            mongoose.Types.ObjectId.isValid(invitedUser.user)
          ) {
            populatedUser = await User.findById(invitedUser.user).select(
              "firstname lastname email profile_avatar bio is_Confirmed gender mobile dob isadmin"
            );
          }

          return {
            _id: invitedUser._id,
            email: invitedUser.email,
            invited_is_Confirmed: invitedUser.invited_is_Confirmed,
            invitationMessage: invitedUser.invitationMessage || null,
            user: populatedUser,
          };
        } catch (err) {
          console.error("Error fetching invited user:", err);
          return {
            _id: invitedUser._id,
            email: invitedUser.email,
            invited_is_Confirmed: invitedUser.invited_is_Confirmed,
            invitationMessage: invitedUser.invitationMessage || null,
            user: null,
          };
        }
      })
    );

    // Filter invited users
    let filtered = [];
    if (filter === "verify") {
      filtered = invitedUsersWithDetails.filter(
        (u) => u.invited_is_Confirmed === true && u.user === null
      );
    } else if (filter === "unverify") {
      filtered = invitedUsersWithDetails.filter(
        (u) => u.invited_is_Confirmed === false && u.user === null
      );
    } else if (filter === "pending") {
      filtered = invitedUsersWithDetails.filter(
        (u) => u.invited_is_Confirmed === false && u.user !== null
      );
    } else {
      filtered = invitedUsersWithDetails;
    }

    // Apply search on filtered users
    let finalResult = filtered;

    if (searchQuery && searchQuery.trim() !== "") {
      const searchTerms = searchQuery.toLowerCase().split(" ").filter(Boolean);

      finalResult = filtered.filter((u) => {
        const userObj = u.user;

        let valuesToSearch = [];

        if (filter === "verify" || filter === "unverify") {
          valuesToSearch = [u.email?.toLowerCase() || ""];
        } else if (filter === "pending") {
          valuesToSearch = [
            u.email?.toLowerCase() || "",
            userObj?.firstname?.toLowerCase() || "",
            userObj?.lastname?.toLowerCase() || "",
          ];
        } else {
          // fallback for "all"
          valuesToSearch = [
            u.email?.toLowerCase() || "",
            userObj?.firstname?.toLowerCase() || "",
            userObj?.lastname?.toLowerCase() || "",
            userObj?.gender?.toLowerCase() || "",
          ];
        }

        return searchTerms.every((term) =>
          valuesToSearch.some((field) => field.includes(term))
        );
      });
    }

    return res.status(200).json({
      message: "Filtered invited users fetched successfully.",
      filter: filter || "all",
      searchQuery: searchQuery || null,
      users: finalResult,
    });
  } catch (error) {
    console.error("getFilteredInvitedUsers Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.onlineByUser = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds must be an array" });
    }

    const users = await User.find({ _id: { $in: userIds } }).select(
      "_id firstName lastName avatar"
    );

    res.status(200).json({ users });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ error: "Server error" });
  }
};
