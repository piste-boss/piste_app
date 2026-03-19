"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SetData {
  id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  notes: string | null;
  exercise_name: string;
}

interface SessionDetail {
  id: string;
  session_date: string;
  status: string;
  trainer_notes: string | null;
  trainer_name: string;
  sets: SetData[];
}

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch session with ownership check
      const { data: sessionData } = await supabase
        .from("workout_sessions")
        .select("id, session_date, status, trainer_notes, trainer_id")
        .eq("id", id)
        .eq("member_id", user.id)
        .single();

      if (!sessionData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch trainer name
      const { data: trainer } = await supabase
        .from("users")
        .select("last_name, first_name")
        .eq("id", sessionData.trainer_id)
        .single();

      // Fetch sets with exercise names
      const { data: setsData } = await supabase
        .from("session_sets")
        .select("id, set_number, weight_kg, reps, notes, exercise_id, exercises(name)")
        .eq("session_id", id)
        .order("set_number", { ascending: true });

      const sets: SetData[] = (setsData ?? []).map((set) => {
        const ex = set.exercises as unknown as { name: string } | null;
        return {
          id: set.id,
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          reps: set.reps,
          notes: set.notes,
          exercise_name: ex?.name ?? "不明な種目",
        };
      });

      setSession({
        id: sessionData.id,
        session_date: sessionData.session_date,
        status: sessionData.status,
        trainer_notes: sessionData.trainer_notes,
        trainer_name: trainer
          ? `${trainer.last_name} ${trainer.first_name}`
          : "トレーナー",
        sets,
      });
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">セッションが見つかりません</p>
        <Button variant="outline" onClick={() => router.push("/records")}>
          一覧に戻る
        </Button>
      </div>
    );
  }

  // Group sets by exercise name
  const exerciseGroups: Record<string, SetData[]> = {};
  for (const set of session.sets) {
    if (!exerciseGroups[set.exercise_name]) {
      exerciseGroups[set.exercise_name] = [];
    }
    exerciseGroups[set.exercise_name].push(set);
  }

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
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2"
        onClick={() => router.push("/records")}
      >
        ← 一覧に戻る
      </Button>

      {/* Session header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {new Date(session.session_date).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </h1>
        <Badge variant="outline">{statusLabel(session.status)}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        担当: {session.trainer_name}
      </p>

      {/* Exercise cards */}
      {Object.keys(exerciseGroups).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            このセッションの詳細はまだ記録されていません
          </CardContent>
        </Card>
      ) : (
        Object.entries(exerciseGroups).map(([exerciseName, sets]) => (
          <Card key={exerciseName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{exerciseName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
                  <span>セット</span>
                  <span>重量</span>
                  <span>レップ</span>
                </div>
                {sets.map((set) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-3 gap-2 text-sm py-1.5 border-b border-dashed border-muted last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {set.set_number}
                    </span>
                    <span className="font-medium">
                      {set.weight_kg != null ? `${set.weight_kg} kg` : "-"}
                    </span>
                    <span className="font-medium">
                      {set.reps != null ? `${set.reps} 回` : "-"}
                    </span>
                  </div>
                ))}
              </div>
              {sets.some((s) => s.notes) && (
                <div className="mt-2 pt-2 border-t">
                  {sets
                    .filter((s) => s.notes)
                    .map((s) => (
                      <p
                        key={s.id}
                        className="text-xs text-muted-foreground"
                      >
                        セット{s.set_number}: {s.notes}
                      </p>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Trainer notes */}
      {session.trainer_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">トレーナーメモ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {session.trainer_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">
                {Object.keys(exerciseGroups).length}
              </p>
              <p className="text-xs text-muted-foreground">種目</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{session.sets.length}</p>
              <p className="text-xs text-muted-foreground">セット</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
