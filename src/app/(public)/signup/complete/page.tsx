"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSignupStore } from "@/stores/signup-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Status = "verifying" | "success" | "error";

export default function SignupCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SignupCompleteContent />
    </Suspense>
  );
}

function SignupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const reset = useSignupStore((s) => s.reset);

  // Derive initial status synchronously to avoid setState in effect
  // Check store for credentials to determine if we should attempt auto-login
  const storeState = useSignupStore.getState();
  const hasCredentials = !!(storeState.email && storeState.password);
  const computedInitialStatus: Status = !sessionId
    ? "error"
    : hasCredentials
      ? "verifying"
      : "success";
  const [status, setStatus] = useState<Status>(computedInitialStatus);
  const [errorMessage] = useState(
    !sessionId ? "セッション情報が見つかりません。" : ""
  );

  // If no credentials, reset store on mount (no-op after first render)
  useEffect(() => {
    if (sessionId && !hasCredentials) {
      reset();
    }
  }, [sessionId, hasCredentials, reset]);

  useEffect(() => {
    if (!sessionId || !hasCredentials) return;

    const autoLogin = async () => {
      const { email, password } = useSignupStore.getState();
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Login failed but signup succeeded - guide to login page
          console.warn("Auto-login failed:", error.message);
          setStatus("success");
          reset();
          return;
        }

        // Successfully logged in
        setStatus("success");
        reset();

        // Redirect to member dashboard after a brief delay
        setTimeout(() => {
          router.push("/member-dashboard");
        }, 2000);
      } catch {
        setStatus("success");
        reset();
      }
    };

    autoLogin();
  }, [sessionId, hasCredentials, router, reset]);

  if (status === "verifying") {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <svg
              className="h-8 w-8 animate-spin text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              アカウントを設定中です...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              エラーが発生しました
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push("/login")}
            >
              ログインページへ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">入会登録が完了しました</CardTitle>
          <CardDescription>
            Piste へようこそ！ダッシュボードへ移動します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push("/member-dashboard")}
          >
            ダッシュボードへ
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            自動的にダッシュボードへ移動しない場合は、上のボタンをクリックしてください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
