"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DietCounselingPage() {
  const params = useParams();
  const router = useRouter();
  const [mealFrequency, setMealFrequency] = useState(3);
  const [mealTimes, setMealTimes] = useState({ breakfast: "", lunch: "", dinner: "" });
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [allergies, setAllergies] = useState("");
  const [improvementGoals, setImprovementGoals] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("counseling_diet").upsert({
      member_id: params.id as string,
      meal_frequency: mealFrequency,
      meal_times: mealTimes,
      dietary_notes: dietaryNotes,
      allergies: { items: allergies.split(",").map((s) => s.trim()).filter(Boolean) },
      improvement_goals: improvementGoals,
    });
    setLoading(false);
    router.back();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">食事ヒアリング</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">食事回数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={10}
                value={mealFrequency}
                onChange={(e) => setMealFrequency(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">回/日</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">食事時間帯</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>朝食</Label>
              <Input
                type="time"
                value={mealTimes.breakfast}
                onChange={(e) =>
                  setMealTimes({ ...mealTimes, breakfast: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>昼食</Label>
              <Input
                type="time"
                value={mealTimes.lunch}
                onChange={(e) =>
                  setMealTimes({ ...mealTimes, lunch: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>夕食</Label>
              <Input
                type="time"
                value={mealTimes.dinner}
                onChange={(e) =>
                  setMealTimes({ ...mealTimes, dinner: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">食事内容の傾向</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="例: 外食が多い、野菜が少ない"
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">アレルギー・制限</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="カンマ区切り: 卵, 乳製品"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">改善目標</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="例: タンパク質を増やす、間食を減らす"
              value={improvementGoals}
              onChange={(e) => setImprovementGoals(e.target.value)}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "保存中..." : "保存"}
        </Button>
      </form>
    </div>
  );
}
