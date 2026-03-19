import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください"),
  lastName: z.string().min(1, "姓を入力してください"),
  firstName: z.string().min(1, "名を入力してください"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  termsAgreed: z.literal(true, {
    message: "利用規約に同意してください",
  }),
});

export type SignupFormData = z.infer<typeof signupSchema>;
