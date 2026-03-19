# Auth API - Piste

## Supabase クライアント

### Server Component / Server Action / Route Handler
```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const user = await getUser();       // auth.getUser() shortcut
const session = await getSession(); // auth.getSession() shortcut
```

### Client Component
```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
```

## ミドルウェア (`src/middleware.ts`)
- Public paths: `/`, `/login`, `/signup`, `/api/stripe/webhook`
- 未認証 → `/login` にリダイレクト (redirect パラメータ付き)
- ロールベースルーティング: trainer は trainer パス、member は member パスのみアクセス可

## ログインページ
`/login` — メール/パスワード認証 (Supabase Auth)
