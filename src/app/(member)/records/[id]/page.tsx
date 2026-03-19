"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionSet {
  id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number;
  reps: number;
}

interface WorkoutSession {
  id: string;
  session_date: string;
  trainer_memo: string | null;
  session_sets: SessionSet[];
}

export default function RecordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("workout_sessions")
        .select("id, session_date, trainer_memo, session_sets(*)")
        .eq("id", id)
        .single();

      if (data) {
        const sorted = {
          ...data,
          session_sets: (data.session_sets as SessionSet[]).sort(
            (a, b) =>
              a.exercise_name.localeCompare(b.exercise_name) ||
              a.set_number - b.set_number
          ),
        };
        setSession(sorted);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="p-4">読み込み中...</div>;
  if (!session) return <div className="p-4">セッションが見つかりません</div>;

  // Group sets by exercise name
  const exerciseGroups: Record<string, SessionSet[]> = {};
  for (const set of session.session_sets) {
    if (!exerciseGroups[set.exercise_name]) {
      exerciseGroups[set.exercise_name] = [];
    }
    exerciseGroups[set.exercise_name].push(set);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        {new Date(session.session_date).toLocaleDateString("ja-JP")} のトレーニング
      </h1>

      {Object.entries(exerciseGroups).map(([exerciseName, sets]) => (
        <Card key={exerciseName}>
          <CardHeader>
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
                  className="grid grid-cols-3 gap-2 text-sm py-1"
                >
                  <span>{set.set_number}</span>
                  <span>{set.weight_kg} kg</span>
                  <span>{set.reps} 回</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {session.trainer_memo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">トレーナーメモ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{session.trainer_memo}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
