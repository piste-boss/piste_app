/**
 * Route A: OpenAI Whisper API で日本語音声をテキストに変換する。
 *
 * 環境変数 OPENAI_API_KEY が未設定の場合は、フォールバックとして
 * ダミーのテキストを返す（開発・テスト用）。
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  // --- フォールバック: API キー未設定 ---
  if (!apiKey) {
    console.warn(
      "[transcribe] OPENAI_API_KEY が未設定のため、フォールバックテキストを返します"
    );
    return `[Whisper フォールバック] 音声ファイル「${filename}」の文字起こし結果がここに入ります。ベンチプレス 60キロ 10回 3セット、スクワット 80キロ 8回 3セット。`;
  }

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)]),
    filename
  );
  formData.append("model", "whisper-1");
  formData.append("language", "ja");
  formData.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Whisper API エラー (HTTP ${res.status}): ${errorBody || res.statusText}`
    );
  }

  // response_format=text の場合は plain text が返る
  const text = await res.text();
  return text.trim();
}
