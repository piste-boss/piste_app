# Piste Agent Teams 設計

## 概要

Claude Code の Agent Teams 機能を活用し、計画書.md の Step 1〜8 を複数エージェントで並列・協調開発する。
各エージェントは計画書の機能領域に対応し、共有コンテキストとログを通じて整合性を保つ。

---

## 1. チーム構成 (9エージェント)

### 🎯 Team Lead (オーケストレーター)

**役割**: 全体統括・進捗管理・コンフリクト解決
- 計画書.md の Step 1〜8 に従いフェーズ制御・タスク分配
- 各エージェントの成果物をレビューし品質ゲート判定
- `.context/status.md` の更新、エージェント間のコンフリクト検出・解決
- 外部サービス (Supabase, Stripe, Google Drive) の API キー・環境変数管理

**入力**: 計画書.md 全体
**出力**: `.context/status.md`, `.context/decisions.md`

---

### 🗄️ DB Architect (データベース設計)

**担当**: Step 1 (DB部分) — Supabase セットアップ・全テーブル設計
- Supabase プロジェクト初期設定
- 計画書 §5 の全13テーブルのマイグレーション作成
  - `users`, `trainer_members`, `counseling_*` (3テーブル), `exercises`
  - `inbox_files`, `pipeline_jobs`, `workout_sessions`, `session_sets`
  - `body_photos`, `body_weight`, `ai_menu_suggestions`, `subscriptions`
- RLS ポリシー設定 (trainer/member ロール別アクセス制御)
- シードデータ (エクササイズマスター、テスト用トレーナー/会員)
- TypeScript 型定義の自動生成

**入力コンテキスト**: 計画書.md §5 (データベース設計)
**出力**: `supabase/migrations/`, `supabase/seed.sql`, `src/types/database.ts`
**優先度**: 🔴 最高 (全エージェントがこの型定義に依存)

---

### 🎨 UI Builder (デザインシステム・レイアウト)

**担当**: Step 1 (UI部分) — 共通基盤UI構築
- Tailwind CSS + shadcn/ui セットアップ
- PWA 設定 (`manifest.json`, Service Worker, アイコン)
- 共通レイアウト構築:
  - `(public)` レイアウト — LP・入会ページ用
  - `(trainer)` レイアウト — iPad向け、サイドバー + ヘッダー
  - `(member)` レイアウト — モバイルファースト、ボトムナビ
- デザイントークン (カラーパレット、タイポグラフィ、スペーシング)
- 共通コンポーネント: PageShell, LoadingState, EmptyState, ErrorBoundary
- レスポンシブ対応 (モバイル / タブレット / デスクトップ)
- `.context/component-api.md` にコンポーネントAPI仕様を記録

**入力コンテキスト**: 計画書.md §7 (ディレクトリ構成), §9 (非機能要件)
**出力**: `src/components/ui/`, `src/components/layout/`, `src/app/layout.tsx`, `public/`
**優先度**: 🟠 高 (Feature Dev が UI コンポーネントに依存)

---

### 🔐 Auth Engineer (認証・認可)

**担当**: Step 2 (認証部分) — Supabase Auth + ルート保護
- Supabase Auth クライアント設定 (Server/Client)
- ログインページ (`/login`)
- ミドルウェア (`middleware.ts`):
  - 未認証ユーザーのリダイレクト
  - ロール判定 (trainer → `(trainer)/`, member → `(member)/`)
  - `(public)` ルートはスキップ
- Supabase Auth ヘルパー (`src/lib/supabase/`):
  - `createClient()` (Server Component 用)
  - `createBrowserClient()` (Client Component 用)
  - `getUser()`, `getSession()` ユーティリティ
- ロールベースアクセス制御の共通関数
- `.context/auth-api.md` に認証ユーティリティの使い方を記録

**入力コンテキスト**: 計画書.md §4 フロー1 (認証部分), DB Architect の型定義
**出力**: `src/app/(public)/login/`, `src/lib/supabase/`, `src/middleware.ts`
**依存**: DB Architect 完了後に開始
**優先度**: 🟠 高 (Feature Dev が認証に依存)

---

### 💳 Signup & Payments Dev (入会フロー)

