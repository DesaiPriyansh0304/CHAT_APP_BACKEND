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
    console.log("req.body --->/", req.body);
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
