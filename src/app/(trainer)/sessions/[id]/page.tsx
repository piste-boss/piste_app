"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface ExerciseSet {
  setNumber: number;
  weightKg: number;
  reps: number;
}

interface StructuredExercise {
  exerciseName: string;
  sets: ExerciseSet[];
  notes?: string;
}

interface PipelineJobData {
  id: string;
  status: string;
  route: string;
  whisper_result: string | null;
  structured_data: {
    exercises: StructuredExercise[];
    trainerNotes?: string;
  } | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  inbox_file_id: string;
}

interface InboxFileData {
  member_id: string;
  uploaded_by: string;
  original_filename: string;
}

/** 手動修正用の展開したフラット形式 */
interface FlatExercise {
  exerciseName: string;
  weightKg: number;
  reps: number;
  sets: number;
  notes: string;
}

const statusLabels: Record<string, string> = {
  queued: "待機中",
  transcribing: "文字起こし中",
  structuring: "構造化中",
  pending_review: "レビュー待ち",
  confirmed: "確定済",
  failed: "失敗",
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<PipelineJobData | null>(null);
  const [inboxFile, setInboxFile] = useState<InboxFileData | null>(null);
  const [exercises, setExercises] = useState<FlatExercise[]>([]);
  const [trainerNotes, setTrainerNotes] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");

  const fetchJob = useCallback(async () => {
    const supabase = createClient();

    const { data, error: fetchError } = await supabase
      .from("pipeline_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !data) {
      // IDがworkout_sessionsのIDかもしれない → セッション直接表示
      const { data: sessionData } = await supabase
        .from("workout_sessions")
        .select(
          "*, session_sets(*, exercises:exercise_id(name))"
        )
        .eq("id", id)
        .single();

      if (sessionData) {
        // workout_session を直接表示
        setJob(null);
        // セッション情報をexercisesに変換
        const sessionSets = (sessionData.session_sets || []) as Array<{
          exercise_id: string;
          set_number: number;
          weight_kg: number | null;
          reps: number | null;
          notes: string | null;
          exercises: { name: string } | null;
        }>;

        // 種目ごとにグループ化
        const grouped = new Map<string, FlatExercise>();
        for (const s of sessionSets) {
          const name = (s.exercises as unknown as { name: string } | null)?.name ?? "不明";
          if (!grouped.has(name)) {
            grouped.set(name, {
              exerciseName: name,
              weightKg: s.weight_kg ?? 0,
              reps: s.reps ?? 0,
              sets: 0,
              notes: s.notes ?? "",
            });
          }
          const entry = grouped.get(name)!;
          entry.sets += 1;
          entry.weightKg = Math.max(entry.weightKg, s.weight_kg ?? 0);
        }
        setExercises(Array.from(grouped.values()));
        setTrainerNotes(sessionData.trainer_notes ?? "");
        setSessionDate(sessionData.session_date);

        // 会員名を取得
        const { data: memberData } = await supabase
          .from("users")
          .select("last_name, first_name")
          .eq("id", sessionData.member_id)
          .single();
        if (memberData)
          setMemberName(
            `${memberData.last_name} ${memberData.first_name}`
          );
      }
      setLoading(false);
      return;
    }

    const jobData = data as PipelineJobData;
    setJob(jobData);

    // 構造化データをフラット形式に変換
    if (jobData.structured_data?.exercises) {
      const flat: FlatExercise[] = jobData.structured_data.exercises.map(
        (ex) => ({
          exerciseName: ex.exerciseName,
          weightKg:
            ex.sets && ex.sets.length > 0
              ? Math.max(...ex.sets.map((s) => s.weightKg))
              : 0,
          reps:
            ex.sets && ex.sets.length > 0
              ? Math.round(
                  ex.sets.reduce((sum, s) => sum + s.reps, 0) / ex.sets.length
                )
              : 0,
          sets: ex.sets ? ex.sets.length : 1,
          notes: ex.notes ?? "",
        })
      );
      setExercises(flat);
      setTrainerNotes(jobData.structured_data.trainerNotes ?? "");
    }

    // inbox_file から会員情報取得
    if (jobData.inbox_file_id) {
      const { data: fileData } = await supabase
        .from("inbox_files")
        .select("member_id, uploaded_by, original_filename")
        .eq("id", jobData.inbox_file_id)
        .single();

      if (fileData) {
        setInboxFile(fileData);
        const { data: memberData } = await supabase
          .from("users")
          .select("last_name, first_name")
          .eq("id", fileData.member_id)
          .single();
        if (memberData)
          setMemberName(
            `${memberData.last_name} ${memberData.first_name}`
          );
      }
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchJob();
  }, [id, fetchJob]);

  // 種目の編集
  function updateExercise(
    index: number,
    field: keyof FlatExercise,
    value: string
  ) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;
        if (field === "exerciseName" || field === "notes")
          return { ...ex, [field]: value };
        return { ...ex, [field]: Number(value) || 0 };
      })
    );
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { exerciseName: "", weightKg: 0, reps: 0, sets: 1, notes: "" },
    ]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  // 確定: pipeline_jobs を confirmed に + workout_sessions/session_sets 作成
  async function handleConfirm() {
    if (!job || !inboxFile) return;
    setError(null);
    setConfirming(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("認証エラー");

      // pipeline_jobs を confirmed に
      const { error: updateError } = await supabase
        .from("pipeline_jobs")
        .update({
          status: "confirmed",
          structured_data: {
            exercises: exercises.map((ex) => ({
              exerciseName: ex.exerciseName,
              sets: Array.from({ length: ex.sets }, (_, i) => ({
                setNumber: i + 1,
                weightKg: ex.weightKg,
                reps: ex.reps,
              })),
              notes: ex.notes,
            })),
            trainerNotes,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (updateError) throw updateError;

      // workout_session を作成
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          member_id: inboxFile.member_id,
          trainer_id: user.id,
          pipeline_job_id: job.id,
          session_date: sessionDate,
          status: "confirmed",
          voice_transcript: job.whisper_result ?? null,
          trainer_notes: trainerNotes || null,
        })
        .select("id")
        .single();

      if (sessionError || !session) {
        throw new Error(
          `セッション作成に失敗: ${sessionError?.message ?? "不明"}`
        );
      }

      // session_sets を作成
      for (const ex of exercises) {
        if (!ex.exerciseName.trim()) continue;

        // exercises マスターから検索
        let exerciseId: string;
        const { data: existing } = await supabase
          .from("exercises")
          .select("id")
          .eq("name", ex.exerciseName.trim())
          .limit(1)
          .single();

        if (existing) {
          exerciseId = existing.id;
        } else {
          const { data: created } = await supabase
            .from("exercises")
            .insert({
              name: ex.exerciseName.trim(),
              muscle_group: "その他",
              created_by: user.id,
            })
            .select("id")
            .single();
          if (!created) continue;
          exerciseId = created.id;
        }

        const setsToInsert = Array.from({ length: ex.sets }, (_, i) => ({
          session_id: session.id,
          exercise_id: exerciseId,
          set_number: i + 1,
          weight_kg: ex.weightKg || null,
          reps: ex.reps || null,
          notes: ex.notes || null,
        }));

        await supabase.from("session_sets").insert(setsToInsert);
      }

      await fetchJob();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "確定に失敗しました。";
      setError(message);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // パイプラインジョブなし → workout_session 直接表示
  if (!job) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">セッション詳細</h1>
            {memberName && (
              <p className="text-sm text-muted-foreground mt-1">
                {memberName} 様 - {sessionDate}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            戻る
          </Button>
        </div>

        {exercises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>トレーニング種目</CardTitle>
              <CardDescription>確定済みの記録です。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exercises.map((exercise, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1 sm:col-span-4">
                      <Label>種目名</Label>
                      <Input value={exercise.exerciseName} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label>重量 (kg)</Label>
                      <Input value={exercise.weightKg} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label>レップ数</Label>
                      <Input value={exercise.reps} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label>セット数</Label>
                      <Input value={exercise.sets} disabled />
                    </div>
                    <div className="space-y-1">
                      <Label>メモ</Label>
                      <Input value={exercise.notes} disabled />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {trainerNotes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">トレーナーメモ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{trainerNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const isEditable = job.status === "pending_review";
  const isProcessing =
    job.status === "queued" ||
    job.status === "transcribing" ||
    job.status === "structuring";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">セッション確認</h1>
          {memberName && (
            <p className="text-sm text-muted-foreground mt-1">
              {memberName} 様
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          戻る
        </Button>
      </div>

      {/* パイプライン状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            パイプライン状況
            <Badge
              variant={
                job.status === "confirmed"
                  ? "default"
                  : job.status === "failed"
                    ? "destructive"
                    : "secondary"
              }
            >
              {statusLabels[job.status] ?? job.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            {inboxFile
              ? `ファイル: ${inboxFile.original_filename}`
              : `ジョブ ID: ${job.id.slice(0, 8)}...`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">ルート</dt>
            <dd>{job.route === "audio" ? "音声パイプライン" : "テキストパイプライン"}</dd>
            <dt className="text-muted-foreground">作成日時</dt>
            <dd>{new Date(job.created_at).toLocaleString("ja-JP")}</dd>
            <dt className="text-muted-foreground">更新日時</dt>
            <dd>{new Date(job.updated_at).toLocaleString("ja-JP")}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* 文字起こし結果 (Route A) */}
      {job.whisper_result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">文字起こし結果</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {job.whisper_result}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 処理中 */}
      {isProcessing && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
            <p className="text-muted-foreground">
              {job.status === "transcribing"
                ? "音声を文字起こし中です..."
                : job.status === "structuring"
                  ? "テキストを構造化中です..."
                  : "処理を待機中です..."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchJob}
            >
              状態を更新
            </Button>
          </CardContent>
        </Card>
      )}

      {/* トレーニング種目: 編集 / 表示 */}
      {exercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>トレーニング種目</CardTitle>
            <CardDescription>
              {isEditable
                ? "内容を確認・修正し、確定ボタンを押してください。"
                : "記録された種目の一覧です。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditable && (
              <div className="space-y-2">
                <Label htmlFor="session-date">セッション日</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
            )}

            {exercises.map((exercise, index) => (
              <div key={index}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    種目 {index + 1}
                  </span>
                  {isEditable && exercises.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercise(index)}
                      className="text-destructive"
                    >
                      削除
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-4">
                    <Label htmlFor={`name-${index}`}>種目名</Label>
                    <Input
                      id={`name-${index}`}
                      value={exercise.exerciseName}
                      onChange={(e) =>
                        updateExercise(index, "exerciseName", e.target.value)
                      }
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`weight-${index}`}>重量 (kg)</Label>
                    <Input
                      id={`weight-${index}`}
                      type="number"
                      step="0.5"
                      value={exercise.weightKg}
                      onChange={(e) =>
                        updateExercise(index, "weightKg", e.target.value)
                      }
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`reps-${index}`}>レップ数</Label>
                    <Input
                      id={`reps-${index}`}
                      type="number"
                      value={exercise.reps}
                      onChange={(e) =>
                        updateExercise(index, "reps", e.target.value)
                      }
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`sets-${index}`}>セット数</Label>
                    <Input
                      id={`sets-${index}`}
                      type="number"
                      value={exercise.sets}
                      onChange={(e) =>
                        updateExercise(index, "sets", e.target.value)
                      }
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`notes-${index}`}>メモ</Label>
                    <Input
                      id={`notes-${index}`}
                      value={exercise.notes}
                      onChange={(e) =>
                        updateExercise(index, "notes", e.target.value)
                      }
                      disabled={!isEditable}
                    />
                  </div>
                </div>
              </div>
            ))}

            {isEditable && (
              <Button
                variant="outline"
                size="sm"
                onClick={addExercise}
                className="w-full"
              >
                + 種目を追加
              </Button>
            )}

            {/* トレーナーメモ */}
            <Separator />
            <div className="space-y-1">
              <Label htmlFor="trainer-notes">トレーナーメモ</Label>
              <Input
                id="trainer-notes"
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                disabled={!isEditable}
                placeholder="全体的なコメント"
              />
            </div>
          </CardContent>
          {isEditable && (
            <CardFooter className="flex-col gap-2">
              {error && (
                <p className="w-full text-sm text-destructive">{error}</p>
              )}
              <Button
                className="w-full"
                disabled={confirming}
                onClick={handleConfirm}
              >
                {confirming ? "確定中..." : "確定する"}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* 失敗 */}
      {job.status === "failed" && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">
              処理に失敗しました。
              {job.error_message && (
                <span className="block mt-1 text-xs">
                  {job.error_message}
                </span>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/sessions/new")}
            >
              新規セッション記録
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 確定済み */}
      {job.status === "confirmed" && exercises.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              このセッションは確定済みです。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