**担当**: Step 2 (入会部分) — 入会マルチステップフォーム + Stripe 統合
- マルチステップ入会フォーム (`/signup`):
  1. 基本情報入力 (氏名、メール、電話、生年月日) — Zod バリデーション
  2. パスワード設定
  3. 利用規約表示・同意 (`/signup/terms`)
  4. Stripe Checkout でカード登録・初回決済 (`/signup/payment`)
  5. アカウント作成完了 → 自動ログイン
- Stripe 統合 (`src/lib/stripe/`):
  - Checkout Session 作成 API (`/api/stripe/checkout`)
  - Webhook 受信 (`/api/stripe/webhook`) — 支払いステータス同期
  - サブスクリプション管理 (active / canceled / past_due)
  - Customer Portal リンク生成
- フォームの状態管理 (Zustand)

**入力コンテキスト**: 計画書.md §4 フロー1, §6.1 (Stripe), Auth Engineer の認証ユーティリティ
**出力**: `src/app/(public)/signup/`, `src/app/api/stripe/`, `src/lib/stripe/`, `src/components/forms/signup/`
**依存**: Auth Engineer + UI Builder 完了後に開始

---

### 📋 Counseling Dev (カウンセリング)

**担当**: Step 3 — カウンセリング3種 + AI指導ポイント生成
- 性格診断 (`/trainer/members/[id]/counseling/personality`):
  - 選択式アンケートUI (トレーニングスタイル傾向把握)
  - Gemini API で「指導ポイント」自動生成:
    - 性格タイプ名 (例: 褒められ伸びる型)
    - トレーナー向け指導ポイント 3〜5項目
  - トレーナーが確認・編集可能
- 体のお悩み (`/trainer/members/[id]/counseling/body`):
  - 部位別悩み選択 (肩こり、腰痛、姿勢等)
  - 既往歴・ケガ入力
  - 目標設定 (ダイエット、筋力UP、姿勢改善等)
- 食事 (`/trainer/members/[id]/counseling/diet`):
  - 食事回数・時間帯・内容傾向
  - アレルギー・制限事項
  - 改善目標
- Gemini API 共通ヘルパー (`src/lib/gemini/`)

**入力コンテキスト**: 計画書.md §4 フロー2, DB型定義, UIコンポーネント
**出力**: `src/app/(trainer)/members/[id]/counseling/`, `src/lib/gemini/`, `src/components/forms/counseling/`
**依存**: Auth Engineer + UI Builder 完了後に開始

---

### 🏋️ Training Pipeline Dev (トレーニング記録パイプライン)

**担当**: Step 4 — セッション記録の自動処理パイプライン (最も複雑な機能)

**パイプライン本体** (`src/lib/pipeline/`):
- ファイル種別自動判別 (`detect.ts`): 拡張子で audio / text を判定
- Route A — 音声パイプライン (`transcribe.ts`):
  - OpenAI Whisper API で日本語音声 → テキスト変換
  - 文字起こし結果を保存
- Route B — テキストパイプライン (`structure.ts`):
  - Gemini API で構造化データ抽出 (種目名、重量kg、レップ数、セット数、コメント)
- オーケストレーター (`orchestrator.ts`): パイプライン全体制御
- `pipeline_jobs` ステータス管理 (queued → transcribing → structuring → pending_review → confirmed)

**API エンドポイント**:
- `/api/pipeline/webhook` — フォルダ監視 Hook 受信
- `/api/pipeline/transcribe` — 音声文字起こし実行
- `/api/pipeline/structure` — テキスト構造化実行

**トレーナー画面**:
- 本日のセッション (`/trainer/members/[id]/today`):
  - 性格タイプ・指導ポイント表示 (冒頭)
  - AI提案メニュー表示 + [採用] / [修正する] ボタン
  - 過去メニュー一覧 (重量推移が一目でわかる)
- セッション記録 (`/trainer/sessions/new`):
  - 音声録音UI (アプリ内直接録音)
  - ファイルアップロード (音声 or テキスト)
- 確認・修正UI (`/trainer/sessions/[id]`):
  - AI構造化結果の確認・手動修正 → 確定

**Whisper API ヘルパー** (`src/lib/whisper/`)

