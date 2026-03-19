"use client";

import { useState, useRef, useEffect } from "react";
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
import { StepIndicator } from "../page";

export default function TermsPage() {
  const router = useRouter();
  const { step, termsAgreed, setField, nextStep, prevStep } = useSignupStore();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(termsAgreed);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Guard: if user skips straight to terms without completing step 1
  useEffect(() => {
    if (step < 1) {
      router.replace("/signup");
    }
  }, [step, router]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgree = () => {
    if (!agreed) return;
    setField("termsAgreed", true);
    nextStep();
    router.push("/signup/payment");
  };

  const handleBack = () => {
    prevStep();
    router.push("/signup");
  };

  return (
    <div className="flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <StepIndicator current={2} />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">利用規約</CardTitle>
            <CardDescription>
              内容をご確認の上、同意してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-72 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground"
            >
              <h3 className="text-base font-semibold text-foreground mb-3">
                Piste サービス利用規約
              </h3>

              <p className="mb-4">
                本規約（以下「本規約」）は、Piste（以下「本サービス」）の利用に関する条件を定めるものです。
                利用者は、本規約に同意した上で本サービスを利用するものとします。
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第1条（サービスの概要）
              </h4>
              <p className="mb-3">
                本サービスは、パーソナルトレーニングジムにおけるトレーニング記録の管理、
                体形変化の記録、AIによるメニュー提案等の機能を提供するWebアプリケーションです。
                会員はスマートフォン等のデバイスからアクセスし、トレーニングに関する各種情報を
                閲覧・管理することができます。
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第2条（利用登録）
              </h4>
              <p className="mb-3">
                1. 利用者は、本サービスの利用にあたり、所定の登録手続きを行うものとします。
                <br />
                2. 登録にあたっては、正確かつ最新の情報を提供するものとします。
                <br />
                3. 当社は、登録内容に虚偽があった場合、登録を取り消すことがあります。
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第3条（個人情報の取り扱い）
              </h4>
              <p className="mb-3">
                1. 当社は、利用者の個人情報を適切に管理し、プライバシーポリシーに基づいて取り扱います。
                <br />
                2. 体形写真等のセンシティブな情報は、暗号化された安全な方法で保管されます。
                <br />
                3. 個人情報は、サービスの提供・改善の目的以外には使用しません。
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第4条（料金と支払い）
              </h4>
              <p className="mb-3">
                1. 本サービスの利用料金は月額制とし、クレジットカードによる自動課金とします。
                <br />
                2. 料金の変更がある場合は、事前に利用者に通知します。
                <br />
                3. 既に支払われた料金の返金は、当社の定める返金ポリシーに従います。
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第5条（解約）
              </h4>
              <p className="mb-3">
                1. 会員は、マイページからいつでも解約手続きを行うことができます。
                <br />
                2. 解約後も、当月末まではサービスをご利用いただけます。
                <br />
                3. 解約後のデータは、当社の定める期間保管した後に削除されます。
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第6条（禁止事項）
              </h4>
              <p className="mb-3">
                利用者は、以下の行為を行ってはなりません。
                <br />
                ・法令に違反する行為
                <br />
                ・本サービスの運営を妨害する行為
                <br />
                ・他の利用者の情報を不正に取得する行為
                <br />
                ・本サービスの情報を無断で複製・転載する行為
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第7条（免責事項）
              </h4>
              <p className="mb-3">
                1. 本サービスは現状有姿で提供されます。
                <br />
                2. AIによるトレーニングメニュー提案は参考情報であり、
                実際のトレーニングはトレーナーの指導のもとで行ってください。
                <br />
                3. 当社は、サービスの中断・停止による損害について責任を負いません。
              </p>

              <h4 className="font-semibold text-foreground mt-4 mb-2">
                第8条（規約の変更）
              </h4>
              <p>
                当社は、必要に応じて本規約を変更することがあります。
                変更後の規約は、本サービス上に掲載した時点で効力を生じるものとします。
              </p>
            </div>

            {!hasScrolledToBottom && (
              <p className="text-xs text-muted-foreground text-center">
                規約を最後までスクロールしてください
              </p>
            )}

            <label
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                hasScrolledToBottom
                  ? "cursor-pointer hover:bg-muted/50"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={!hasScrolledToBottom}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">
                上記の利用規約に同意します
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={handleBack}
              >
                戻る
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={handleAgree}
                disabled={!agreed}
              >
                同意して次へ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
