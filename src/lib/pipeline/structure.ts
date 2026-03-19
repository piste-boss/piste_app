import { generateJsonWithGemini } from "@/lib/gemini/client";

export interface StructuredSet {
  exerciseName: string;
  sets: Array<{
    setNumber: number;
    weightKg: number;
    reps: number;
  }>;
  notes?: string;
}

export interface StructuredSession {
  exercises: StructuredSet[];
  trainerNotes?: string;
}

export async function structureTranscript(text: string): Promise<StructuredSession> {
  const prompt = `以下のトレーニングセッションの記録テキストから、構造化データを抽出してください。

テキスト:
${text}

以下のJSON形式で返してください:
{
  "exercises": [
    {
      "exerciseName": "種目名",
      "sets": [
        { "setNumber": 1, "weightKg": 60, "reps": 10 }
      ],
      "notes": "メモ（あれば）"
    }
  ],
  "trainerNotes": "全体的なコメント（あれば）"
}`;

  return generateJsonWithGemini<StructuredSession>(prompt);
}