**入力コンテキスト**: 計画書.md §4 フロー3, §6.3 (Whisper), §6.4 (Gemini)
**出力**: `src/lib/pipeline/`, `src/lib/whisper/`, `src/app/api/pipeline/`, `src/app/(trainer)/members/[id]/today/`, `src/app/(trainer)/sessions/`, `src/components/sessions/`
**依存**: Auth Engineer + UI Builder + Counseling Dev (指導ポイントデータ) 完了後に開始
**優先度**: 🔴 最高 (アプリのコア機能、AI Dev がこのデータに依存)

---

### 📸 Media & Member Dev (写真管理 + 会員向け機能)

**担当**: Step 5-6 — Google Drive 写真管理 + 会員向けUI

**写真管理 (Step 5)**:
- Google Drive API 統合 (`src/lib/google-drive/`):
  - サービスアカウント接続
  - 会員ごとフォルダ自動作成 (`/Piste/[会員名]_[ID]/`)
  - 日付サブフォルダ整理
- 写真撮影・アップロードUI (`/trainer/members/[id]/photos`):
  - カメラ撮影 / ファイル選択
  - 撮影部位選択 (正面 / 側面 / 背面)
  - アップロード → Google Drive 保存
- 体形変化タイムライン表示:
  - 入会時 → 1ヶ月 → 2ヶ月... の時系列比較
  - 正面 / 側面 / 背面 切替
- API エンドポイント:
  - `/api/google-drive/upload` — 写真アップロード
  - `/api/google-drive/folders` — フォルダ管理

**会員向け機能 (Step 6)**:
- トレーニング記録閲覧 (`/member/records`):
  - 日付別・種目別のフィルタ
  - 重量推移グラフ (recharts or chart.js)
- 体形変化写真閲覧 (`/member/photos`):
  - Google Drive 連携のタイムライン表示
- 体重入力・推移グラフ (`/member/weight`):
  - 日々の体重記録フォーム
  - 体重推移折れ線グラフ
- 会員ダッシュボード (`/member/dashboard`):
  - 直近のトレーニング、次回予定、体重推移サマリー

**入力コンテキスト**: 計画書.md §4 フロー3 (写真管理), §4 3.2 (ユーザー側), §6.2 (Google Drive)
**出力**: `src/lib/google-drive/`, `src/app/api/google-drive/`, `src/app/(trainer)/members/[id]/photos/`, `src/app/(member)/`, `src/components/charts/`
**依存**: Auth Engineer + UI Builder 完了後に開始

---

### 🤖 AI Suggest Dev (AIメニュー提案)

**担当**: Step 7 — Gemini API によるトレーニングメニュー自動提案

- データ集約ロジック:
  - 過去のトレーニング記録 (種目、重量、レップ数の推移)
  - 体重推移データ
  - カウンセリング情報 (目標、体の悩み、性格タイプ)
- Gemini API プロンプト設計:
  - 漸進的過負荷の原則に基づく重量提案
  - 性格タイプに応じたメニュー調整
  - 目標 (ダイエット / 筋力UP / 姿勢改善) 別の種目選定
- API エンドポイント: `/api/ai/suggest-menu`
- トレーナー向け提案UI (`/trainer/ai-suggest`):
  - 推奨メニュー表示 (種目・重量・セット・レップ)
  - AIの分析理由・根拠表示
  - 承認 / 修正 / 却下フロー
- `ai_menu_suggestions` テーブルへの保存・ステータス管理

**入力コンテキスト**: 計画書.md §4 フロー4, §6.4 (Gemini), Counseling Dev の Gemini ヘルパー
**出力**: `src/app/api/ai/`, `src/app/(trainer)/ai-suggest/`, `src/lib/gemini/` (共有)
**依存**: Training Pipeline Dev のデータが必要 (過去セッション記録がないとAI提案不可)

---

### ✅ QA Tester (品質保証)

**担当**: Step 8 + 各Phase完了時の検証
- TypeScript ビルド検証 (`npm run build`)
- ESLint / Prettier チェック (`npm run lint`)
- 型定義の整合性確認 (DB型 ↔ フロント利用箇所)
- Supabase RLS ポリシーの動作確認
- 外部サービス統合テスト:
  - Stripe Webhook の署名検証
  - Google Drive API の認証・権限
  - Whisper / Gemini API のエラーハンドリング
