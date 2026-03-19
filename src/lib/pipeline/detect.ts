import type { FileType } from "@/types/database";

const AUDIO_EXTENSIONS = [".m4a", ".mp3", ".wav", ".webm", ".ogg", ".aac"];
const TEXT_EXTENSIONS = [".txt", ".md"];

export function detectFileType(filename: string): FileType {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (TEXT_EXTENSIONS.includes(ext)) return "text";
  throw new Error(`Unsupported file type: ${ext}`);
}
