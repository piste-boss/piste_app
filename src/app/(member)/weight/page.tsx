"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightChart } from "@/components/charts/weight-chart";
import type { BodyWeight } from "@/types/database";

export default function WeightPage() {
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newNotes, setNewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadWeights = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("body_weight")
      .select("*")
      .eq("member_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(90);

    if (data) setWeights(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWeights();
  }, [loadWeights]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;

    const weightValue = parseFloat(newWeight);
    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 500) {
      setSaveError("有効な体重を入力してください");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("body_weight").insert({
        member_id: user.id,
        weight_kg: weightValue,
        recorded_at: new Date(newDate + "T00:00:00").toISOString(),
        notes: newNotes.trim() || null,
      });

      if (error) {
        throw new Error("保存に失敗しました");
      }

      setNewWeight("");
      setNewNotes("");
      setNewDate(new Date().toISOString().slice(0, 10));
      setSaveSuccess(true);
      await loadWeights();

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-56 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const chartData = weights.map((w) => ({
    date: new Date(w.recorded_at).toLocaleDateString("ja-JP"),
    weight: Number(w.weight_kg),
  }));

  // Calculate stats
  const latestWeight = weights.length > 0 ? Number(weights[0].weight_kg) : null;
  const previousWeight = weights.length > 1 ? Number(weights[1].weight_kg) : null;
  const weightDiff =
    latestWeight != null && previousWeight != null
      ? latestWeight - previousWeight
      : null;

  // Find min/max over last 30 days
  const last30 = weights.slice(0, 30);
  const minWeight =
    last30.length > 0
      ? Math.min(...last30.map((w) => Number(w.weight_kg)))
      : null;
  const maxWeight =
    last30.length > 0
      ? Math.max(...last30.map((w) => Number(w.weight_kg)))
      : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">体重記録</h1>

      {/* Input form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">体重を記録</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="weight-date" className="text-xs">
                  日付
                </Label>
                <Input
                  id="weight-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <Label htmlFor="weight-value" className="text-xs">
                  体重 (kg)
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="weight-value"
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    placeholder="65.0"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">
                    kg
                  </span>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="weight-notes" className="text-xs">
                メモ（任意）
              </Label>
              <Input
                id="weight-notes"
                type="text"
                placeholder="例: 食べすぎた、運動した"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving || !newWeight} className="w-full">
              {saving ? "保存中..." : "記録する"}
            </Button>
            {saveError && (
              <p className="text-sm text-red-600 text-center">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-600 text-center">
                記録しました
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Stats card */}
      {latestWeight != null && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{latestWeight}</p>
                <p className="text-xs text-muted-foreground">最新 (kg)</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {weightDiff != null ? (
                    <span
                      className={
                        weightDiff > 0
                          ? "text-red-500"
                          : weightDiff < 0
                            ? "text-green-500"
                            : ""
                      }
                    >
                      {weightDiff > 0 ? "+" : ""}
                      {weightDiff.toFixed(1)}
                    </span>
                  ) : (
                    "-"
                  )}
                </p>
                <p className="text-xs text-muted-foreground">前回比 (kg)</p>
              </div>
              <div>
                {minWeight != null && maxWeight != null ? (
                  <>
                    <p className="text-2xl font-bold">
                      {(maxWeight - minWeight).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">変動幅 (kg)</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">-</p>
                    <p className="text-xs text-muted-foreground">変動幅</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {weights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">体重グラフ</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {/* History list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">記録履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {weights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              まだ記録がありません。上のフォームから体重を記録しましょう。
            </p>
          ) : (
            <div className="space-y-1">
              {weights.map((w, index) => {
                const prevWeight =
                  index < weights.length - 1
                    ? Number(weights[index + 1].weight_kg)
                    : null;
                const diff =
                  prevWeight != null
                    ? Number(w.weight_kg) - prevWeight
                    : null;

                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">
                        {new Date(w.recorded_at).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </span>
                      {w.notes && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {w.notes}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{w.weight_kg} kg</span>
                      {diff != null && (
                        <span
                          className={`text-xs ${
                            diff > 0
                              ? "text-red-500"
                              : diff < 0
                                ? "text-green-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
