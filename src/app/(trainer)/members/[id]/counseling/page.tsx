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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CounselingCompletion {
  personality: boolean;
  body: boolean;
  diet: boolean;
  personalityDate: string | null;
  bodyDate: string | null;
  dietDate: string | null;
}

const counselingTypes = [
  {
    key: "personality" as const,
    dateKey: "personalityDate" as const,
    title: "性格診断",
    description: "会員の性格タイプや行動パターンを把握するためのカウンセリング",
    href: "personality",
  },
  {
    key: "body" as const,
    dateKey: "bodyDate" as const,
    title: "体のお悩み",
    description: "身体的な悩みや改善したいポイントのヒアリング",
    href: "body",
  },
  {
    key: "diet" as const,
    dateKey: "dietDate" as const,
    title: "食事",
    description: "食習慣や栄養バランスに関するカウンセリング",
    href: "diet",
  },
] as const;

export default function CounselingTopPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<CounselingCompletion>({
    personality: false,
    body: false,
    diet: false,
    personalityDate: null,
    bodyDate: null,
    dietDate: null,
  });
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [memberRes, personalityRes, bodyRes, dietRes] = await Promise.all([
        supabase
          .from("users")
          .select("last_name, first_name")
          .eq("id", id)
          .single(),
        supabase
          .from("counseling_personality")
          .select("created_at")
          .eq("member_id", id)
          .limit(1),
        supabase
          .from("counseling_body")
          .select("created_at")
          .eq("member_id", id)
          .limit(1),
        supabase
          .from("counseling_diet")
          .select("created_at")
          .eq("member_id", id)
          .limit(1),
      ]);

      if (memberRes.data) {
        setMemberName(
          `${memberRes.data.last_name} ${memberRes.data.first_name}`
        );
      }

      setStatus({
        personality: (personalityRes.data?.length ?? 0) > 0,
        body: (bodyRes.data?.length ?? 0) > 0,
        diet: (dietRes.data?.length ?? 0) > 0,
        personalityDate: personalityRes.data?.[0]?.created_at ?? null,
        bodyDate: bodyRes.data?.[0]?.created_at ?? null,
        dietDate: dietRes.data?.[0]?.created_at ?? null,
      });

      setLoading(false);
    }

    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">カウンセリング</h1>
          {memberName && (
            <p className="text-sm text-muted-foreground">{memberName} さん</p>
          )}
        </div>
        <Link href={`/members/${id}`}>
          <Button variant="outline" size="sm">
            会員詳細に戻る
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {counselingTypes.map((type) => {
          const completed = status[type.key];
          const dateStr = status[type.dateKey];

          return (
            <Card key={type.key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {type.title}
                  <Badge variant={completed ? "default" : "outline"}>
                    {completed ? "完了" : "未実施"}
                  </Badge>
                </CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {completed && dateStr ? (
                  <p className="text-xs text-muted-foreground">
                    実施日:{" "}
                    {new Date(dateStr).toLocaleDateString("ja-JP")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    まだ実施されていません
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Link
                  href={`/members/${id}/counseling/${type.href}`}
                  className="w-full"
                >
                  <Button
                    variant={completed ? "outline" : "default"}
                    className="w-full"
                  >
                    {completed ? "確認・編集" : "開始する"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
