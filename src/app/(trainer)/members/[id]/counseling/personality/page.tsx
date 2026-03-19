"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUESTIONS = [
  {
    id: "motivation",
    question: "モチベーションが上がるのは？",
    options: ["褒められたとき", "数値が上がったとき", "自分で目標を決めたとき", "仲間と一緒のとき"],
  },
  {
    id: "pace",
    question: "トレーニングのペースは？",
    options: ["ガンガン追い込みたい", "マイペースにやりたい", "コーチに任せたい", "日によって変わる"],
  },
  {
    id: "feedback",
    question: "どんなフィードバックが嬉しい？",
    options: ["具体的な数字で", "感情的に褒めて", "改善点を指摘して", "静かに見守って"],
  },
  {
    id: "challenge",
    question: "壁にぶつかったときは？",
    options: ["とにかく頑張る", "原因を分析する", "誰かに相談する", "気分転換する"],
  },
  {
    id: "goal",
    question: "目標の立て方は？",
    options: ["大きな目標を掲げる", "小さな目標を積み重ねる", "直感で決める", "人に決めてもらう"],
  },
];

export default function PersonalityPage() {
  const params = useParams();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    trainingStyle: string;
    coachingTips: string[];
  } | null>(null);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < QUESTIONS.length) return;
    setLoading(true);

    try {
      const supabase = createClient();

      // Generate coaching tips via API
      const res = await fetch("/api/ai/suggest-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "personality", answers }),
      });

      let trainingStyle = "バランス型";
      let coachingTips = ["個々のペースを尊重", "定期的なフィードバック", "目標の可視化"];

      if (res.ok) {
        const data = await res.json();
        trainingStyle = data.trainingStyle || trainingStyle;
        coachingTips = data.coachingTips || coachingTips;
      }

      await supabase.from("counseling_personality").upsert({
        member_id: params.id as string,
        answers,
        training_style: trainingStyle,
        coaching_tips: { tips: coachingTips },
      });

      setResult({ trainingStyle, coachingTips });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">性格診断結果</h1>
        <Card>
          <CardHeader>
            <CardTitle>性格タイプ: {result.trainingStyle}</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">指導ポイント:</h3>
            <ul className="space-y-1">
              {result.coachingTips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  ・{tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Button onClick={() => router.back()}>戻る</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">性格診断</h1>
      {QUESTIONS.map((q) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-base">{q.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.options.map((option) => (
              <label
                key={option}
                className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  answers[q.id] === option
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={option}
                  checked={answers[q.id] === option}
                  onChange={() => handleAnswer(q.id, option)}
                  className="sr-only"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length < QUESTIONS.length || loading}
        className="w-full"
      >
        {loading ? "分析中..." : "診断する"}
      </Button>
    </div>
  );
}
