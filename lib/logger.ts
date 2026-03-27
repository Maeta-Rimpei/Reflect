/**
 * サーバー側ロガー。エラー時など要所でログをファイル＋コンソールに出力する。
 * ログファイル: LOG_DIR が設定されている場合のみファイルに追記（未設定時はコンソールのみ）。
 */

import fs from "fs";
import path from "path";

/** ログレベル一覧（低→高）。LOG_LEVEL でこのいずれかを指定する。 */
const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

/** 最小出力レベル（これ未満のレベルは出さない）。未設定時は info。 */
const MIN_LEVEL_INDEX = LOG_LEVELS.indexOf(
  (process.env.LOG_LEVEL as LogLevel) || "info"
);

/**
 * ログ出力先ディレクトリを解決する。LOG_DIR 未設定なら null。
 * @returns 絶対パス、または null
 */
function resolveLogDir(): string | null {
  const dir = process.env.LOG_DIR;
  if (!dir || typeof dir !== "string") return null;
  const resolved = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  try {
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  } catch {
    return null;
  }
}

/** ログファイルを書き出すディレクトリ（null のときはファイル出力なし） */
const logDir = resolveLogDir();

/** ログレベルを数値インデックスに変換（レベル比較用） */
function levelIndex(level: LogLevel): number {
  return LOG_LEVELS.indexOf(level);
}

/** 1行分のログ文字列を組み立てる（タイムスタンプ + レベル + メッセージ + メタ） */
function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const metaStr =
    meta !== undefined
      ? " " + (typeof meta === "string" ? meta : JSON.stringify(meta))
      : "";
  return `${ts} [${level.toUpperCase()}] ${message}${metaStr}\n`;
}

/** ログを日付別ファイル（app-YYYY-MM-DD.log）に追記する。失敗時は stderr にのみ出す（無限ループ防止）。 */
function writeToFile(level: LogLevel, message: string, meta?: unknown): void {
  if (!logDir || levelIndex(level) < MIN_LEVEL_INDEX) return;
  const line = formatMessage(level, message, meta);
  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(logDir, `app-${date}.log`);
  try {
    fs.appendFileSync(filePath, line, "utf8");
  } catch (err) {
    process.stderr.write(`[logger] ログファイルへの書き込みに失敗しました: ${filePath}: ${err}\n`);
  }
}

/** コンソールとファイルの両方に出力する共通処理 */
function log(level: LogLevel, message: string, meta?: unknown): void {
  if (levelIndex(level) < MIN_LEVEL_INDEX) return;
  const line = formatMessage(level, message, meta).trimEnd();
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
  writeToFile(level, message, meta);
}

/** サーバー用ロガー。debug / info / warn / error と errorException を提供。 */
export const logger = {
  debug(message: string, meta?: unknown): void {
    log("debug", message, meta);
  },
  info(message: string, meta?: unknown): void {
    log("info", message, meta);
  },
  warn(message: string, meta?: unknown): void {
    log("warn", message, meta);
  },
  error(message: string, meta?: unknown): void {
    log("error", message, meta);
  },
  /**
   * 例外をメッセージ＋スタック付きで記録する。
   * @param message - ログに残す説明
   * @param err - キャッチしたエラー（Error なら message/name/stack を記録）
   * @param meta - 追加の文脈（userId・entryId など。秘匿情報は入れないこと）
   */
  errorException(
    message: string,
    err: unknown,
    meta?: Record<string, unknown>,
  ): void {
    const detail =
      err instanceof Error
        ? { message: err.message, name: err.name, stack: err.stack }
        : err;
    if (meta && Object.keys(meta).length > 0) {
      logger.error(message, { ...meta, error: detail });
    } else {
      logger.error(message, detail);
    }
  },
};
