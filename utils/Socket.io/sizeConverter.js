function convertSizes(bytesArray) {
  return bytesArray.map((bytes) => ({
    bytes,
    kb: (bytes / 1024).toFixed(2), // 1 KB = 1024 bytes
    mb: (bytes / (1024 * 1024)).toFixed(2), // 1 MB = 1024 * 1024 bytes
  }));
}

module.exports = { convertSizes };
