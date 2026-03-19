"use client";

import { useRouter } from "next/navigation";
import { useSignupStore } from "@/stores/signup-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const { step, lastName, firstName, email, password, phone, dateOfBirth, setField, nextStep } =
    useSignupStore();

  const handleSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName || !firstName || !email || !password) return;
    nextStep();
    router.push("/signup/terms");
  };

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>入会登録</CardTitle>
          <CardDescription>
            ステップ {step} / 3 — 基本情報
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitStep1} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">姓</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">名</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setField("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード (8文字以上)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setField("password", e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">生年月日</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              次へ — 利用規約
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