- PWA 動作確認 (Service Worker, オフライン対応)
- レスポンシブ確認 (iPhone / iPad / デスクトップ)
- バグ報告 → 該当 Feature Dev に修正依頼

**入力コンテキスト**: 全エージェントの出力、`.context/` 全ファイル
**出力**: テスト結果ログ, 修正依頼チケット

---

## 2. コンテキスト管理

### 2.1 共有コンテキストファイル

```
piste_app/
├── .context/
│   ├── status.md          # 全体進捗 (Team Lead 更新)
│   ├── decisions.md       # アーキテクチャ判断ログ
│   ├── db-schema.md       # 最新DBスキーマ + 型定義パス (DB Architect 更新)
│   ├── auth-api.md        # 認証ユーティリティの使い方 (Auth Engineer 更新)
│   ├── component-api.md   # UIコンポーネントAPI仕様 (UI Builder 更新)
│   └── gemini-api.md      # Gemini API 共通ヘルパーの使い方 (Counseling Dev 更新)
```

### 2.2 コンテキスト受け渡しルール

| 送信元 | 送信先 | 共有内容 | 共有方法 |
|--------|--------|----------|----------|
| DB Architect | 全 Feature Dev | 型定義, テーブル構造 | `.context/db-schema.md` |
| Auth Engineer | 全 Feature Dev | 認証ユーティリティ, ミドルウェア仕様 | `.context/auth-api.md` |
| UI Builder | 全 Feature Dev | コンポーネント一覧・使用例 | `.context/component-api.md` |
| Counseling Dev | AI Suggest Dev | Gemini ヘルパーの使い方 | `.context/gemini-api.md` |
| Training Pipeline Dev | AI Suggest Dev | セッションデータ構造, 取得方法 | `.context/db-schema.md` 更新 |
| 各 Feature Dev | QA Tester | 実装完了通知 | `.context/status.md` 更新 |
| QA Tester | 各 Feature Dev | バグ報告・修正依頼 | `.logs/qa-tester/` |

### 2.3 コンテキストの鮮度管理

- 各エージェントは作業開始時に `.context/status.md` を読む
- 作業完了時に自分の担当セクションを更新する
- 共有ライブラリ (`src/lib/gemini/` 等) を変更した場合は該当 `.context/` ファイルも更新
- コンフリクトが発生した場合は Team Lead に報告

---

## 3. ログ管理

### 3.1 ログ構造

```
piste_app/
├── .logs/
│   ├── team-lead/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── db-architect/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── ui-builder/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── auth-engineer/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── signup-payments/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── counseling/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── training-pipeline/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── media-member/
│   │   └── YYYY-MM-DD_HH-MM.md
│   ├── ai-suggest/
│   │   └── YYYY-MM-DD_HH-MM.md
│   └── qa-tester/
│       └── YYYY-MM-DD_HH-MM.md
```

### 3.2 ログフォーマット

```markdown
# [Agent名] 作業ログ - YYYY-MM-DD HH:MM

## タスク
- 担当タスク名 (計画書 Step X 対応)

## 実施内容
- 作成/変更したファイル一覧
- 主要な判断とその理由

## 成果物
- 出力ファイルパス

## 依存・ブロッカー
- 他エージェントへの依頼事項
- 未解決の問題

## 次のアクション
- 次に必要な作業
```

### 3.3 ログの活用

- **Team Lead**: 全ログを定期チェックし進捗把握、フェーズ遷移判定
- **各エージェント**: 依存先のログを確認してからタスク開始
- **QA Tester**: 全ログを参照して変更箇所を特定

---

## 4. 実行フロー (4フェーズ)

### Phase 1: 基盤構築 (並列)

```
┌─────────────────────────────────────────────┐
│ Team Lead: Next.js プロジェクト初期化         │
│  npm create next-app, 基本設定               │
└───────────────┬─────────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
 ┌──────────────┐ ┌──────────────┐
 │ DB Architect │ │ UI Builder   │
 │ Step 1 (DB)  │ │ Step 1 (UI)  │
 │ 全テーブル    │ │ shadcn/ui    │
 │ RLS          │ │ レイアウト    │
 │ 型定義       │ │ PWA設定      │
 └──────┬───────┘ └──────┬───────┘
        │                │
        └───────┬────────┘
                ▼
         Phase 2 へ
```

### Phase 2: 認証基盤 (直列)

