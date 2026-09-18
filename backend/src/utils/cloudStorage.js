const cloudinary = require('cloudinary').v2;

function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function initCloudinary() {
  if (!isCloudinaryConfigured()) return false;
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
  return true;
}

async function uploadToCloudinary(buffer, options = {}) {
  initCloudinary();
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'paradise_gym/avatars',
        transformation: options.transformation || [
          { width: 500, height: 500, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        ...options
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url || result.url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes
        });
      }
    );
    uploadStream.end(buffer);
  });
}

module.exports = {
  isCloudinaryConfigured,
  uploadToCloudinary
};
