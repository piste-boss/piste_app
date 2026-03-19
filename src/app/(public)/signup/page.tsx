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

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { num: 1, label: "基本情報" },
    { num: 2, label: "利用規約" },
    { num: 3, label: "お支払い" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step.num === current
                ? "bg-primary text-primary-foreground"
                : step.num < current
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {step.num < current ? (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            ) : (
              step.num
            )}
          </div>
          <span
            className={`hidden text-xs sm:inline ${
              step.num === current
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-8 ${
                step.num < current ? "bg-primary/40" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive mt-1" role="alert">
      {message}
    </p>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const {
    lastName,
    firstName,
    email,
    password,
    phone,
    dateOfBirth,
    errors,
    setField,
    validateStep1,
    nextStep,
  } = useSignupStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1()) return;

    nextStep();
    router.push("/signup/terms");
  };

  return (
    <div className="flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <StepIndicator current={1} />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">入会登録</CardTitle>
            <CardDescription>基本情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">
                    姓 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    placeholder="山田"
                    aria-invalid={!!errors.lastName}
                    autoComplete="family-name"
                  />
                  <FieldError message={errors.lastName} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">
                    名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    placeholder="太郎"
                    aria-invalid={!!errors.firstName}
                    autoComplete="given-name"
                  />
                  <FieldError message={errors.firstName} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  メールアドレス <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="taro@example.com"
                  aria-invalid={!!errors.email}
                  autoComplete="email"
                />
                <FieldError message={errors.email} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  パスワード <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="8文字以上（英字+数字）"
                  aria-invalid={!!errors.password}
                  autoComplete="new-password"
                />
                <FieldError message={errors.password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="09012345678"
                  aria-invalid={!!errors.phone}
                  autoComplete="tel"
                />
                <FieldError message={errors.phone} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">生年月日</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setField("dateOfBirth", e.target.value)}
                  aria-invalid={!!errors.dateOfBirth}
                  autoComplete="bday"
                />
                <FieldError message={errors.dateOfBirth} />
              </div>

              <Button type="submit" className="w-full" size="lg">
                次へ
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { StepIndicator };
