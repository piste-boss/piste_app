import { generateJsonWithGemini } from "@/lib/gemini/client";

/** 1種目の構造化データ */
export interface StructuredExercise {
  exerciseName: string;
  sets: Array<{
    setNumber: number;
    weightKg: number;
    reps: number;
  }>;
  notes?: string;
}

/** セッション全体の構造化結果 */
export interface StructuredSession {
  exercises: StructuredExercise[];
  trainerNotes?: string;
}

/**
 * Route B: Gemini API でトレーニング記録テキストから構造化データを抽出する。
 *
 * GEMINI_API_KEY が未設定の場合はフォールバックデータを返す。
 */
export async function structureTranscript(
  text: string
): Promise<StructuredSession> {
  const apiKey = process.env.GEMINI_API_KEY;

  // --- フォールバック: API キー未設定 ---
  if (!apiKey) {
    console.warn(
      "[structure] GEMINI_API_KEY が未設定のため、フォールバックデータを返します"
    );
    return {
      exercises: [
        {
          exerciseName: "ベンチプレス",
          sets: [
            { setNumber: 1, weightKg: 60, reps: 10 },
            { setNumber: 2, weightKg: 60, reps: 10 },
            { setNumber: 3, weightKg: 60, reps: 8 },
          ],
          notes: "フォーム良好",
        },
        {
          exerciseName: "スクワット",
          sets: [
            { setNumber: 1, weightKg: 80, reps: 8 },
            { setNumber: 2, weightKg: 80, reps: 8 },
            { setNumber: 3, weightKg: 80, reps: 6 },
          ],
          notes: "膝の角度に注意",
        },
      ],
      trainerNotes:
        "全体的に良いセッション。次回はベンチプレスの重量を2.5kg上げる。",
    };
  }

  const prompt = `あなたはパーソナルトレーニングの記録を構造化するアシスタントです。
以下のトレーニングセッションの記録テキストから、構造化データを抽出してください。

テキスト:
---
${text}
---

以下のJSON形式で正確に返してください。種目ごとにセット別の重量・レップ数を記録してください。
{
  "exercises": [
    {
      "exerciseName": "種目名（日本語）",
      "sets": [
        { "setNumber": 1, "weightKg": 60, "reps": 10 }
      ],
      "notes": "この種目に関するメモ（あれば）"
    }
  ],
  "trainerNotes": "全体的なトレーナーコメント（あれば）"
}

注意事項:
- 種目名は日本語のカタカナ表記で統一してください
- 重量の単位はkgです
- テキストに含まれない情報は推測せず、明記されたもののみ抽出してください
- セット数が明記されていない場合は、記録されている回数分のセットを作成してください`;

  return generateJsonWithGemini<StructuredSession>(prompt);
}
