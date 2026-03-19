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

interface Exercise {
  name: string;
  weight: number;
  reps: number;
  sets: number;
}

interface PipelineJobData {
  id: string;
  status: string;
  structured_data: {
    exercises: Exercise[];
  } | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    const supabase = createClient();

    const { data, error: fetchError } = await supabase
      .from("pipeline_jobs")
      .select(
        "id, status, structured_data, error_message, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Failed to fetch job:", fetchError);
      setLoading(false);
      return;
    }

    const jobData = data as PipelineJobData;
    setJob(jobData);
    if (jobData.structured_data?.exercises) {
      setExercises(jobData.structured_data.exercises);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchJob();
  }, [id, fetchJob]);

  function updateExercise(
    index: number,
    field: keyof Exercise,
    value: string
  ) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;
        if (field === "name") return { ...ex, [field]: value };
        return { ...ex, [field]: Number(value) || 0 };
      })
    );
  }

  async function handleConfirm() {
    if (!job) return;
    setError(null);
    setConfirming(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("pipeline_jobs")
        .update({
          status: "confirmed",
          structured_data: { exercises },
        })
        .eq("id", job.id);

      if (updateError) throw updateError;

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

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground">
          セッション情報が見つかりません。
        </p>
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
        <h1 className="text-2xl font-bold">セッション確認</h1>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          戻る
        </Button>
      </div>

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
          <CardDescription>ジョブ ID: {job.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">作成日時</dt>
            <dd>{new Date(job.created_at).toLocaleString("ja-JP")}</dd>
            <dt className="text-muted-foreground">更新日時</dt>
            <dd>{new Date(job.updated_at).toLocaleString("ja-JP")}</dd>
          </dl>
        </CardContent>
      </Card>

      {isProcessing && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              データを処理中です。しばらくお待ちください...
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchJob}
            >
              更新
            </Button>
          </CardContent>
        </Card>
      )}

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
            {exercises.map((exercise, index) => (
              <div key={index}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-4">
                    <Label htmlFor={`name-${index}`}>種目名</Label>
                    <Input
                      id={`name-${index}`}
                      value={exercise.name}
                      onChange={(e) =>
                        updateExercise(index, "name", e.target.value)
                      }
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`weight-${index}`}>重量 (kg)</Label>
                    <Input
                      id={`weight-${index}`}
                      type="number"
                      value={exercise.weight}
                      onChange={(e) =>
                        updateExercise(index, "weight", e.target.value)
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
                </div>
              </div>
            ))}
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

      {job.status === "failed" && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive">
              処理に失敗しました。
              {job.error_message && (
                <span className="block mt-1">{job.error_message}</span>
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
    </div>
  );
}
