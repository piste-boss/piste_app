"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CounselingPersonality, WorkoutSession } from "@/types/database";

export default function TodaySessionPage() {
  const params = useParams();
  const memberId = params.id as string;
  const [personality, setPersonality] = useState<CounselingPersonality | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [{ data: user }, { data: pers }, { data: sessions }] = await Promise.all([
        supabase.from("users").select("last_name, first_name").eq("id", memberId).single(),
        supabase.from("counseling_personality").select("*").eq("member_id", memberId).single(),
        supabase
          .from("workout_sessions")
          .select("*")
          .eq("member_id", memberId)
          .order("session_date", { ascending: false })
          .limit(5),
      ]);

      if (user) setMemberName(`${user.last_name} ${user.first_name}`);
      if (pers) setPersonality(pers);
      if (sessions) setRecentSessions(sessions);
      setLoading(false);
    };
    load();
  }, [memberId]);

  if (loading) return <div className="p-6">読み込み中...</div>;

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const tips = (personality?.coaching_tips as { tips?: string[] })?.tips || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{memberName} 様 - {today}</h1>
      </div>

      {personality && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              性格タイプ:
              <Badge variant="secondary">{personality.training_style}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-semibold mb-2">指導ポイント:</h3>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  ・{tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI提案メニュー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            トレーニングデータが蓄積されるとAIが最適なメニューを提案します
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm">この提案を採用</Button>
            <Button size="sm" variant="outline">修正する</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">過去のメニュー</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">過去のセッションはまだありません</p>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span>{session.session_date}</span>
                  <Badge variant="outline">{session.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
