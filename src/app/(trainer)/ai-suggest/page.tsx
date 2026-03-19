"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { SuggestionStatus } from "@/types/database";

interface MemberOption {
  id: string;
  last_name: string;
  first_name: string;
}

interface SuggestedExercise {
  name: string;
  muscle_group: string;
  weight_kg: number;
  reps: number;
  sets: number;
  rest_seconds: number;
  notes: string;
  progression_reason: string;
}

interface SuggestionData {
  exercises: SuggestedExercise[];
  reasoning: string;
  overall_strategy: string;
  warnings: string[];
  estimated_duration_minutes: number;
}

interface SuggestionRecord {
  id: string;
  member_id: string;
  trainer_id: string;
  suggested_for_date: string;
  suggestion: SuggestionData;
  reasoning: string | null;
  status: SuggestionStatus;
  created_at: string;
  users?: { last_name: string; first_name: string } | null;
}

const statusConfig: Record<
  SuggestionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "未確認", variant: "secondary" },
  accepted: { label: "承認済", variant: "default" },
  modified: { label: "修正済", variant: "outline" },
  rejected: { label: "却下", variant: "destructive" },
};

const muscleGroupColors: Record<string, string> = {
  "胸": "bg-red-100 text-red-700",
  "脚": "bg-blue-100 text-blue-700",
  "背中": "bg-green-100 text-green-700",
  "肩": "bg-yellow-100 text-yellow-700",
  "腕": "bg-purple-100 text-purple-700",
  "体幹": "bg-orange-100 text-orange-700",
  "臀部": "bg-pink-100 text-pink-700",
};