```
 ┌──────────────────────┐
 │ Auth Engineer        │
 │ Step 2 (認証部分)     │
 │ Supabase Auth        │
 │ ミドルウェア          │
 │ ロール制御            │
 └──────────┬───────────┘
            ▼
      Phase 3 へ
```

### Phase 3: 機能実装 (最大4並列)

```
Auth + UI 完了後、4エージェントが並列実行:

 ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
 │ Signup &       │ │ Counseling     │ │ Training       │ │ Media &        │
 │ Payments Dev   │ │ Dev            │ │ Pipeline Dev   │ │ Member Dev     │
 │                │ │                │ │                │ │                │
 │ Step 2 (入会)  │ │ Step 3         │ │ Step 4         │ │ Step 5-6       │
 │ ・マルチステップ│ │ ・性格診断     │ │ ・パイプライン  │ │ ・Google Drive │
 │ ・Stripe統合   │ │ ・体のお悩み   │ │ ・Whisper連携  │ │ ・写真管理     │
 │ ・Webhook      │ │ ・食事         │ │ ・Gemini構造化 │ │ ・会員ダッシュ │
 │               │ │ ・AI指導生成   │ │ ・セッションUI │ │ ・体重グラフ   │
 └────────────────┘ └────────────────┘ └───────┬────────┘ └────────────────┘
                                               │
                                               ▼
                                      ┌────────────────┐
                                      │ AI Suggest Dev │
                                      │ Step 7         │
                                      │ ・データ集約    │
                                      │ ・Gemini提案   │
                                      │ ・承認フロー    │
                                      └────────────────┘
```

> **Note**: AI Suggest Dev は Training Pipeline Dev の完了後に開始。
> 過去セッションデータがないとAI提案のテスト・実装が困難なため。

### Phase 4: 品質仕上げ

```
 ┌──────────────────────────────┐
 │ QA Tester (Step 8)           │
 │ ・ビルド検証                  │
 │ ・型整合性チェック            │
 │ ・外部サービス統合テスト      │
 │ ・レスポンシブ確認            │
 │ ・PWA動作確認                │
 └──────────┬───────────────────┘
            │ バグ報告
            ▼
 ┌──────────────────────────────┐
 │ 各 Feature Dev: バグ修正      │
 └──────────────────────────────┘
```

### 並列実行の制約まとめ

| エージェント | 依存先 | 最速開始タイミング |
|-------------|--------|------------------|
| DB Architect | Team Lead (初期化) | Phase 1 開始直後 |
| UI Builder | Team Lead (初期化) | Phase 1 開始直後 |
| Auth Engineer | DB Architect | Phase 2 |
| Signup & Payments Dev | Auth + UI | Phase 3 開始直後 |
| Counseling Dev | Auth + UI | Phase 3 開始直後 |
| Training Pipeline Dev | Auth + UI | Phase 3 開始直後 |
| Media & Member Dev | Auth + UI | Phase 3 開始直後 |
| AI Suggest Dev | Training Pipeline Dev | Phase 3 後半 |
| QA Tester | 全 Feature Dev | Phase 4 |

---

## 5. エージェント起動コマンド

