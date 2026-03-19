"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeightChart } from "@/components/charts/weight-chart";

interface RecentSession {
  id: string;
  session_date: string;
  status: string;
  trainer_notes: string | null;
  exercise_count: number;
}

interface WeightEntry {
  recorded_at: string;
  weight_kg: number;
}

interface NextSchedule {
  id: string;
  session_date: string;
  trainer_name: string;
}

export default function MemberDashboard() {
  const [userName, setUserName] = useState("");
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [nextSchedule, setNextSchedule] = useState<NextSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load user name
      const { data: userData } = await supabase
        .from("users")
        .select("last_name, first_name")
        .eq("id", user.id)
        .single();

      if (userData) {
        setUserName(`${userData.last_name} ${userData.first_name}`);
      }

      // Load recent sessions (last 3)
      const { data: sessionData } = await supabase
        .from("workout_sessions")
        .select("id, session_date, status, trainer_notes")
        .eq("member_id", user.id)
        .order("session_date", { ascending: false })
        .limit(3);

      if (sessionData) {
        const sessionsWithCounts: RecentSession[] = [];
        for (const session of sessionData) {
          const { count } = await supabase
            .from("session_sets")
            .select("exercise_id", { count: "exact", head: true })
            .eq("session_id", session.id);

          sessionsWithCounts.push({
            ...session,
            exercise_count: count ?? 0,
          });
        }
        setRecentSessions(sessionsWithCounts);
      }

      // Load recent weight data (last 14 entries)
      const { data: weightData } = await supabase
        .from("body_weight")
        .select("recorded_at, weight_kg")
        .eq("member_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(14);

      if (weightData) setWeights(weightData);

      // Look for future sessions as "next schedule"
      const today = new Date().toISOString().slice(0, 10);
      const { data: futureSession } = await supabase
        .from("workout_sessions")
        .select("id, session_date, trainer_id")
        .eq("member_id", user.id)
        .gte("session_date", today)
        .order("session_date", { ascending: true })
        .limit(1)
        .single();

      if (futureSession) {
        const { data: trainer } = await supabase
          .from("users")
          .select("last_name, first_name")
          .eq("id", futureSession.trainer_id)
          .single();

        setNextSchedule({
          id: futureSession.id,
          session_date: futureSession.session_date,
          trainer_name: trainer
            ? `${trainer.last_name} ${trainer.first_name}`
            : "トレーナー",
        });
      }

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const weightChartData = weights.map((w) => ({
    date: new Date(w.recorded_at).toLocaleDateString("ja-JP"),
    weight: Number(w.weight_kg),
  }));

  const statusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "完了";
      case "confirmed":
        return "確認済";
      case "pending":
        return "未確認";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        {userName ? `${userName} さんのマイページ` : "マイページ"}
      </h1>

      {/* Next Schedule */}
      {nextSchedule && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">次回の予定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {new Date(nextSchedule.session_date).toLocaleDateString("ja-JP", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  担当: {nextSchedule.trainer_name}
                </p>
              </div>
              <Badge>予定</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Training */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              直近のトレーニング
            </CardTitle>
            <Link href="/records">
              <Button variant="ghost" size="sm" className="text-xs">
                すべて見る
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだトレーニング記録がありません
            </p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/records/${session.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(session.session_date).toLocaleDateString(
                          "ja-JP",
                          {
                            month: "short",
                            day: "numeric",
                            weekday: "short",
                          }
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.exercise_count > 0
                          ? `${session.exercise_count}セット`
                          : "記録なし"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {statusLabel(session.status)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weight Mini Graph */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">体重推移</CardTitle>
            <Link href="/weight">
              <Button variant="ghost" size="sm" className="text-xs">
                記録する
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {weights.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                体重を記録してグラフで確認しましょう
              </p>
              <Link href="/weight">
                <Button variant="outline" size="sm">
                  体重を記録
                </Button>
              </Link>
            </div>
          ) : (
            <WeightChart data={weightChartData} />
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/photos">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <span className="text-2xl mb-1">📸</span>
              <span className="text-sm font-medium">体形変化</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/weight">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <span className="text-2xl mb-1">⚖️</span>
              <span className="text-sm font-medium">体重記録</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
