"use client";

import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  todaySessions: number;
  memberCount: number;
  pendingReviews: number;
}

interface RecentSession {
  id: string;
  session_date: string;
  status: string;
  member_name: string;
  member_id: string;
}

interface PendingJob {
  id: string;
  status: string;
  created_at: string;
  member_name: string;
}

export default function TrainerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySessions: 0,
    memberCount: 0,
    pendingReviews: 0,
  });
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      // 並列で全データ取得
      const [membersRes, todaySessionsRes, pendingJobsRes, recentRes] =
        await Promise.all([
          // 担当会員数
          supabase
            .from("trainer_members")
            .select("id", { count: "exact", head: true })
            .eq("trainer_id", user.id)
            .eq("status", "active"),
          // 本日のセッション数
          supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("trainer_id", user.id)
            .eq("session_date", today),
          // 未確認パイプラインジョブ
          supabase
            .from("pipeline_jobs")
            .select("id, status, created_at, inbox_files(member_id)")
            .in("status", ["queued", "transcribing", "structuring", "pending_review"])
            .order("created_at", { ascending: false })
            .limit(10),
          // 最近のセッション
          supabase
            .from("workout_sessions")
            .select("id, session_date, status, member_id")
            .eq("trainer_id", user.id)
            .order("session_date", { ascending: false })
            .limit(5),
        ]);

      setStats({
        todaySessions: todaySessionsRes.count ?? 0,
        memberCount: membersRes.count ?? 0,
        pendingReviews: pendingJobsRes.data?.length ?? 0,
      });

      // 最近のセッション: 会員名を取得
      if (recentRes.data && recentRes.data.length > 0) {
        const memberIds = [
          ...new Set(recentRes.data.map((s) => s.member_id)),
        ];
        const { data: users } = await supabase
          .from("users")
          .select("id, last_name, first_name")
          .in("id", memberIds);
        const nameMap = new Map(
          (users ?? []).map((u) => [
            u.id,
            `${u.last_name} ${u.first_name}`,
          ])
        );
        setRecentSessions(
          recentRes.data.map((s) => ({
            id: s.id,
            session_date: s.session_date,
            status: s.status,
            member_name: nameMap.get(s.member_id) ?? "不明",
            member_id: s.member_id,
          }))
        );
      }

      // 未確認ジョブ: 会員名を取得
      if (pendingJobsRes.data && pendingJobsRes.data.length > 0) {
        const jobMemberIds = pendingJobsRes.data
          .map((j) => {
            const inboxFiles = j.inbox_files as unknown as { member_id: string } | { member_id: string }[] | null;
            if (Array.isArray(inboxFiles)) return inboxFiles[0]?.member_id;
            return inboxFiles?.member_id;
          })
          .filter(Boolean) as string[];
        const uniqueIds = [...new Set(jobMemberIds)];
        const { data: jobUsers } =
          uniqueIds.length > 0
            ? await supabase
                .from("users")
                .select("id, last_name, first_name")
                .in("id", uniqueIds)
            : { data: [] };
        const jobNameMap = new Map(
          (jobUsers ?? []).map((u) => [
            u.id,
            `${u.last_name} ${u.first_name}`,
          ])
        );
        setPendingJobs(
          pendingJobsRes.data.map((j) => {
            const inboxFiles = j.inbox_files as unknown as { member_id: string } | { member_id: string }[] | null;
            const mId = Array.isArray(inboxFiles) ? inboxFiles[0]?.member_id : inboxFiles?.member_id;
            return {
              id: j.id,
              status: j.status,
              created_at: j.created_at,
              member_name: mId ? jobNameMap.get(mId) ?? "不明" : "不明",
            };
          })
        );
      }

      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  const statusLabels: Record<string, string> = {
    queued: "待機中",
    transcribing: "文字起こし中",
    structuring: "構造化中",
    pending_review: "レビュー待ち",
    pending: "未確定",
    confirmed: "確定済",
    completed: "完了",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <Link href="/sessions/new">
          <Button>新規セッション記録</Button>
        </Link>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              本日のセッション
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.todaySessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              担当会員数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.memberCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              未確認記録
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pendingReviews}</p>
          </CardContent>
        </Card>
      </div>

      {/* 未確認ジョブ */}
      {pendingJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">未確認のパイプラインジョブ</CardTitle>
            <CardDescription>
              確認・修正が必要な記録があります
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {pendingJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/sessions/${job.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <div>
                      <span className="font-medium">{job.member_name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <Badge
                      variant={
                        job.status === "pending_review"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabels[job.status] ?? job.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 最近のセッション */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近のセッション</CardTitle>
          <CardDescription>直近5件を表示</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              セッション記録がまだありません
            </p>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <div>
                      <span className="font-medium">
                        {session.member_name}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {session.session_date}
                      </span>
                    </div>
                    <Badge
                      variant={
                        session.status === "confirmed" ||
                        session.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabels[session.status] ?? session.status}
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
