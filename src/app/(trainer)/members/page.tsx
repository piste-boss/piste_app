"use client";

import { useEffect, useState } from "react";
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

interface MemberInfo {
  id: string;
  last_name: string;
  first_name: string;
  email: string;
  avatar_url: string | null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trainer_members")
        .select("member_id")
        .eq("trainer_id", user.id)
        .eq("status", "active");

      if (error || !data) {
        console.error("Failed to fetch trainer_members:", error);
        setLoading(false);
        return;
      }

      const memberIds = data.map((row) => row.member_id);
      if (memberIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, last_name, first_name, email, avatar_url")
        .in("id", memberIds);

      if (usersError) {
        console.error("Failed to fetch users:", usersError);
        setLoading(false);
        return;
      }

      setMembers((users ?? []) as MemberInfo[]);
      setLoading(false);
    }

    fetchMembers();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold">担当会員一覧</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">担当会員一覧</h1>

      {members.length === 0 ? (
        <p className="text-muted-foreground">担当会員がいません。</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <CardTitle>
                  {member.last_name} {member.first_name}
                </CardTitle>
                <CardDescription>{member.email}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link href={`/members/${member.id}/today`}>
                  <Badge variant="secondary">本日のメニュー</Badge>
                </Link>
                <Link href={`/members/${member.id}/photos`}>
                  <Badge variant="secondary">写真</Badge>
                </Link>
                <Link href={`/members/${member.id}/counseling`}>
                  <Badge variant="secondary">カウンセリング</Badge>
                </Link>
              </CardContent>
              <CardFooter>
                <Link href={`/members/${member.id}`} className="w-full">
                  <Button variant="outline" className="w-full">
                    詳細
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
