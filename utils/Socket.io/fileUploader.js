const cloudinary = require("../../utils/Cloudinary");

async function uploadFiles(base64Image, base64File, textMessage) {
  let contentUrls = [];
  let rawSizes = [];

  if (Array.isArray(base64Image) && base64Image.length > 0) {
    const imageUploadPromises = base64Image.map((img) =>
      cloudinary.uploader.upload(img, { folder: "chat/images" })
    );
    const uploadResults = await Promise.all(imageUploadPromises);
    contentUrls = uploadResults.map((res) => res.secure_url);
    rawSizes = uploadResults.map((res) => res.bytes);
  } else if (Array.isArray(base64File) && base64File.length > 0) {
    const fileUploadPromises = base64File.map((file) =>
      cloudinary.uploader.upload(file, {
        folder: "chat/files",
        resource_type: "auto",
      })
    );
    const uploadResults = await Promise.all(fileUploadPromises);
    contentUrls = uploadResults.map((res) => res.secure_url);
    rawSizes = uploadResults.map((res) => res.bytes);
  } else if (textMessage) {
    contentUrls = [textMessage];
  }

  return { contentUrls, rawSizes };
}

module.exports = { uploadFiles };
