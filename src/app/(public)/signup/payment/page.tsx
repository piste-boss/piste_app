"use client";

import { useState } from "react";
import { useSignupStore } from "@/stores/signup-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { email, password, lastName, firstName, phone, dateOfBirth } =
    useSignupStore();

  const handleCheckout = async () => {
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
          phone,
          dateOfBirth,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>お支払い</CardTitle>
          <CardDescription>
            ステップ 3 / 3 — クレジットカード登録
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded border p-4 text-sm">
            <p className="font-medium">月額プラン</p>
            <p className="text-muted-foreground">
              カード登録後、初回決済が行われます
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? "処理中..." : "カード登録・決済へ進む"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
