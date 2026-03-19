"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SessionWithExercises {
  id: string;
  session_date: string;
  status: string;
  trainer_notes: string | null;
  exercises: string[];
  set_count: number;
}

export default function RecordsPage() {
  const [sessions, setSessions] = useState<SessionWithExercises[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch sessions
      const { data: sessionData } = await supabase
        .from("workout_sessions")
        .select("id, session_date, status, trainer_notes")
        .eq("member_id", user.id)
        .order("session_date", { ascending: false });

      if (!sessionData) {
        setLoading(false);
        return;
      }

      // For each session, fetch associated sets with exercise names
      const enriched: SessionWithExercises[] = [];
      for (const session of sessionData) {
        const { data: sets } = await supabase
          .from("session_sets")
          .select("exercise_id, set_number, exercises(name)")
          .eq("session_id", session.id)
          .order("set_number", { ascending: true });

        const exerciseNames = new Set<string>();
        if (sets) {
          for (const set of sets) {
            const ex = set.exercises as unknown as { name: string } | null;
            if (ex?.name) exerciseNames.add(ex.name);
          }
        }

        enriched.push({
          ...session,
          exercises: Array.from(exerciseNames),
          set_count: sets?.length ?? 0,
        });
      }

      setSessions(enriched);
      setLoading(false);
    };
    load();
  }, []);

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

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default" as const;
      case "confirmed":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  // Group sessions by month
  const groupedByMonth: Record<string, SessionWithExercises[]> = {};
  for (const session of sessions) {
    const date = new Date(session.session_date);
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(session);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">トレーニング記録</h1>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-muted-foreground">
              まだトレーニング記録がありません
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              トレーナーがセッションを記録すると、ここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByMonth).map(([month, monthSessions]) => (
          <div key={month}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              {month}
            </h2>
            <div className="space-y-2">
              {monthSessions.map((session) => (
                <Link key={session.id} href={`/records/${session.id}`}>
                  <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {new Date(session.session_date).toLocaleDateString(
                            "ja-JP",
                            {
                              month: "short",
                              day: "numeric",
                              weekday: "short",
                            }
                          )}
                        </CardTitle>
                        <Badge variant={statusVariant(session.status)}>
                          {statusLabel(session.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {session.exercises.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {session.exercises.slice(0, 3).join("、")}
                            {session.exercises.length > 3 &&
                              ` 他${session.exercises.length - 3}種目`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.set_count}セット
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {session.trainer_notes || "詳細なし"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
