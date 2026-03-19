"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Piste
      </h1>
      <p className="mt-4 max-w-xl text-center text-lg text-muted-foreground">
        パーソナルトレーニングをもっとスマートに。
        トレーニング記録、体形管理、AIメニュー提案を一つのアプリで。
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          入会はこちら
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          ログイン
        </Link>
      </div>
    </div>
  );
}
