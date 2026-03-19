"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AiMenuSuggestion } from "@/types/database";

export default function AiSuggestPage() {
  const [suggestions, setSuggestions] = useState<AiMenuSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("ai_menu_suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setSuggestions(data);
      setLoading(false);
    };
    load();
  }, []);

  const updateStatus = async (id: string, status: "accepted" | "rejected") => {
    const supabase = createClient();
    await supabase.from("ai_menu_suggestions").update({ status }).eq("id", id);
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  if (loading) return <div className="p-6">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AIメニュー提案</h1>
      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            提案はまだありません。トレーニングデータが蓄積されると自動生成されます。
          </CardContent>
        </Card>
      ) : (
        suggestions.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {s.suggested_for_date} のメニュー提案
                </CardTitle>
                <Badge
                  variant={
                    s.status === "accepted"
                      ? "default"
                      : s.status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {s.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{s.reasoning}</p>
              {s.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(s.id, "accepted")}>
                    採用
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(s.id, "rejected")}
                  >
                    却下
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
