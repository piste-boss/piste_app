"use client";

import { useRouter } from "next/navigation";
import { useSignupStore } from "@/stores/signup-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TermsPage() {
  const router = useRouter();
  const { setField, nextStep, prevStep } = useSignupStore();

  const handleAgree = () => {
    setField("termsAgreed", true);
    nextStep();
    router.push("/signup/payment");
  };

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>利用規約</CardTitle>
          <CardDescription>
            ステップ 2 / 3 — 利用規約の確認と同意
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-64 overflow-y-auto rounded border p-4 text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground">Piste 利用規約</h3>
            <p className="mt-2">
              本規約は、Piste（以下「本サービス」）の利用に関する条件を定めるものです。
            </p>
            <h4 className="mt-4 font-semibold text-foreground">第1条 サービスの利用</h4>
            <p className="mt-1">
              利用者は、本規約に同意した上で本サービスを利用するものとします。
              本サービスは、パーソナルトレーニングの記録管理を目的としています。
            </p>
            <h4 className="mt-4 font-semibold text-foreground">第2条 個人情報の取り扱い</h4>
            <p className="mt-1">
              当社は、利用者の個人情報を適切に管理し、プライバシーポリシーに基づいて取り扱います。
              体形写真等のセンシティブな情報は、安全な方法で保管されます。
            </p>
            <h4 className="mt-4 font-semibold text-foreground">第3条 料金と支払い</h4>
            <p className="mt-1">
              本サービスの利用料金は月額制とし、クレジットカードによる自動課金とします。
              解約は会員ページからいつでも行えます。
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                prevStep();
                router.push("/signup");
              }}
            >
              戻る
            </Button>
            <Button className="flex-1" onClick={handleAgree}>
              同意して次へ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
