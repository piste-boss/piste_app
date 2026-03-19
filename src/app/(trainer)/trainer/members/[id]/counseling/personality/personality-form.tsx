"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  generatePersonalityAnalysis,
  savePersonalityCounseling,
} from "../actions";

// ─── 質問定義 ──────────────────────────────────────

const QUESTIONS = [
  {
    id: "motivation",
    question: "トレーニングで一番やる気が出るのはどんなとき?",
    options: [
      "トレーナーに褒められたとき",
      "記録が更新できたとき",
      "体の変化を実感したとき",
      "仲間と一緒に頑張っているとき",
      "新しい種目にチャレンジするとき",
    ],
  },
  {
    id: "pace",
    question: "自分に合ったトレーニングのペースは?",
    options: [
      "ゆっくり確実に進めたい",
      "ガンガン追い込みたい",
      "気分に合わせて変えたい",
      "計画的にコツコツやりたい",
      "短時間で集中して終わらせたい",
    ],
  },
  {
    id: "feedback",
    question: "トレーナーからのフィードバックで嬉しいのは?",
    options: [
      "「すごい! 上手になってる!」と褒めてもらう",
      "「あと1回!」と追い込んでもらう",
      "具体的な数字で成長を教えてもらう",
      "フォームの改善点を細かく教えてもらう",
      "目標達成への道筋を示してもらう",
    ],
  },
  {
    id: "difficulty",
    question: "きついトレーニングのとき、どう乗り越える?",
    options: [
      "声をかけてもらえると頑張れる",
      "自分で限界を決めて追い込む",
      "目標を思い出して踏ん張る",
      "終わった後の達成感を想像する",
      "とにかく言われた通りにやる",
    ],
  },
  {
    id: "goal_style",
    question: "目標の立て方で自分に近いのは?",
    options: [
      "大きな目標より小さな成功体験を積み重ねたい",
      "高い目標を掲げてストイックに取り組みたい",
      "楽しみながら自然と上達したい",
      "具体的な数値目標を追いかけたい",
      "トレーナーにお任せして導いてほしい",
    ],
  },
  {
    id: "off_day",
    question: "調子が悪い日のトレーニングはどうしたい?",
    options: [
      "軽めに切り替えて気持ちよく終わりたい",
      "それでもやると決めたメニューはこなしたい",
      "思い切って休んで次に備えたい",
      "トレーナーに相談して決めたい",
      "ストレッチや軽い運動に変更したい",
    ],
  },
] as const;

// ─── 型 ──────────────────────────────────────

interface ExistingData {
  answers: Record<string, unknown> | null;
  training_style: string | null;
  coaching_tips: Record<string, unknown> | null;
}

interface PersonalityFormProps {
  memberId: string;
  memberName: string;
  existing: ExistingData | null;
}

type Step = "questionnaire" | "analyzing" | "result";

export function PersonalityForm({
  memberId,
  memberName,
  existing,
}: PersonalityFormProps) {
  const router = useRouter();

  const existingAnswers = (existing?.answers ?? {}) as Record<string, string>;
  const existingTips = (existing?.coaching_tips as { tips?: string[] })?.tips ?? [];

  const [step, setStep] = useState<Step>(existing ? "result" : "questionnaire");
  const [answers, setAnswers] = useState<Record<string, string>>(existingAnswers);
  const [trainingStyle, setTrainingStyle] = useState(existing?.training_style ?? "");
  const [coachingTips, setCoachingTips] = useState<string[]>(existingTips);
  const [editingTipIndex, setEditingTipIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = QUESTIONS.every((q) => answers[q.id]);

  const handleSelect = useCallback((questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }, []);

  const handleAnalyze = async () => {
    setError(null);
    setStep("analyzing");
    try {
      const result = await generatePersonalityAnalysis(answers);
      setTrainingStyle(result.training_style);
      setCoachingTips(result.coaching_tips);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析に失敗しました");
      setStep("questionnaire");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePersonalityCounseling(memberId, answers, trainingStyle, coachingTips);
      router.push(`/trainer/members/${memberId}/counseling`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTip = (index: number, value: string) => {
    setCoachingTips((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const handleAddTip = () => {
    if (coachingTips.length < 5) {
      setCoachingTips((prev) => [...prev, ""]);
      setEditingTipIndex(coachingTips.length);
    }
  };

  const handleRemoveTip = (index: number) => {
    setCoachingTips((prev) => prev.filter((_, i) => i !== index));
    setEditingTipIndex(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/trainer/members/${memberId}/counseling`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; カウンセリング一覧に戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {memberName} 様 - 性格診断
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          トレーニングスタイルの傾向を把握し、最適な指導方法を見つけます
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ─── アンケート ─── */}
      {(step === "questionnaire" || step === "analyzing") && (
        <div className="space-y-4">
          {QUESTIONS.map((q, qi) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Q{qi + 1}. {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {q.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={step === "analyzing"}
                      onClick={() => handleSelect(q.id, option)}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                        answers[q.id] === option
                          ? "border-primary bg-primary/5 font-medium text-primary"
                          : "border-border hover:bg-muted/50"
                      } disabled:opacity-50`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end gap-3">
            {existing && (
              <Button
                variant="outline"
                onClick={() => setStep("result")}
                disabled={step === "analyzing"}
              >
                結果を見る
              </Button>
            )}
            <Button
              onClick={handleAnalyze}
              disabled={!allAnswered || step === "analyzing"}
            >
              {step === "analyzing" ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  AI分析中...
                </span>
              ) : (
                "AIで診断する"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── 診断結果 ─── */}
      {step === "result" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">性格タイプ</CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {trainingStyle}
                </Badge>
              </div>
              <CardDescription>
                AIが回答内容から分析した性格タイプです
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">指導ポイント</CardTitle>
              <CardDescription>
                トレーナー向けの指導ポイントです。編集・追加・削除できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coachingTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-2.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    {editingTipIndex === i ? (
                      <div className="flex flex-1 gap-2">
                        <Input
                          value={tip}
                          onChange={(e) =>
                            handleEditTip(i, (e.target as HTMLInputElement).value)
                          }
                          onBlur={() => setEditingTipIndex(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingTipIndex(null);
                          }}
                          autoFocus
                          className="flex-1"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveTip(i)}
                        >
                          削除
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTipIndex(i)}
                        className="flex-1 rounded-md p-2 text-left text-sm hover:bg-muted/50"
                      >
                        {tip || "(クリックして入力)"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {coachingTips.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleAddTip}
                >
                  + ポイントを追加
                </Button>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("questionnaire")}
              >
                アンケートを修正
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    保存中...
                  </span>
                ) : (
                  "保存する"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