export default function AiSuggestPage() {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [suggestedDate, setSuggestedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    id?: string;
    suggestion: SuggestionData;
  } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);

  // Expanded detail tracking
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load trainer's members
  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: relations } = await supabase
        .from("trainer_members")
        .select("member_id")
        .eq("trainer_id", user.id)
        .eq("status", "active");

      if (!relations || relations.length === 0) {
        setMembersLoading(false);
        return;
      }

      const memberIds = relations.map((r) => r.member_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, last_name, first_name")
        .in("id", memberIds);

      if (users) {
        setMembers(users as MemberOption[]);
      }
      setMembersLoading(false);
    }
    fetchMembers();
  }, []);

  // Load suggestion history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const url = new URL("/api/ai/suggest-menu", window.location.origin);
      if (selectedMemberId) {
        url.searchParams.set("memberId", selectedMemberId);
      }
      url.searchParams.set("limit", "30");

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedMemberId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Generate AI suggestion
  const handleGenerate = async () => {
    if (!selectedMemberId || !suggestedDate) return;

    setGenerating(true);
    setGenerateError(null);
    setGeneratedResult(null);

    try {
      const res = await fetch("/api/ai/suggest-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMemberId,
          suggestedForDate: suggestedDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error ?? "AI提案の生成に失敗しました");
        return;
      }

      setGeneratedResult({
        id: data.id,
        suggestion: data.suggestion,
      });

      // Reload history to include new suggestion
      loadHistory();
    } catch (e) {
      console.error("Generate error:", e);
      setGenerateError("ネットワークエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  // Update suggestion status
  const handleStatusUpdate = async (
    id: string,
    status: "accepted" | "modified" | "rejected"
  ) => {
    try {
      const res = await fetch("/api/ai/suggest-menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        setSuggestions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status } : s))
        );
        // Also update generated result if it matches
        if (generatedResult?.id === id) {
          // Keep displayed but reflect status change in history
        }
      }
    } catch (e) {
      console.error("Status update error:", e);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getSelectedMemberName = () => {
    const m = members.find((m) => m.id === selectedMemberId);
    return m ? `${m.last_name} ${m.first_name}` : "";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AIメニュー提案</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          トレーニングデータを基にAIが最適なメニューを提案します
        </p>
      </div>

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>新しい提案を生成</CardTitle>
          <CardDescription>
            会員と日付を選択し、AI提案を生成してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="member-select">対象会員</Label>
            {membersLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                担当会員がいません
              </p>
            ) : (
              <select
                id="member-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">会員を選択してください</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.last_name} {m.first_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date-input">提案日</Label>
            <Input
              id="date-input"
              type="date"
              value={suggestedDate}
              onChange={(e) => setSuggestedDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
        <CardFooter className="gap-3">
          <Button
            onClick={handleGenerate}
            disabled={!selectedMemberId || !suggestedDate || generating}
          >
            {generating ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                AI分析中...
              </>
            ) : (
              "AI提案を生成"
            )}
          </Button>
          {selectedMemberId && (
            <span className="text-sm text-muted-foreground">
              {getSelectedMemberName()} 様 / {suggestedDate}
            </span>
          )}
        </CardFooter>
      </Card>

      {/* Error Display */}
      {generateError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{generateError}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading Spinner */}
      {generating && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm font-medium">
              AIがトレーニングデータを分析中...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              過去の記録・体重推移・カウンセリング情報を総合的に分析しています
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generated Result */}
      {generatedResult && (
        <SuggestionDetailCard
          suggestion={generatedResult.suggestion}
          id={generatedResult.id}
          memberName={getSelectedMemberName()}
          date={suggestedDate}
          status="pending"
          onStatusUpdate={handleStatusUpdate}
          defaultExpanded
        />
      )}

      <Separator />

      {/* History Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">提案履歴</h2>

        {historyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              提案履歴はまだありません。上のフォームからAI提案を生成してください。
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => {
              const isExpanded = expandedIds.has(s.id);
              const memberName = s.users
                ? `${s.users.last_name} ${s.users.first_name}`
                : "";
              const suggestionData = s.suggestion as unknown as SuggestionData;
              const cfg = statusConfig[s.status];

              return (
                <Card key={s.id}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleExpanded(s.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">
                          {memberName && `${memberName} 様 - `}
                          {s.suggested_for_date} のメニュー提案
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {s.reasoning ??
                            suggestionData?.reasoning ??
                            "分析結果"}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && suggestionData && (
                    <CardContent className="space-y-4 border-t pt-4">
                      <SuggestionDetailContent
                        suggestion={suggestionData}
                      />
                      {s.status === "pending" && (
                        <div className="flex gap-2 border-t pt-4">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(s.id, "accepted");
                            }}
                          >
                            承認
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(s.id, "modified");
                            }}
                          >
                            修正
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(s.id, "rejected");
                            }}
                          >
                            却下
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Detailed suggestion card for newly generated results */
function SuggestionDetailCard({
  suggestion,
  id,
  memberName,
  date,
  status,
  onStatusUpdate,
  defaultExpanded = false,
}: {
  suggestion: SuggestionData;
  id?: string;
  memberName: string;
  date: string;
  status: SuggestionStatus;
  onStatusUpdate: (
    id: string,
    status: "accepted" | "modified" | "rejected"
  ) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [currentStatus, setCurrentStatus] = useState(status);
  const cfg = statusConfig[currentStatus];

  const handleUpdate = (newStatus: "accepted" | "modified" | "rejected") => {
    if (!id) return;
    setCurrentStatus(newStatus);
    onStatusUpdate(id, newStatus);
  };

  return (
    <Card className="ring-2 ring-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>
              {memberName} 様 - {date} の提案メニュー
            </CardTitle>
            <CardDescription className="mt-1">
              {suggestion.overall_strategy}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            {suggestion.estimated_duration_minutes > 0 && (
              <Badge variant="outline">
                約{suggestion.estimated_duration_minutes}分
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercise Menu Table */}
        <div>
          <h3 className="mb-3 text-sm font-semibold">推奨メニュー</h3>
          <div className="space-y-2">
            {suggestion.exercises.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-medium">{ex.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        muscleGroupColors[ex.muscle_group] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ex.muscle_group}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold tabular-nums">
                      {ex.weight_kg}kg
                    </span>
                    <span className="text-muted-foreground">x</span>
                    <span className="tabular-nums">{ex.reps}回</span>
                    <span className="text-muted-foreground">x</span>
                    <span className="tabular-nums">{ex.sets}セット</span>
                    {ex.rest_seconds > 0 && (
                      <span className="text-xs text-muted-foreground">
                        (休{ex.rest_seconds}秒)
                      </span>
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="mt-2 space-y-1 pl-8 text-xs text-muted-foreground">
                    {ex.notes && <p>{ex.notes}</p>}
                    {ex.progression_reason && (
                      <p className="text-primary/80">
                        {ex.progression_reason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              詳細を表示 (フォーム注意点・根拠)
            </button>
          )}
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="mt-2 text-xs text-muted-foreground hover:underline"
            >
              詳細を閉じる
            </button>
          )}
        </div>

        {/* AI Analysis */}
        <div className="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
          <h3 className="mb-2 text-sm font-semibold">AI分析・根拠</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {suggestion.reasoning}
          </p>
        </div>

        {/* Warnings */}
        {suggestion.warnings && suggestion.warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
            <h3 className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              注意事項
            </h3>
            <ul className="space-y-1">
              {suggestion.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-sm text-yellow-700 dark:text-yellow-300"
                >
                  - {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      {/* Action Buttons */}
      {currentStatus === "pending" && id && (
        <CardFooter className="gap-2">
          <Button size="sm" onClick={() => handleUpdate("accepted")}>
            承認
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleUpdate("modified")}
          >
            修正して採用
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleUpdate("rejected")}
          >
            却下
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/** Shared content renderer for suggestion details */
function SuggestionDetailContent({
  suggestion,
}: {
  suggestion: SuggestionData;
}) {
  return (
    <div className="space-y-4">
      {/* Exercise List */}
      <div className="space-y-2">
        {suggestion.exercises?.map((ex, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="font-medium">{ex.name}</span>
              {ex.muscle_group && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    muscleGroupColors[ex.muscle_group] ??
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ex.muscle_group}
                </span>
              )}
            </div>
            <span className="tabular-nums">
              {ex.weight_kg}kg x {ex.reps} x {ex.sets}
            </span>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      {suggestion.reasoning && (
        <div className="rounded-lg bg-blue-50/50 p-3 text-xs dark:bg-blue-950/20">
          <p className="font-medium">AI分析:</p>
          <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {suggestion.reasoning}
          </p>
        </div>
      )}

      {suggestion.overall_strategy && (
        <p className="text-xs text-muted-foreground">
          戦略: {suggestion.overall_strategy}
        </p>
      )}

      {suggestion.warnings && suggestion.warnings.length > 0 && (
        <div className="text-xs text-yellow-700">
          {suggestion.warnings.map((w, i) => (
            <p key={i}>- {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
