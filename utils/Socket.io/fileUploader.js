const cloudinary = require("../Cloudinary");

const convertSizes = (bytesArray) => {
  return bytesArray.map((bytes) => ({
    bytes,
    kb: (bytes / 1024).toFixed(2),
    mb: (bytes / (1024 * 1024)).toFixed(2),
  }));
};

const uploadFiles = async ({
  base64Image,
  base64File,
  textMessage,
  fileName,
}) => {
  let contentUrls = [];
  let rawSizes = [];
  let uploadedFileNames = Array.isArray(fileName) ? fileName : [];

  try {
    // Image upload logic
    if (Array.isArray(base64Image) && base64Image.length > 0) {
      const imageUploadPromises = base64Image.map((img) =>
        cloudinary.uploader.upload(img, { folder: "chat/images" })
      );
      const uploadResults = await Promise.all(imageUploadPromises);
      contentUrls = uploadResults.map((res) => res.secure_url);
      rawSizes = uploadResults.map((res) => res.bytes);
    }
    // File upload logic
    else if (Array.isArray(base64File) && base64File.length > 0) {
      const fileUploadPromises = base64File.map((file) =>
        cloudinary.uploader.upload(file, {
          folder: "chat/files",
          resource_type: "auto",
        })
      );
      const uploadResults = await Promise.all(fileUploadPromises);
      contentUrls = uploadResults.map((res) => res.secure_url);
      rawSizes = uploadResults.map((res) => res.bytes);
    }
    // Text message
    else if (textMessage) {
      contentUrls = [textMessage];
    }

    return {
      contentUrls,
      rawSizes,
      uploadedFileNames,
    };
  } catch (error) {
    console.error("❌ Error uploading files:", error);
    throw error;
  }
};

module.exports = {
  convertSizes,
  uploadFiles,
};
