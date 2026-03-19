import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJsonWithGemini } from "@/lib/gemini/client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Handle personality analysis
    if (body.type === "personality") {
      const result = await generateJsonWithGemini<{
        trainingStyle: string;
        coachingTips: string[];
      }>(`以下の性格診断アンケート結果から、トレーニングの性格タイプ名と指導ポイントを生成してください。

回答: ${JSON.stringify(body.answers)}

JSON形式で返してください:
{
  "trainingStyle": "性格タイプ名（例: 褒められ伸びる型、ストイック追込み型、コツコツ積上げ型）",
  "coachingTips": ["指導ポイント1", "指導ポイント2", "指導ポイント3"]
}`);
      return NextResponse.json(result);
    }

    // Handle menu suggestion
    const { memberId } = body;

    // Gather data
    const [
      { data: sessions },
      { data: weights },
      { data: personality },
      { data: bodyData },
    ] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select("*, session_sets(*, exercises(name))")
        .eq("member_id", memberId)
        .order("session_date", { ascending: false })
        .limit(10),
      supabase
        .from("body_weight")
        .select("*")
        .eq("member_id", memberId)
        .order("recorded_at", { ascending: false })
        .limit(10),
      supabase
        .from("counseling_personality")
        .select("*")
        .eq("member_id", memberId)
        .single(),
      supabase
        .from("counseling_body")
        .select("*")
        .eq("member_id", memberId)
        .single(),
    ]);

    const prompt = `あなたはパーソナルトレーニングの専門家です。
以下のデータを分析し、次回セッションの推奨メニューを提案してください。

## 過去のトレーニング記録
${JSON.stringify(sessions || [], null, 2)}

## 体重推移
${JSON.stringify(weights || [], null, 2)}

## 性格タイプ
${personality?.training_style || "未診断"}

## 目標・体の悩み
${JSON.stringify(bodyData?.goals || {}, null, 2)}

以下のJSON形式で返してください:
{
  "exercises": [
    {
      "name": "種目名",
      "weightKg": 60,
      "reps": 10,
      "sets": 3,
      "notes": "前回より2.5kg増"
    }
  ],
  "reasoning": "提案の根拠",
  "warnings": ["注意点があれば"]
}`;

    const suggestion = await generateJsonWithGemini(prompt);
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json(
      { error: "AI提案の生成に失敗しました" },
      { status: 500 }
    );
  }
}
