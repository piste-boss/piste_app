const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export async function generateWithGemini(prompt: string, options?: {
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Gemini API error: ${res.status} ${errorBody}`);
  }

  const data: GeminiResponse = await res.json();
  return data.candidates[0]?.content?.parts[0]?.text || "";
}

export async function generateJsonWithGemini<T>(prompt: string, options?: {
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<T> {
  const text = await generateWithGemini(
    prompt + "\n\n必ず有効なJSONのみを返してください。マークダウンや説明文は不要です。",
    { temperature: options?.temperature ?? 0.4, maxOutputTokens: options?.maxOutputTokens }
  );
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Gemini response is not valid JSON");
  return JSON.parse(jsonMatch[0]);
}

/** 性格診断の回答から指導ポイントを生成 */
export interface PersonalityAnalysis {
  training_style: string;
  coaching_tips: string[];
}

export async function analyzePersonality(
  answers: Record<string, string>
): Promise<PersonalityAnalysis> {
  const answersText = Object.entries(answers)
    .map(([q, a]) => `質問: ${q}\n回答: ${a}`)
    .join("\n\n");

  const prompt = `あなたはパーソナルトレーニングジムの指導コンサルタントです。
以下の性格診断アンケートの回答から、会員のトレーニングスタイルの傾向を分析してください。

${answersText}

以下のJSON形式で回答してください:
{
  "training_style": "性格タイプ名（例: 褒められ伸びる型、ストイック追込み型、コツコツ積上げ型、チャレンジ好奇心型、仲間と頑張る型）",
  "coaching_tips": [
    "トレーナー向け指導ポイント1（声かけの仕方、追い込み方、モチベーション管理など具体的に）",
    "トレーナー向け指導ポイント2",
    "トレーナー向け指導ポイント3",
    "トレーナー向け指導ポイント4（必要に応じて）",
    "トレーナー向け指導ポイント5（必要に応じて）"
  ]
}

指導ポイントは3〜5項目で、それぞれ具体的かつ実践的な内容にしてください。`;

  return generateJsonWithGemini<PersonalityAnalysis>(prompt, { temperature: 0.6 });
}

/** AIメニュー提案の型定義 */
export interface SuggestedExercise {
  name: string;
  muscle_group: string;
  weight_kg: number;
  reps: number;
  sets: number;
  rest_seconds: number;
  notes: string;
  progression_reason: string;
}

export interface MenuSuggestion {
  exercises: SuggestedExercise[];
  reasoning: string;
  overall_strategy: string;
  warnings: string[];
  estimated_duration_minutes: number;
}

/** データ集約用の型 */
export interface MemberTrainingData {
  memberName: string;
  dateOfBirth: string | null;
  trainingHistory: {
    sessionDate: string;
    exercises: {
      name: string;
      muscleGroup: string;
      sets: { setNumber: number; weightKg: number | null; reps: number | null; notes: string | null }[];
    }[];
  }[];
  weightHistory: { date: string; weightKg: number }[];
  personality: {
    trainingStyle: string | null;
    coachingTips: unknown[] | null;
  } | null;
  bodyGoals: {
    goals: unknown;
    concerns: unknown;
    medicalHistory: string | null;
  } | null;
  diet: {
    mealFrequency: number | null;
    dietaryNotes: string | null;
    allergies: unknown;
    improvementGoals: string | null;
  } | null;
  suggestedForDate: string;
}

/** トレーニングデータからAIメニュー提案を生成 */
export async function suggestMenu(
  data: MemberTrainingData
): Promise<MenuSuggestion> {
  // 種目別の重量推移を構造化
  const exerciseProgressMap: Record<string, { date: string; weight: number | null; reps: number | null }[]> = {};
  for (const session of data.trainingHistory) {
    for (const ex of session.exercises) {
      if (!exerciseProgressMap[ex.name]) {
        exerciseProgressMap[ex.name] = [];
      }
      const maxSet = ex.sets.reduce((best, s) => {
        if (!best || (s.weightKg ?? 0) > (best.weightKg ?? 0)) return s;
        return best;
      }, ex.sets[0]);
      if (maxSet) {
        exerciseProgressMap[ex.name].push({
          date: session.sessionDate,
          weight: maxSet.weightKg,
          reps: maxSet.reps,
        });
      }
    }
  }

  const progressionSummary = Object.entries(exerciseProgressMap)
    .map(([name, history]) => {
      const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
      const lines = sorted.map(h => `  ${h.date}: ${h.weight ?? "?"}kg × ${h.reps ?? "?"}回`);
      return `【${name}】\n${lines.join("\n")}`;
    })
    .join("\n\n");

  // 体重推移
  const weightSummary = data.weightHistory.length > 0
    ? data.weightHistory.map(w => `${w.date}: ${w.weightKg}kg`).join("\n")
    : "体重データなし";

  // 性格タイプに応じた強度指示
  const style = data.personality?.trainingStyle ?? "未診断";
  let intensityGuidance = "";
  if (style.includes("追込") || style.includes("ストイック")) {
    intensityGuidance = "この会員はストイック・追い込みタイプです。高強度（85-95% 1RM）を中心に、限界まで追い込むメニューを推奨します。ドロップセットやスーパーセットも検討してください。";
  } else if (style.includes("褒め") || style.includes("伸びる")) {
    intensityGuidance = "この会員は褒められて伸びるタイプです。中〜やや高強度（70-85% 1RM）で、達成感を得やすいメニューを推奨します。前回より少しだけ上の重量を設定し、成功体験を積ませてください。";
  } else if (style.includes("コツコツ") || style.includes("積上")) {
    intensityGuidance = "この会員はコツコツ積み上げタイプです。中強度（65-80% 1RM）で安定したフォームを重視し、少しずつ重量を上げるメニューを推奨します。急な負荷増加は避けてください。";
  } else if (style.includes("チャレンジ") || style.includes("好奇心")) {
    intensityGuidance = "この会員はチャレンジ・好奇心タイプです。バリエーション豊かなメニューを取り入れ、新しい種目も積極的に提案してください。中〜高強度（70-90% 1RM）で変化を持たせてください。";
  } else {
    intensityGuidance = "性格タイプ未診断のため、中強度（70-80% 1RM）を基本とし、バランスの取れたメニューを提案してください。";
  }

  // 目標別ガイダンス
  const goals = data.bodyGoals?.goals;
  let goalGuidance = "";
  if (goals) {
    const goalStr = typeof goals === "string" ? goals : JSON.stringify(goals);
    if (goalStr.includes("ダイエット") || goalStr.includes("減量")) {
      goalGuidance = "目標: ダイエット/減量 — サーキットトレーニング要素を取り入れ、休憩時間を短めに設定。大筋群の複合運動を中心に、カロリー消費を高めるメニューを構成してください。";
    } else if (goalStr.includes("筋力") || goalStr.includes("筋肥大") || goalStr.includes("バルクアップ")) {
      goalGuidance = "目標: 筋力UP/筋肥大 — 高重量・低〜中レップを中心に、しっかり休憩を取る構成にしてください。コンパウンド種目をメインに据えてください。";
    } else if (goalStr.includes("姿勢") || goalStr.includes("改善")) {
      goalGuidance = "目標: 姿勢改善 — 体幹・背筋・インナーマッスルを強化する種目を重視してください。ストレッチ要素のある種目も取り入れてください。";
    } else {
      goalGuidance = `目標: ${goalStr} — 目標に合わせたバランスの良いメニューを提案してください。`;
    }
  }

  const prompt = `あなたはパーソナルトレーニングの専門家AIです。以下の会員データを詳細に分析し、次回セッション（${data.suggestedForDate}）の最適なトレーニングメニューを提案してください。

## 会員情報
- 名前: ${data.memberName}
- 生年月日: ${data.dateOfBirth ?? "不明"}
- 性格タイプ: ${style}
${data.personality?.coachingTips ? `- 指導ポイント: ${JSON.stringify(data.personality.coachingTips)}` : ""}

## 過去のトレーニング記録（種目別重量推移）
${progressionSummary || "過去のトレーニングデータなし"}

## 体重推移
${weightSummary}

## 体の悩み・既往歴
${data.bodyGoals ? `- 悩み: ${JSON.stringify(data.bodyGoals.concerns ?? {})}
- 既往歴: ${data.bodyGoals.medicalHistory ?? "なし"}` : "カウンセリングデータなし"}

## 食事情報
${data.diet ? `- 食事回数: ${data.diet.mealFrequency ?? "不明"}回/日
- 食事メモ: ${data.diet.dietaryNotes ?? "なし"}
- アレルギー: ${JSON.stringify(data.diet.allergies ?? {})}
- 改善目標: ${data.diet.improvementGoals ?? "なし"}` : "食事データなし"}

## メニュー設計指針

### 漸進的過負荷の原則
- 前回のトレーニングデータを基に、2.5〜5%の重量増加を目安にする
- レップ数が目標上限に達している場合は重量を上げる
- 重量が停滞している場合は、レップ数やセット数を調整する
- 初回の場合はやや控えめな重量から開始する

### 性格タイプ別調整
${intensityGuidance}

### 目標別種目選定
${goalGuidance}

## 出力形式
以下のJSON形式で正確に回答してください。exercises には5〜8種目を含めてください:
{
  "exercises": [
    {
      "name": "種目名（日本語）",
      "muscle_group": "対象筋群（胸/脚/背中/肩/腕/体幹/臀部）",
      "weight_kg": 60,
      "reps": 10,
      "sets": 3,
      "rest_seconds": 90,
      "notes": "フォームの注意点やコツ",
      "progression_reason": "この重量を提案する根拠（前回データとの比較）"
    }
  ],
  "reasoning": "メニュー全体の設計根拠を3〜5文で詳細に説明。過去データの分析結果、重量推移の傾向、今回の調整理由を含める。",
  "overall_strategy": "今回のセッションの全体戦略（例: 上半身集中日、全身バランス日など）を1〜2文で説明。",
  "warnings": ["注意すべき点があれば記載（既往歴への配慮、過負荷リスクなど）"],
  "estimated_duration_minutes": 60
}`;

  return generateJsonWithGemini<MenuSuggestion>(prompt, {
    temperature: 0.5,
    maxOutputTokens: 4096,
  });
}
