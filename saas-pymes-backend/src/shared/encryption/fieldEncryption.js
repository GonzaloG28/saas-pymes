// shared/encryption/fieldEncryption.js
//
// Cifrado AES-256-GCM a nivel de campo.
// Solo el servidor con FIELD_ENCRYPTION_KEY puede leer los datos financieros.
// Formato almacenado: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES  = 12; // 96 bits — recomendado para GCM

function getKey() {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error('FIELD_ENCRYPTION_KEY no definida');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32)
    throw new Error('FIELD_ENCRYPTION_KEY debe ser de 32 bytes (64 chars hex)');
  return key;
}

export function encrypt(value) {
  if (value === undefined || value === null) return value;
  const key       = getKey();
  const iv        = crypto.randomBytes(IV_BYTES);
  const cipher    = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(stored) {
  if (!stored) return stored;
  const [ivHex, tagHex, cipherHex] = stored.split(':');
  if (!ivHex || !tagHex || !cipherHex)
    throw new Error('Formato de campo cifrado inválido');
  const key      = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

export function decryptNumber(stored) {
  const str = decrypt(stored);
  return str != null ? Number(str) : str;
}
