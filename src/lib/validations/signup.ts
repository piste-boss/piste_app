import { z } from "zod";

// Step 1: Basic info validation
export const signupStep1Schema = z.object({
  lastName: z
    .string()
    .min(1, "姓を入力してください")
    .max(50, "姓は50文字以内で入力してください"),
  firstName: z
    .string()
    .min(1, "名を入力してください")
    .max(50, "名は50文字以内で入力してください"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .max(72, "パスワードは72文字以内で入力してください")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "パスワードは英字と数字の両方を含めてください"
    ),
  phone: z
    .string()
    .regex(/^(0\d{9,10}|)$/, "有効な電話番号を入力してください（例: 09012345678）")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal("")),
});

// Full signup schema (used server-side)
export const signupSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .max(72, "パスワードは72文字以内で入力してください"),
  lastName: z.string().min(1, "姓を入力してください"),
  firstName: z.string().min(1, "名を入力してください"),
  phone: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  termsAgreed: z.literal(true, {
    message: "利用規約に同意してください",
  }),
});

export type SignupStep1Data = z.infer<typeof signupStep1Schema>;
export type SignupFormData = z.infer<typeof signupSchema>;
