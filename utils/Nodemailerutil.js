const nodemailer = require("nodemailer");

const sendEmailUtil = async ({ to, subject, text }) => {
  // Transporter setup
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Mail options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  // Send email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmailUtil;
