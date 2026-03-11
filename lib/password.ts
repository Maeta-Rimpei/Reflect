import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

/** パスワードの最小文字数 */
export const PASSWORD_MIN_LENGTH = 8;

/** パスワード形式チェック（8文字以上・英字1文字以上・数字1文字以上） */
export function validatePasswordFormat(
  password: string,
): { ok: true } | { ok: false; message: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: "パスワードは8文字以上で入力してください。",
    };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return {
      ok: false,
      message: "パスワードに英字を1文字以上含めてください。",
    };
  }
  if (!/\d/.test(password)) {
    return {
      ok: false,
      message: "パスワードに数字を1文字以上含めてください。",
    };
  }
  return { ok: true };
}

/**
 * パスワードを scrypt でハッシュ化する（salt:derivedKey の形式）
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * パスワードとハッシュを比較する
 */
export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(
        crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey),
      );
    });
  });
}
