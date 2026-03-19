"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface MemberProfile {
  id: string;
  last_name: string;
  first_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
}

interface CounselingStatus {
  personality: boolean;
  body: boolean;
  diet: boolean;
}

interface Session {
  id: string;
  session_date: string;
  status: string;
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [counseling, setCounseling] = useState<CounselingStatus>({
    personality: false,
    body: false,
    diet: false,
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [memberRes, personalityRes, bodyRes, dietRes, sessionsRes] =
        await Promise.all([
          supabase
            .from("users")
            .select(
              "id, last_name, first_name, email, phone, date_of_birth, created_at"
            )
            .eq("id", id)
            .single(),
          supabase
            .from("counseling_personality")
            .select("id")
            .eq("member_id", id)
            .limit(1),
          supabase
            .from("counseling_body")
            .select("id")
            .eq("member_id", id)
            .limit(1),
          supabase
            .from("counseling_diet")
            .select("id")
            .eq("member_id", id)
            .limit(1),
          supabase
            .from("workout_sessions")
            .select("id, session_date, status")
            .eq("member_id", id)
            .order("session_date", { ascending: false })
            .limit(5),
        ]);

      if (memberRes.data) setMember(memberRes.data as MemberProfile);
      setCounseling({
        personality: (personalityRes.data?.length ?? 0) > 0,
        body: (bodyRes.data?.length ?? 0) > 0,
        diet: (dietRes.data?.length ?? 0) > 0,
      });
      if (sessionsRes.data) setSessions(sessionsRes.data as Session[]);

      setLoading(false);
    }

    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground">会員情報が見つかりません。</p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    pending: "未確定",
    confirmed: "確定済",
    completed: "完了",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {member.last_name} {member.first_name}
        </h1>
        <Link href="/members">
          <Button variant="outline" size="sm">
            一覧に戻る
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">メール</dt>
            <dd>{member.email}</dd>
            <dt className="text-muted-foreground">電話番号</dt>
            <dd>{member.phone ?? "未登録"}</dd>
            <dt className="text-muted-foreground">生年月日</dt>
            <dd>
              {member.date_of_birth
                ? new Date(member.date_of_birth).toLocaleDateString("ja-JP")
                : "未登録"}
            </dd>
            <dt className="text-muted-foreground">登録日</dt>
            <dd>{new Date(member.created_at).toLocaleDateString("ja-JP")}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>カウンセリング状況</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant={counseling.personality ? "default" : "outline"}>
            {counseling.personality ? "完了" : "未実施"} : 性格診断
          </Badge>
          <Badge variant={counseling.body ? "default" : "outline"}>
            {counseling.body ? "完了" : "未実施"} : 体のお悩み
          </Badge>
          <Badge variant={counseling.diet ? "default" : "outline"}>
            {counseling.diet ? "完了" : "未実施"} : 食事
          </Badge>
          <div className="w-full pt-2">
            <Link href={`/members/${id}/counseling`}>
              <Button variant="outline" size="sm">
                カウンセリング管理へ
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近のセッション</CardTitle>
          <CardDescription>直近5件を表示</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              セッション記録がありません。
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <span>
                      {new Date(session.session_date).toLocaleDateString(
                        "ja-JP"
                      )}
                    </span>
                    <Badge
                      variant={
                        session.status === "confirmed" ||
                        session.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabel[session.status] ?? session.status}
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
