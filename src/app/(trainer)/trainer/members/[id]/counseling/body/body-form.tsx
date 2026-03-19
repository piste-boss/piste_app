"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { saveBodyCounseling } from "../actions";

// ─── 選択肢定義 ──────────────────────────────────────

const BODY_CONCERNS = [
  { id: "shoulder_stiffness", label: "肩こり" },
  { id: "lower_back_pain", label: "腰痛" },
  { id: "posture", label: "姿勢の悪さ" },
  { id: "knee_pain", label: "膝痛" },
  { id: "neck_pain", label: "首の痛み" },
  { id: "hip_pain", label: "股関節の痛み" },
  { id: "headache", label: "頭痛" },
  { id: "cold_sensitivity", label: "冷え性" },
  { id: "swelling", label: "むくみ" },
  { id: "fatigue", label: "疲れやすい" },
  { id: "sleep", label: "睡眠の質が悪い" },
  { id: "stiff_body", label: "体が硬い" },
] as const;

const GOALS = [
  { id: "diet", label: "ダイエット" },
  { id: "muscle_up", label: "筋力UP" },
  { id: "posture_improvement", label: "姿勢改善" },
  { id: "flexibility", label: "柔軟性向上" },
  { id: "stamina", label: "体力・持久力UP" },
  { id: "body_shape", label: "ボディメイク" },
  { id: "health_maintenance", label: "健康維持" },
  { id: "pain_relief", label: "痛み改善" },
  { id: "stress_relief", label: "ストレス解消" },
  { id: "sports_performance", label: "競技パフォーマンス向上" },
] as const;

// ─── 型 ──────────────────────────────────────

interface ExistingData {
  concerns: Record<string, unknown> | null;
  medical_history: string | null;
  goals: Record<string, unknown> | null;
}

interface BodyFormProps {
  memberId: string;
  memberName: string;
  existing: ExistingData | null;
}

export function BodyForm({ memberId, memberName, existing }: BodyFormProps) {
  const router = useRouter();

  const existingConcerns = (existing?.concerns as { items?: string[] })?.items ?? [];
  const existingGoals = (existing?.goals as { items?: string[] })?.items ?? [];

  const [selectedConcerns, setSelectedConcerns] = useState<string[]>(existingConcerns);
  const [medicalHistory, setMedicalHistory] = useState(existing?.medical_history ?? "");
  const [selectedGoals, setSelectedGoals] = useState<string[]>(existingGoals);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  };

  const handleSave = async () => {
    if (selectedGoals.length === 0) {
      setError("目標を1つ以上選択してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBodyCounseling(memberId, selectedConcerns, medicalHistory, selectedGoals);
      router.push(`/trainer/members/${memberId}/counseling`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
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
          {memberName} 様 - 体のお悩み
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          現在の体の状態や目標を記録します
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 部位別の悩み */}
      <Card>
        <CardHeader>
          <CardTitle>部位別の悩み</CardTitle>
          <CardDescription>
            該当するものを全て選択してください（複数選択可）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BODY_CONCERNS.map((concern) => (
              <button
                key={concern.id}
                type="button"
                onClick={() =>
                  toggleItem(selectedConcerns, setSelectedConcerns, concern.label)
                }
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  selectedConcerns.includes(concern.label)
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {concern.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 既往歴・ケガ */}
      <Card>
        <CardHeader>
          <CardTitle>既往歴・ケガ</CardTitle>
          <CardDescription>
            過去の病歴やケガ、現在治療中のものがあればご記入ください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="medical-history" className="sr-only">
            既往歴・ケガ
          </Label>
          <textarea
            id="medical-history"
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            placeholder="例: 2年前にぎっくり腰、右肩の腱板損傷（完治済み）"
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </CardContent>
      </Card>

      {/* 目標設定 */}
      <Card>
        <CardHeader>
          <CardTitle>目標設定</CardTitle>
          <CardDescription>
            トレーニングの目標を選択してください（複数選択可）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() =>
                  toggleItem(selectedGoals, setSelectedGoals, goal.label)
                }
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  selectedGoals.includes(goal.label)
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
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
  );
}
