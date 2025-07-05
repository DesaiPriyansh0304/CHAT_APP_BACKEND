const mongoose = require("mongoose");

const URL = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(URL);
    console.log("db.js Connection Successfully");
  } catch (error) {
    console.error("db.js Connection fialed");
  }
};

module.exports = connectDB;
