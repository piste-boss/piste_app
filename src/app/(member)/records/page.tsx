"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WorkoutSession } from "@/types/database";

export default function RecordsPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("member_id", user.id)
        .order("session_date", { ascending: false });

      if (data) setSessions(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">トレーニング記録</h1>
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            まだトレーニング記録がありません
          </CardContent>
        </Card>
      ) : (
        sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{session.session_date}</CardTitle>
                <Badge variant="outline">{session.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {session.trainer_notes || "メモなし"}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
