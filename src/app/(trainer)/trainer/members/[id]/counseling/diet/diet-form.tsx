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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDietCounseling } from "../actions";

// ─── 選択肢定義 ──────────────────────────────────────

const MEAL_TIME_OPTIONS = [
  "朝食 (6:00-9:00)",
  "午前間食 (9:00-12:00)",
  "昼食 (12:00-14:00)",
  "午後間食 (14:00-18:00)",
  "夕食 (18:00-21:00)",
  "夜食 (21:00以降)",
] as const;

const DIETARY_TENDENCIES = [
  "外食が多い",
  "コンビニ・弁当が多い",
  "自炊中心",
  "野菜が少ない",
  "タンパク質不足",
  "炭水化物が多い",
  "脂質が多い",
  "間食・甘いものが多い",
  "食事量にムラがある",
  "水分摂取が少ない",
  "お酒をよく飲む",
  "サプリメントを摂っている",
] as const;

const ALLERGY_OPTIONS = [
  "卵",
  "乳製品",
  "小麦",
  "えび・かに",
  "そば",
  "落花生",
  "大豆",
  "ナッツ類",
  "魚介類",
  "果物",
  "なし",
] as const;

// ─── 型 ──────────────────────────────────────

interface ExistingData {
  meal_frequency: number | null;
  meal_times: Record<string, unknown> | null;
  dietary_notes: string | null;
  allergies: Record<string, unknown> | null;
  improvement_goals: string | null;
}

interface DietFormProps {
  memberId: string;
  memberName: string;
  existing: ExistingData | null;
}

export function DietForm({ memberId, memberName, existing }: DietFormProps) {
  const router = useRouter();

  const existingMealTimes = (existing?.meal_times as { times?: string[] })?.times ?? [];
  const existingAllergies = (existing?.allergies as { items?: string[] })?.items ?? [];

  const [mealFrequency, setMealFrequency] = useState(existing?.meal_frequency ?? 3);
  const [selectedMealTimes, setSelectedMealTimes] = useState<string[]>(existingMealTimes);
  const [selectedTendencies, setSelectedTendencies] = useState<string[]>(() => {
    const notes = existing?.dietary_notes ?? "";
    return notes ? notes.split("、").filter(Boolean) : [];
  });
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(existingAllergies);
  const [otherAllergy, setOtherAllergy] = useState("");
  const [improvementGoals, setImprovementGoals] = useState(existing?.improvement_goals ?? "");
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
    setSaving(true);
    setError(null);
    try {
      const allergies = [...selectedAllergies];
      if (otherAllergy.trim()) {
        allergies.push(otherAllergy.trim());
      }
      const dietaryNotes = selectedTendencies.join("、");

      await saveDietCounseling(
        memberId,
        mealFrequency,
        selectedMealTimes,
        dietaryNotes,
        allergies,
        improvementGoals
      );
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
          {memberName} 様 - 食事カウンセリング
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          食生活の傾向や制限事項を記録します
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 食事回数 */}
      <Card>
        <CardHeader>
          <CardTitle>食事回数</CardTitle>
          <CardDescription>
            1日の食事回数を入力してください（間食含む）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="meal-frequency">1日</Label>
            <Input
              id="meal-frequency"
              type="number"
              min={1}
              max={10}
              value={mealFrequency}
              onChange={(e) =>
                setMealFrequency(
                  parseInt((e.target as HTMLInputElement).value, 10) || 1
                )
              }
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">回</span>
          </div>
        </CardContent>
      </Card>

      {/* 食事の時間帯 */}
      <Card>
        <CardHeader>
          <CardTitle>食事の時間帯</CardTitle>
          <CardDescription>
            普段食事をとる時間帯を選択してください（複数選択可）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEAL_TIME_OPTIONS.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() =>
                  toggleItem(selectedMealTimes, setSelectedMealTimes, time)
                }
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  selectedMealTimes.includes(time)
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 食事内容の傾向 */}
      <Card>
        <CardHeader>
          <CardTitle>食事内容の傾向</CardTitle>
          <CardDescription>
            該当するものを選択してください（複数選択可）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DIETARY_TENDENCIES.map((tendency) => (
              <button
                key={tendency}
                type="button"
                onClick={() =>
                  toggleItem(selectedTendencies, setSelectedTendencies, tendency)
                }
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  selectedTendencies.includes(tendency)
                    ? "border-primary bg-primary/5 font-medium text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                {tendency}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* アレルギー・制限事項 */}
      <Card>
        <CardHeader>
          <CardTitle>アレルギー・制限事項</CardTitle>
          <CardDescription>
            該当するアレルギーを選択してください（複数選択可）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {ALLERGY_OPTIONS.map((allergy) => (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => {
                    if (allergy === "なし") {
                      setSelectedAllergies(
                        selectedAllergies.includes("なし") ? [] : ["なし"]
                      );
                    } else {
                      const filtered = selectedAllergies.filter(
                        (a) => a !== "なし"
                      );
                      toggleItem(
                        filtered,
                        setSelectedAllergies,
                        allergy
                      );
                    }
                  }}
                  className={`rounded-lg border p-3 text-sm transition-colors ${
                    selectedAllergies.includes(allergy)
                      ? "border-primary bg-primary/5 font-medium text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {allergy}
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor="other-allergy" className="text-sm text-muted-foreground">
                その他のアレルギー・食事制限
              </Label>
              <Input
                id="other-allergy"
                value={otherAllergy}
                onChange={(e) =>
                  setOtherAllergy((e.target as HTMLInputElement).value)
                }
                placeholder="例: グルテンフリー、ヴィーガン"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 改善目標 */}
      <Card>
        <CardHeader>
          <CardTitle>食事の改善目標</CardTitle>
          <CardDescription>
            食事面で改善したいことを自由に記入してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="improvement-goals" className="sr-only">
            改善目標
          </Label>
          <textarea
            id="improvement-goals"
            value={improvementGoals}
            onChange={(e) => setImprovementGoals(e.target.value)}
            placeholder="例: タンパク質を毎食摂るようにしたい、間食を減らしたい、夜遅い食事をやめたい"
            rows={4}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
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
