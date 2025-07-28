const User = require("../model/User-model");
const sendEmail = require("../utils/Nodemailerutil");
const generateOtp = require("../utils/generateOTP");

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    //Email & OTP check
    if (!email) {
      return res.status(400).json({ message: "Email are required." });
    }
    if (!otp) {
      return res.status(400).json({ message: "OTP are required." });
    }

    //user by email & otp
    const user = await User.findOne({ email, otp });

    if (!user) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check OTP expiry
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res
        .status(400)
        .json({ message: "OTP has expired. Please resend." });
    }

    //Update isConfirmed and clear OTP
    user.is_Confirmed = true;
    user.otp = null; //remove otp after verification
    user.otpExpiresAt = null;
    await user.save();

    //Send success response
    res
      .status(200)
      .json({ message: "OTP verified successfully. Account activated." });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newOtp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

    user.otp = newOtp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send email with new OTP
    await sendEmail({
      to: email,
      subject: "Your New OTP Code",
      text: `Hi ${user.firstname},\n\nYour new OTP code is: ${newOtp}\n\nThis OTP is valid for 3 minutes.`,
    });

    res.status(200).json({
      success: true,
      message: "OTP resent successfully. Check your email.",
    });
  } catch (error) {
    console.error("OTP Resend Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