```bash
# ── Phase 1: 基盤構築 ──

# Team Lead: プロジェクト初期化
claude --team lead "計画書.md の Step 1 に従い、Next.js プロジェクトを初期化してください。
完了後、DB Architect と UI Builder に作業開始を指示してください。"

# DB Architect (Team Lead 初期化後)
claude --team db-architect "計画書.md §5 の全13テーブルを Supabase マイグレーションとして作成してください。
RLS ポリシー、シードデータ、TypeScript 型定義も含めてください。
完了後 .context/db-schema.md を更新してください。"

# UI Builder (Team Lead 初期化後、DB と並列)
claude --team ui-builder "計画書.md §7 のディレクトリ構成に従い、shadcn/ui セットアップ、
(public)/(trainer)/(member) の3レイアウト、PWA設定を構築してください。
完了後 .context/component-api.md を更新してください。"

# ── Phase 2: 認証基盤 ──

# Auth Engineer (DB Architect 完了後)
claude --team auth-engineer "Supabase Auth で認証フローを実装してください。
.context/db-schema.md の型定義を参照し、trainer/member ロール別のミドルウェアを作成。
完了後 .context/auth-api.md を更新してください。"

# ── Phase 3: 機能実装 (4並列) ──

# Signup & Payments (Auth + UI 完了後)
claude --team signup-payments "計画書.md §4 フロー1 に従い、入会マルチステップフォームと
Stripe Checkout/Webhook 統合を実装してください。
.context/auth-api.md と .context/component-api.md を参照。"

# Counseling (Auth + UI 完了後、Signup と並列)
claude --team counseling "計画書.md §4 フロー2 に従い、性格診断・体のお悩み・食事の
3種カウンセリングフォームを実装してください。性格診断は Gemini API で指導ポイントを自動生成。
完了後 .context/gemini-api.md を更新してください。"

# Training Pipeline (Auth + UI 完了後、並列)
claude --team training-pipeline "計画書.md §4 フロー3 に従い、トレーニング記録パイプラインを実装。
ファイル種別判定 → Route A (Whisper音声文字起こし) / Route B (Geminiテキスト構造化)、
pipeline_jobs ステータス管理、トレーナー確認UI、本日のセッション画面を作成。"

# Media & Member (Auth + UI 完了後、並列)
claude --team media-member "計画書.md §4 フロー3 (写真管理) と §4 3.2 (ユーザー側) に従い、
Google Drive 写真管理 (アップロード・タイムライン表示) と
会員向け機能 (記録閲覧・体重入力・グラフ) を実装してください。"

# AI Suggest (Training Pipeline 完了後)
claude --team ai-suggest "計画書.md §4 フロー4 に従い、Gemini API による
AIメニュー提案機能を実装してください。過去トレーニングデータ・体重・カウンセリング情報を
集約し、次回メニューを提案。トレーナー向け承認/修正UIも作成。
.context/gemini-api.md を参照。"

# ── Phase 4: 品質仕上げ ──

# QA Tester (全 Feature 完了後)
claude --team qa-tester "全コードベースをビルド検証してください。
TypeScript型エラー、ESLint、RLSポリシー、外部API統合、PWA、レスポンシブを確認。
バグがあれば .logs/qa-tester/ にログを記録し、該当エージェントに修正依頼してください。"
```

---

## 6. 品質ゲート

### Phase 完了時チェックリスト

| チェック項目 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------------|---------|---------|---------|---------|
| `npm run build` 成功 | ✅ | ✅ | ✅ | ✅ |
| `npm run lint` 成功 | ✅ | ✅ | ✅ | ✅ |
| 型定義の整合性 | ✅ | ✅ | ✅ | ✅ |
| `.context/` 最新化 | ✅ | ✅ | ✅ | ✅ |
| ログ記録 | ✅ | ✅ | ✅ | ✅ |
| RLS ポリシー動作 | ✅ | ✅ | — | ✅ |
| 外部API統合テスト | — | — | ✅ | ✅ |
| レスポンシブ確認 | — | — | — | ✅ |
| PWA 動作確認 | — | — | — | ✅ |

### Phase 遷移の条件

- **Phase 1 → 2**: DB Architect の型定義 + UI Builder のレイアウトが完成
- **Phase 2 → 3**: Auth Engineer のミドルウェア + 認証ユーティリティが完成
- **Phase 3 → 4**: 全 Feature Dev のコードがマージ済み
- 各遷移時に Team Lead が `npm run build` を実行し、ビルド成功を確認

---

## 7. 外部サービス統合の責任分担

| 外部サービス | 主担当エージェント | 共通ライブラリ |
|-------------|-------------------|---------------|
| Supabase (DB/Auth) | DB Architect + Auth Engineer | `src/lib/supabase/` |
| Stripe | Signup & Payments Dev | `src/lib/stripe/` |
| Google Drive | Media & Member Dev | `src/lib/google-drive/` |
| OpenAI Whisper | Training Pipeline Dev | `src/lib/whisper/` |
| Gemini API | Counseling Dev (初期構築) → AI Suggest Dev (拡張) | `src/lib/gemini/` (共有) |

> **Gemini API の共有ルール**: Counseling Dev が `src/lib/gemini/` の基盤を構築し、
> `.context/gemini-api.md` にヘルパー関数のAPIを記録する。
> AI Suggest Dev はこの共有ライブラリを利用・拡張する。
