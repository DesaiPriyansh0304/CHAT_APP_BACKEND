const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;

{
  /*size in files*/
}
// cloudinary.uploader
//   .upload("path/to/file.jpg", {
//     resource_type: "image",
//     folder: "chat/images",
//   })
//   .then((result) => {
//     const fileSizeBytes = result.bytes;
//     const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
//     console.log(`✅ File uploaded: ${result.secure_url}`);
//     console.log(`📦 File size: ${fileSizeBytes} bytes (${fileSizeMB} MB)`);
//   })
//   .catch((error) => {
//     console.error("❌ Upload failed:", error);
//   });
