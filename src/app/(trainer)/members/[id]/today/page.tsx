"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  CounselingPersonality,
  WorkoutSession,
  AiMenuSuggestion,
} from "@/types/database";

interface SessionWithSets extends WorkoutSession {
  session_sets: Array<{
    id: string;
    exercise_id: string;
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    notes: string | null;
    exercises: { name: string } | null;
  }>;
}

export default function TodaySessionPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  const [personality, setPersonality] = useState<CounselingPersonality | null>(
    null
  );
  const [recentSessions, setRecentSessions] = useState<SessionWithSets[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState<AiMenuSuggestion | null>(
    null
  );
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adoptingMenu, setAdoptingMenu] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      const [
        { data: user },
        { data: pers },
        { data: sessions },
        { data: suggestion },
      ] = await Promise.all([
        supabase
          .from("users")
          .select("last_name, first_name")
          .eq("id", memberId)
          .single(),
        supabase
          .from("counseling_personality")
          .select("*")
          .eq("member_id", memberId)
          .single(),
        supabase
          .from("workout_sessions")
          .select(
            "*, session_sets(id, exercise_id, set_number, weight_kg, reps, notes, exercises:exercise_id(name))"
          )
          .eq("member_id", memberId)
          .order("session_date", { ascending: false })
          .limit(10),
        supabase
          .from("ai_menu_suggestions")
          .select("*")
          .eq("member_id", memberId)
          .eq("suggested_for_date", today)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (user) setMemberName(`${user.last_name} ${user.first_name}`);
      if (pers) setPersonality(pers);
      if (sessions)
        setRecentSessions(sessions as unknown as SessionWithSets[]);
      if (suggestion) setAiSuggestion(suggestion);
      setLoading(false);
    };
    load();
  }, [memberId]);

  async function handleAdoptSuggestion() {
    if (!aiSuggestion) return;
    setAdoptingMenu(true);
    try {
      const supabase = createClient();
      await supabase
        .from("ai_menu_suggestions")
        .update({ status: "accepted" })
        .eq("id", aiSuggestion.id);
      setAiSuggestion({ ...aiSuggestion, status: "accepted" });
    } catch (err) {
      console.error("Failed to adopt suggestion:", err);
    } finally {
      setAdoptingMenu(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const tips =
    (personality?.coaching_tips as { tips?: string[] })?.tips || [];

  // 種目ごとの重量推移を集計
  const exerciseHistory = buildExerciseHistory(recentSessions);

  // AI提案メニューの内容
  const suggestionExercises = (
    aiSuggestion?.suggestion as {
      exercises?: Array<{
        name: string;
        weightKg: number;
        reps: number;
        sets: number;
      }>;
    }
  )?.exercises;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {memberName} 様 - {today}
          </h1>
        </div>
        <Link href={`/sessions/new?member=${memberId}`}>
          <Button>新規セッション記録</Button>
        </Link>
      </div>

      {/* 性格タイプ・指導ポイント */}
      {personality && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              性格タイプ:
              <Badge variant="secondary" className="text-sm">
                {personality.training_style}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tips.length > 0 && (
              <>
                <h3 className="text-sm font-semibold mb-2">指導ポイント:</h3>
                <ul className="space-y-1.5">
                  {tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-0.5">*</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI提案メニュー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI提案メニュー</CardTitle>
          {aiSuggestion && (
            <CardDescription>
              {aiSuggestion.reasoning
                ? aiSuggestion.reasoning.slice(0, 100)
                : "過去データに基づく提案"}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {suggestionExercises && suggestionExercises.length > 0 ? (
            <div className="space-y-3">
              {suggestionExercises.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm"
                >
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-muted-foreground">
                    {ex.weightKg}kg x {ex.reps}回 x {ex.sets}セット
                  </span>
                </div>
              ))}
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAdoptSuggestion}
                  disabled={
                    adoptingMenu || aiSuggestion?.status === "accepted"
                  }
                >
                  {aiSuggestion?.status === "accepted"
                    ? "採用済み"
                    : adoptingMenu
                      ? "処理中..."
                      : "この提案を採用"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(`/sessions/new?member=${memberId}`)
                  }
                >
                  修正する
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                トレーニングデータが蓄積されるとAIが最適なメニューを提案します。
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" disabled variant="outline">
                  この提案を採用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(`/sessions/new?member=${memberId}`)
                  }
                >
                  修正する
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 過去メニュー: 重量推移 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            過去のメニュー（重量推移）
          </CardTitle>
          <CardDescription>
            各種目の最新セッションでの重量を一覧表示
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exerciseHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              過去のセッションはまだありません
            </p>
          ) : (
            <div className="space-y-4">
              {exerciseHistory.map((ex) => (
                <div key={ex.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{ex.name}</span>
                    <span className="text-xs text-muted-foreground">
                      最新: {ex.latestWeight}kg
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {ex.history.map((h, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div
                          className="rounded bg-primary/20 text-xs px-2 py-1 font-medium"
                          title={h.date}
                        >
                          {h.weight}kg
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {h.date.slice(5)}
                        </span>
                        {i < ex.history.length - 1 && (
                          <span className="text-muted-foreground mx-0.5 hidden">
                            →
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {ex.history.length >= 2 && (
                    <div className="mt-1">
                      {(() => {
                        const diff =
                          ex.history[ex.history.length - 1].weight -
                          ex.history[0].weight;
                        if (diff > 0)
                          return (
                            <span className="text-xs text-green-600">
                              +{diff}kg 上昇
                            </span>
                          );
                        if (diff < 0)
                          return (
                            <span className="text-xs text-red-600">
                              {diff}kg 下降
                            </span>
                          );
                        return (
                          <span className="text-xs text-muted-foreground">
                            変化なし
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  <Separator className="mt-3" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 過去セッション一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">セッション履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              過去のセッションはまだありません
            </p>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={
                      session.pipeline_job_id
                        ? `/sessions/${session.pipeline_job_id}`
                        : `/sessions/${session.id}`
                    }
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <div>
                      <span>{session.session_date}</span>
                      {session.session_sets &&
                        session.session_sets.length > 0 && (
                          <span className="ml-2 text-muted-foreground">
                            ({session.session_sets.length}セット)
                          </span>
                        )}
                    </div>
                    <Badge
                      variant={
                        session.status === "confirmed" ||
                        session.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {session.status === "pending"
                        ? "未確定"
                        : session.status === "confirmed"
                          ? "確定済"
                          : session.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** 過去セッションから種目ごとの重量推移を集計 */
function buildExerciseHistory(sessions: SessionWithSets[]) {
  const exerciseMap = new Map<
    string,
    Array<{ date: string; weight: number }>
  >();

  // セッションは新しい順なので reverse して古い順にする
  const sorted = [...sessions].reverse();

  for (const session of sorted) {
    if (!session.session_sets) continue;
    for (const set of session.session_sets) {
      const exerciseName =
        (set.exercises as unknown as { name: string } | null)?.name ??
        "不明な種目";
      if (set.weight_kg == null) continue;
      if (!exerciseMap.has(exerciseName)) {
        exerciseMap.set(exerciseName, []);
      }
      const history = exerciseMap.get(exerciseName)!;
      // 同じ日付の場合は最大重量に更新
      const existingEntry = history.find(
        (h) => h.date === session.session_date
      );
      if (existingEntry) {
        existingEntry.weight = Math.max(existingEntry.weight, set.weight_kg);
      } else {
        history.push({
          date: session.session_date,
          weight: set.weight_kg,
        });
      }
    }
  }

  return Array.from(exerciseMap.entries()).map(([name, history]) => ({
    name,
    history,
    latestWeight: history[history.length - 1]?.weight ?? 0,
  }));
}
