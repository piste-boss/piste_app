"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

interface MemberOption {
  id: string;
  last_name: string;
  first_name: string;
}

export default function NewSessionPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
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

      const { error: uploadError } = await supabase.storage
        .from("session-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const res = await fetch("/api/pipeline/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainer_id: user.id,
          member_id: selectedMemberId,
          session_date: sessionDate,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "送信に失敗しました。");
      }

      const result = await res.json();
      router.push(`/sessions/${result.job_id ?? result.id}`);
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
            会員を選択し、セッションの音声またはテキストファイルをアップロードしてください。
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member">会員</Label>
              <select
                id="member"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

            <div className="space-y-2">
              <Label htmlFor="file">音声 / テキストファイル</Label>
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept="audio/*,.txt,.csv,.json"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "送信中..." : "アップロードして記録開始"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
