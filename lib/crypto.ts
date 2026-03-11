import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * サーバーサイド AES-256-GCM 暗号化
 * 環境変数 ENCRYPTION_KEY（hex 64文字 = 32バイト）を鍵として使用する。
 * 暗号文は「iv(hex):authTag(hex):ciphertext(hex)」の形式で保存する。
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended
const KEY_HEX = process.env.ENCRYPTION_KEY;

/**
 * 暗号化キーを取得する
 * @returns 暗号化キー
 */
function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32",
    );
  }
  return Buffer.from(KEY_HEX, "hex");
}

/**
 * 暗号化キーが設定されているかどうかを確認する
 * @returns 暗号化キーが設定されているかどうか
 */
export function isEncryptionConfigured(): boolean {
  return !!KEY_HEX && KEY_HEX.length === 64;
}

/**
 * 平文を暗号化する
 * @param plaintext - 暗号化する平文
 * @returns 暗号化された文字列
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * 暗号化された文字列を復号化する
 * @param ciphertext - 復号化する暗号化された文字列
 * @returns 復号化された平文
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    // 暗号化されていない平文（移行期間中の既存データ）
    return ciphertext;
  }
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
