"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MemberOption {
  id: string;
  last_name: string;
  first_name: string;
}

interface ManualExercise {
  name: string;
  weightKg: string;
  reps: string;
  sets: string;
  notes: string;
}

const emptyExercise: ManualExercise = {
  name: "",
  weightKg: "",
  reps: "",
  sets: "",
  notes: "",
};

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><p className="text-sm text-muted-foreground">読み込み中...</p></div>}>
      <NewSessionContent />
    </Suspense>
  );
}

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMember = searchParams.get("member") ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState(preselectedMember);
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [trainerNotes, setTrainerNotes] = useState("");

  // ファイルアップロードモード
  const [file, setFile] = useState<File | null>(null);

  // 手動入力モード
  const [exercises, setExercises] = useState<ManualExercise[]>([
    { ...emptyExercise },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | number | null>("upload");

  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("trainer_members")
        .select("member_id")
        .eq("trainer_id", user.id)
        .eq("status", "active");

      if (!data || data.length === 0) return;

      const memberIds = data.map((row) => row.member_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, last_name, first_name")
        .in("id", memberIds);

      setMembers((users ?? []) as MemberOption[]);
    }

    fetchMembers();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  }

  function addExercise() {
    setExercises((prev) => [...prev, { ...emptyExercise }]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExercise(
    index: number,
    field: keyof ManualExercise,
    value: string
  ) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  }

  // ファイルアップロード → パイプライン起動
  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError("会員を選択してください。");
      return;
    }
    if (!file) {
      setError("音声またはテキストファイルをアップロードしてください。");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("認証エラー");

      const ext = file.name.split(".").pop();
      const filePath = `sessions/${user.id}/${Date.now()}.${ext}`;

      // Supabase Storage にアップロード
      const { error: uploadError } = await supabase.storage
        .from("inbox")
        .upload(filePath, file);

      if (uploadError) throw new Error(`アップロード失敗: ${uploadError.message}`);

      // パイプライン起動
      const res = await fetch("/api/pipeline/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainer_id: user.id,
          member_id: selectedMemberId,
          session_date: sessionDate,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "送信に失敗しました。");
      }

      const result = await res.json();
      router.push(`/sessions/${result.job_id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "エラーが発生しました。";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // 手動入力 → workout_sessions + session_sets 直接保存
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError("会員を選択してください。");
      return;
    }

    const validExercises = exercises.filter((ex) => ex.name.trim());
    if (validExercises.length === 0) {
      setError("少なくとも1つの種目を入力してください。");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("認証エラー");

      // workout_session を作成
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          member_id: selectedMemberId,
          trainer_id: user.id,
          session_date: sessionDate,
          status: "confirmed",
          trainer_notes: trainerNotes || null,
        })
        .select("id")
        .single();

      if (sessionError || !session) {
        throw new Error(
          `セッション作成に失敗: ${sessionError?.message ?? "不明"}`
        );
      }

      // 種目ごとにセットを登録
      for (const ex of validExercises) {
        // exercises マスターから検索（なければ作成）
        let exerciseId: string;
        const { data: existing } = await supabase
          .from("exercises")
          .select("id")
          .eq("name", ex.name.trim())
          .limit(1)
          .single();

        if (existing) {
          exerciseId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("exercises")
            .insert({
              name: ex.name.trim(),
              muscle_group: "その他",
              created_by: user.id,
            })
            .select("id")
            .single();
          if (createErr || !created)
            throw new Error(`種目の作成に失敗: ${ex.name}`);
          exerciseId = created.id;
        }

        const setCount = parseInt(ex.sets) || 1;
        const setsToInsert = Array.from({ length: setCount }, (_, i) => ({
          session_id: session.id,
          exercise_id: exerciseId,
          set_number: i + 1,
          weight_kg: parseFloat(ex.weightKg) || null,
          reps: parseInt(ex.reps) || null,
          notes: ex.notes || null,
        }));

        await supabase.from("session_sets").insert(setsToInsert);
      }

      router.push(`/members/${selectedMemberId}/today`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "エラーが発生しました。";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>セッション記録</CardTitle>
          <CardDescription>
            会員を選択し、ファイルアップロードまたは手動入力で記録してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 共通: 会員選択・日付 */}
          <div className="space-y-2">
            <Label htmlFor="member">会員</Label>
            <select
              id="member"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">選択してください</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.last_name} {m.first_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">セッション日</Label>
            <Input
              id="date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          <Separator />

          {/* タブ: アップロード / 手動入力 */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">ファイルアップロード</TabsTrigger>
              <TabsTrigger value="manual">手動入力</TabsTrigger>
            </TabsList>

            {/* ファイルアップロードタブ */}
            <TabsContent value="upload">
              <form onSubmit={handleFileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">音声 / テキストファイル</Label>
                  <Input
                    id="file"
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.aac,.txt,.md"
                    onChange={handleFileChange}
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    音声ファイル (.m4a, .mp3, .wav 等) → Whisper で文字起こし →
                    Gemini で構造化
                    <br />
                    テキストファイル (.txt, .md) → Gemini で構造化
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "送信中..." : "アップロードして記録開始"}
                </Button>
              </form>
            </TabsContent>

            {/* 手動入力タブ */}
            <TabsContent value="manual">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {exercises.map((ex, index) => (
                  <div key={index} className="space-y-3">
                    {index > 0 && <Separator />}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        種目 {index + 1}
                      </span>
                      {exercises.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExercise(index)}
                          className="text-destructive"
                        >
                          削除
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor={`name-${index}`}>種目名</Label>
                        <Input
                          id={`name-${index}`}
                          placeholder="例: ベンチプレス"
                          value={ex.name}
                          onChange={(e) =>
                            updateExercise(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`weight-${index}`}>重量 (kg)</Label>
                        <Input
                          id={`weight-${index}`}
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="60"
                          value={ex.weightKg}
                          onChange={(e) =>
                            updateExercise(index, "weightKg", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`reps-${index}`}>レップ数</Label>
                        <Input
                          id={`reps-${index}`}
                          type="number"
                          min="0"
                          placeholder="10"
                          value={ex.reps}
                          onChange={(e) =>
                            updateExercise(index, "reps", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`sets-${index}`}>セット数</Label>
                        <Input
                          id={`sets-${index}`}
                          type="number"
                          min="1"
                          placeholder="3"
                          value={ex.sets}
                          onChange={(e) =>
                            updateExercise(index, "sets", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`notes-${index}`}>メモ</Label>
                        <Input
                          id={`notes-${index}`}
                          placeholder="フォーム注意等"
                          value={ex.notes}
                          onChange={(e) =>
                            updateExercise(index, "notes", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExercise}
                  className="w-full"
                >
                  + 種目を追加
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="notes">トレーナーメモ</Label>
                  <Input
                    id="notes"
                    placeholder="全体的なコメント"
                    value={trainerNotes}
                    onChange={(e) => setTrainerNotes(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "保存中..." : "セッションを保存"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
