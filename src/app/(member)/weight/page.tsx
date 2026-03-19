"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightChart } from "@/components/charts/weight-chart";
import type { BodyWeight } from "@/types/database";

export default function WeightPage() {
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadWeights = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("body_weight")
      .select("*")
      .eq("member_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(30);

    if (data) setWeights(data);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWeights();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("body_weight").insert({
      member_id: user.id,
      weight_kg: parseFloat(newWeight),
    });

    setNewWeight("");
    await loadWeights();
    setSaving(false);
  };

  if (loading) return <div className="p-4">読み込み中...</div>;

  const chartData = weights.map((w) => ({
    date: new Date(w.recorded_at).toLocaleDateString("ja-JP"),
    weight: Number(w.weight_kg),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">体重記録</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日の体重を記録</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                step="0.1"
                placeholder="65.0"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : "記録"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {weights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">体重グラフ</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart data={chartData} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">体重推移</CardTitle>
        </CardHeader>
        <CardContent>
          {weights.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ記録がありません</p>
          ) : (
            <div className="space-y-2">
              {weights.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Date(w.recorded_at).toLocaleDateString("ja-JP")}
                  </span>
                  <span className="font-medium">{w.weight_kg} kg</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
