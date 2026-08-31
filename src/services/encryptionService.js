const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

function encrypt(text, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), tag: tag.toString('hex'), salt: salt.toString('hex') };
}

function decrypt(encryptedData, password) {
  const { encrypted, iv, tag, salt } = encryptedData;
  const key = deriveKey(password, Buffer.from(salt, 'hex'));
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateApiKey() {
  return `eb_${crypto.randomBytes(24).toString('base64url')}`;
}

module.exports = { encrypt, decrypt, hash, generateKeyPair, generateSessionToken, generateApiKey };
