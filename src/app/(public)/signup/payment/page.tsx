"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignupStore } from "@/stores/signup-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StepIndicator } from "../page";

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center px-4 py-12"><p className="text-sm text-muted-foreground">読み込み中...</p></div>}>
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  // Derive initial error from search params synchronously
  const canceledParam = searchParams.get("canceled") === "true";
  const [error, setError] = useState<string | null>(
    canceledParam ? "決済がキャンセルされました。もう一度お試しください。" : null
  );
  const {
    step,
    email,
    password,
    lastName,
    firstName,
    phone,
    dateOfBirth,
    termsAgreed,
  } = useSignupStore();

  // Guard: ensure user has completed previous steps
  useEffect(() => {
    if (step < 2 || !termsAgreed) {
      router.replace("/signup");
    }
  }, [step, termsAgreed, router]);

  const handleCheckout = async () => {
    if (loading) return;

    // Double-check we have all required data
    if (!email || !password || !lastName || !firstName || !termsAgreed) {
      setError("入力情報が不足しています。最初のステップからやり直してください。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          lastName,
          firstName,
          phone: phone || undefined,
          dateOfBirth: dateOfBirth || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error || "エラーが発生しました";
        // Handle specific error codes
        if (res.status === 409) {
          setError("このメールアドレスは既に登録されています。ログインページからお試しください。");
        } else if (res.status === 503) {
          setError("決済サービスに一時的に接続できません。しばらくしてからお試しください。");
        } else {
          setError(message);
        }
        setLoading(false);
        return;
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setError("決済ページのURLが取得できませんでした。");
        setLoading(false);
      }
    } catch {
      setError("通信エラーが発生しました。ネットワーク接続を確認してください。");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <StepIndicator current={3} />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">お支払い情報</CardTitle>
            <CardDescription>
              クレジットカードを登録して入会を完了します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Registration summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <h4 className="text-sm font-medium text-foreground">登録内容の確認</h4>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <span className="text-muted-foreground">お名前</span>
                <span>{lastName} {firstName}</span>
                <span className="text-muted-foreground">メール</span>
                <span className="break-all">{email}</span>
                {phone && (
                  <>
                    <span className="text-muted-foreground">電話番号</span>
                    <span>{phone}</span>
                  </>
                )}
                {dateOfBirth && (
                  <>
                    <span className="text-muted-foreground">生年月日</span>
                    <span>{dateOfBirth}</span>
                  </>
                )}
              </div>
            </div>

            {/* Plan info */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">月額プラン</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    毎月自動更新 / いつでも解約可能
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">月額</span>
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <svg
                className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <p className="text-xs text-muted-foreground">
                決済情報は Stripe により安全に処理されます。
                カード情報が当社のサーバーに保存されることはありません。
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3" role="alert">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={() => {
                  const store = useSignupStore.getState();
                  store.prevStep();
                  router.push("/signup/terms");
                }}
                disabled={loading}
              >
                戻る
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    処理中...
                  </span>
                ) : (
                  "カード登録へ進む"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
