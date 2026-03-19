# DB Schema - Piste

## テーブル一覧 (14テーブル)

| テーブル | 説明 |
|---------|------|
| users | ユーザー (trainer/member) |
| trainer_members | トレーナー-会員関係 |
| counseling_personality | 性格診断 |
| counseling_body | 体のお悩み |
| counseling_diet | 食事 |
| exercises | エクササイズマスター |
| inbox_files | 受信ファイル |
| pipeline_jobs | ワークフロー実行管理 |
| workout_sessions | トレーニングセッション |
| session_sets | セッション内セット記録 |
| body_photos | 体形写真 |
| body_weight | 体重記録 |
| ai_menu_suggestions | AIメニュー提案 |
| subscriptions | Stripe連携 |

## ファイルパス
- マイグレーション: `supabase/migrations/20260319000000_create_tables.sql`
- シードデータ: `supabase/seed.sql`
- TypeScript型定義: `src/types/database.ts`

## RLS ポリシー
- `is_trainer_for(member_id)`: トレーナーが担当会員かチェック
- `get_user_role()`: 現在ユーザーのロール取得
- 会員: 自分のデータのみ閲覧可
- トレーナー: 担当会員のデータを管理可

## 型の使い方
```typescript
import { Database, User, WorkoutSession } from "@/types/database";
```
