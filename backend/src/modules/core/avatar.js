const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { transaction } = require('../../db/postgres');
const { route, role, only, fail, audit } = require('./http');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../../utils/cloudStorage');
const router = express.Router();
const storage = path.resolve(process.env.AVATAR_STORAGE_DIR || path.join(__dirname, '../../../storage/avatars'));

router.post('/avatar/upload', route(async req => {
  role(req, 'QTV', 'RECEPTIONIST', 'MEMBER', 'PT');
  only(req.body, ['content_base64', 'mime_type']);
  const value = req.body.content_base64;
  if (typeof value !== 'string' || value.length > 6990510 || !value.length || value.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    fail(400, 'Dữ liệu ảnh không hợp lệ hoặc vượt quá 5 MB.');
  }
  const data = Buffer.from(value, 'base64');
  if (!data.length || data.length > 5 * 1024 * 1024) {
    fail(400, 'Ảnh phải có kích thước tối đa 5 MB.');
  }
  const type = req.body.mime_type;
  const png = type === 'image/png' && data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && data.toString('ascii', 12, 16) === 'IHDR';
  const jpg = type === 'image/jpeg' && data.length >= 4 && data[0] === 255 && data[1] === 216 && data[data.length - 2] === 255 && data[data.length - 1] === 217;
  const webp = type === 'image/webp' && data.length >= 16 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpg && !webp) {
    fail(400, 'Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP đúng định dạng.');
  }

  let url;
  if (isCloudinaryConfigured()) {
    try {
      const result = await uploadToCloudinary(data, {
        folder: 'paradise_gym/avatars',
        public_id: `avatar_${req.user.account_id}_${Date.now()}`
      });
      url = result.url;
    } catch (uploadErr) {
      console.error('Cloudinary upload error, falling back to local storage:', uploadErr);
    }
  }

  if (!url) {
    const filename = randomUUID() + (png ? '.png' : jpg ? '.jpg' : '.webp');
    const destination = path.join(storage, filename);
    const origin = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
    url = new URL(`/uploads/avatars/${filename}`, origin).href;
    await fs.mkdir(storage, { recursive: true });
    await fs.writeFile(destination, data, { flag: 'wx' });
  }

  if (url.length > 500) fail(400, 'URL ảnh vượt quá giới hạn lưu trữ.');
  return { avatar_url: url, mime_type: type, size_bytes: data.length };
}));

router.post('/mobile/avatar', route(async req => {
  role(req, 'MEMBER', 'PT');
  only(req.body, ['content_base64', 'mime_type']);
  const value = req.body.content_base64;
  if (typeof value !== 'string' || value.length > 6990510 || !value.length || value.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    fail(400, 'Dữ liệu ảnh không hợp lệ hoặc vượt quá 5 MB.');
  }
  const data = Buffer.from(value, 'base64');
  if (!data.length || data.length > 5 * 1024 * 1024) {
    fail(400, 'Ảnh phải có kích thước tối đa 5 MB.');
  }
  const type = req.body.mime_type;
  const png = type === 'image/png' && data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && data.toString('ascii', 12, 16) === 'IHDR';
  const jpg = type === 'image/jpeg' && data.length >= 4 && data[0] === 255 && data[1] === 216 && data[data.length - 2] === 255 && data[data.length - 1] === 217;
  const webp = type === 'image/webp' && data.length >= 16 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if (!png && !jpg && !webp) {
    fail(400, 'Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP đúng định dạng.');
  }

  let url;
  let destination = null;

  if (isCloudinaryConfigured()) {
    try {
      const result = await uploadToCloudinary(data, {
        folder: 'paradise_gym/avatars',
        public_id: `avatar_${req.user.account_id}_${Date.now()}`
      });
      url = result.url;
    } catch (uploadErr) {
      console.error('Cloudinary upload error, falling back to local storage:', uploadErr);
    }
  }

  if (!url) {
    // Fallback or default to local storage
    const filename = randomUUID() + (png ? '.png' : jpg ? '.jpg' : '.webp');
    destination = path.join(storage, filename);
    const origin = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
    url = new URL(`/uploads/avatars/${filename}`, origin).href;
    await fs.mkdir(storage, { recursive: true });
    await fs.writeFile(destination, data, { flag: 'wx' });
  }

  if (url.length > 500) fail(400, 'URL ảnh vượt quá giới hạn lưu trữ.');

  try {
    await transaction(async db => {
      if (req.user.active_role === 'MEMBER') {
        const previous = (await db.query('SELECT avatar_url FROM member_profiles WHERE id=$1 FOR UPDATE', [req.user.member_profile_id])).rows[0];
        if (!previous) fail(404, 'Không tìm thấy hồ sơ hội viên.');
        await db.query('UPDATE member_profiles SET avatar_url=$2, updated_at=NOW() WHERE id=$1', [req.user.member_profile_id, url]);
        await db.query('UPDATE accounts SET avatar_url=$2, updated_at=NOW() WHERE id=$1', [req.user.account_id, url]);
        await audit(db, req, 'member_profiles', req.user.member_profile_id, 'AVATAR_UPDATED', previous, { avatar_url: url }, req.user.branch_ids[0]);
      } else if (req.user.active_role === 'PT') {
        const previous = (await db.query('SELECT avatar_url FROM accounts WHERE id=$1 FOR UPDATE', [req.user.account_id])).rows[0];
        if (!previous) fail(404, 'Không tìm thấy tài khoản huấn luyện viên.');
        await db.query('UPDATE accounts SET avatar_url=$2, updated_at=NOW() WHERE id=$1', [req.user.account_id, url]);
        await audit(db, req, 'pt_profiles', req.user.pt_profile_id, 'AVATAR_UPDATED', previous, { avatar_url: url }, req.user.branch_ids[0]);
      }
    });
  } catch (error) {
    if (destination) await fs.unlink(destination).catch(() => {});
    throw error;
  }

  return { avatar_url: url, mime_type: type, size_bytes: data.length };
}));

module.exports = { router, storage };
