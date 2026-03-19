"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BODY_CONCERNS = [
  "肩こり", "腰痛", "膝の痛み", "姿勢の悪さ", "猫背",
  "反り腰", "O脚/X脚", "冷え性", "むくみ", "その他",
];

const GOALS = [
  "ダイエット", "筋力UP", "姿勢改善", "体力向上",
  "柔軟性向上", "ボディメイク", "健康維持", "リハビリ",
];

export default function BodyCounselingPage() {
  const params = useParams();
  const router = useRouter();
  const [concerns, setConcerns] = useState<string[]>([]);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from("counseling_body").upsert({
      member_id: params.id as string,
      concerns: { items: concerns },
      medical_history: medicalHistory,
      goals: { items: goals },
    });
    setLoading(false);
    router.back();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">体のお悩み</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">気になる部位・症状</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {BODY_CONCERNS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(concerns, setConcerns, item)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  concerns.includes(item)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {item}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">既往歴・ケガ</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="過去のケガや病歴があれば記入"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">目標</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {GOALS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(goals, setGoals, item)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  goals.includes(item)
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {item}
              </button>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "保存中..." : "保存"}
        </Button>
      </form>
    </div>
  );
}
