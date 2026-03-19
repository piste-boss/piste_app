import type { FileType } from "@/types/database";

const AUDIO_EXTENSIONS = [".m4a", ".mp3", ".wav", ".webm", ".ogg", ".aac"];
const TEXT_EXTENSIONS = [".txt", ".md"];

/**
 * ファイル名の拡張子から audio / text を自動判別する。
 * 対応外の拡張子の場合はエラーをスローする。
 */
export function detectFileType(filename: string): FileType {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    throw new Error(`ファイルに拡張子がありません: ${filename}`);
  }
  const ext = filename.toLowerCase().slice(dotIndex);
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (TEXT_EXTENSIONS.includes(ext)) return "text";
  throw new Error(
    `未対応のファイル形式です: ${ext} (対応形式: ${[...AUDIO_EXTENSIONS, ...TEXT_EXTENSIONS].join(", ")})`
  );
}

/**
 * ファイルの MIME type から audio / text を判別するヘルパー。
 * Content-Type ヘッダーからの判定に使用。
 */
export function detectFileTypeFromMime(mimeType: string): FileType | null {
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("text/")) return "text";
  if (mimeType === "application/octet-stream") return null;
  return null;
}
