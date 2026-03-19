# Piste プロジェクト進捗

## Phase 1: 基盤構築 - 完了
- Next.js 15 + Tailwind CSS + shadcn/ui
- PWA設定 (manifest.json, Service Worker)
- 3レイアウト: (public), (trainer), (member)
- 共通コンポーネント
- Supabase 全14テーブル + RLS + 型定義

## Phase 2: 認証基盤 - 完了
- Supabase Auth (Server/Client)
- ミドルウェア (ロールベースルーティング)
- ログインページ

## Phase 3: 機能実装 - 完了
- 入会マルチステップフォーム + Stripe
- カウンセリング3種 + AI指導ポイント
- トレーニングパイプライン (Whisper + Gemini)
- Google Drive写真管理
- 会員向け機能
- AIメニュー提案

### カウンセリング機能 詳細
- `/trainer/members/[id]/counseling` — 3種の入力状況一覧 (Server Component)
- `/trainer/members/[id]/counseling/personality` — 性格診断 (6問選択式 + Gemini AI分析 + 編集可能な指導ポイント)
- `/trainer/members/[id]/counseling/body` — 体のお悩み (12部位悩み選択 + 既往歴テキスト + 10目標選択)
- `/trainer/members/[id]/counseling/diet` — 食事 (回数/時間帯/傾向/アレルギー/改善目標)
- Server Actions で Supabase CRUD (upsert方式)
- Gemini `analyzePersonality()` で性格タイプ名 + 指導ポイント3-5項目を自動生成
- トレーナーが指導ポイントをインライン編集・追加・削除可能

## Phase 4: 品質仕上げ - 完了

### 入会フロー + Stripe 統合 (本番品質実装) - 完了
実装日: 2026-03-19

**改善された機能:**

1. **マルチステップフォーム (3ステップ)**
   - Step 1 (`/signup`): 基本情報入力 — Zod バリデーション、フィールドレベルエラー表示、ステップインジケーター
   - Step 2 (`/signup/terms`): 利用規約 — スクロール完了検知、チェックボックスによる同意、全8条の規約テキスト
   - Step 3 (`/signup/payment`): Stripe Checkout — 登録内容確認表示、セキュリティ説明、詳細エラーメッセージ
   - 完了ページ (`/signup/complete`): 自動ログイン、ダッシュボードへのリダイレクト

2. **Stripe 統合**
   - Checkout Session API (`/api/stripe/checkout`): service-role による安全なユーザー作成、ロールバック付きエラーハンドリング、入力バリデーション、重複チェック
   - Webhook (`/api/stripe/webhook`): checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted に対応、idempotent upsert

3. **バリデーション (`src/lib/validations/signup.ts`)**
   - Step 1 用スキーマ分離 (signupStep1Schema)
   - パスワード強度要件 (英字+数字)
   - 電話番号フォーマット検証

4. **Zustand ストア (`src/stores/signup-store.ts`)**
   - フィールドレベルエラー管理
   - バリデーション結果のリアルタイム反映
   - 型安全な setField

5. **インフラ**
   - Supabase admin クライアント (`src/lib/supabase/admin.ts`)
   - subscriptions テーブル unique 制約マイグレーション
   - .env.example に SUPABASE_SERVICE_ROLE_KEY 追記

### Step 5: 写真管理 (Google Drive) - 完了
実装日: 2026-03-19

- Google Drive API クライアント強化 (`src/lib/google-drive/client.ts`)
  - アクセストークンキャッシュ（5分バッファ付き有効期限管理）
  - `findFolder()` — 既存フォルダ検索
  - `findOrCreateFolder()` — 重複フォルダ防止
  - `makeFilePublic()` — サムネイルアクセス用公開設定
  - `getThumbnailUrl()` / `getImageUrl()` — URL生成ヘルパー
  - `isGoogleDriveConfigured()` — 設定有無判定（フォールバック用）
  - 全API呼出のエラーハンドリング・詳細エラーメッセージ
- `/api/google-drive/upload` (POST) — 写真アップロードAPI
  - 画像バリデーション（タイプ・サイズ10MB上限）
  - photoType バリデーション (front/side/back)
  - Drive未設定時フォールバック（DB記録のみ保存）
  - Drive障害時フォールバック（Drive失敗してもDB保存は継続）
  - サムネイルURL自動生成・公開設定
- `/api/google-drive/folders` (POST) — フォルダ管理API新規作成
  - 会員フォルダの存在確認・自動作成
  - Drive未設定時の適切なエラーレスポンス
- トレーナー写真管理ページ (`/trainer/members/[id]/photos`)
  - カメラ撮影UI（capture="environment"）
  - ファイル選択UI
  - 撮影部位選択（正面/側面/背面）ダイアログ
  - プレビュー表示
  - アップロード → Google Drive → body_photos テーブル記録
  - 変化タイムライン横スクロール表示（入会時→1ヶ月→2ヶ月...）
  - 月別グリッド表示
  - 部位タブ切替 + 写真数バッジ
  - スケルトンローディング

### Step 6: 会員向け機能 - 完了
実装日: 2026-03-19

- 会員ダッシュボード (`/member/member-dashboard`)
  - ユーザー名表示
  - 次回予定カード（未来のセッションを表示）
  - 直近3件のトレーニング記録サマリー（セット数・詳細リンク付き）
  - 体重推移ミニグラフ（WeightChart コンポーネント）
  - クイックリンク（体形変化・体重記録）
  - スケルトンローディング
- トレーニング記録一覧 (`/member/records`)
  - 月別グルーピング表示
  - exercises テーブルJOINによる種目名取得
  - 種目名・セット数表示
  - ステータスバッジ（完了/確認済/未確認）
  - 詳細ページへのリンク（Card全体がクリッカブル）
  - スケルトンローディング
- トレーニング記録詳細 (`/member/records/[id]`)
  - exercises テーブルJOINによる種目名取得
  - 種目別グループ化 — セット・重量・レップ表示
  - セットごとのメモ表示
  - トレーナーメモ
  - サマリーカード（種目数・セット数）
  - 担当トレーナー名表示
  - 所有権チェック (member_id = user.id)
  - 一覧への戻るボタン
  - 404ハンドリング
- 体形変化写真閲覧 (`/member/photos`)
  - タイムライン横スクロール（2枚以上ある場合）
  - 月別グリッド表示
  - 拡大表示ダイアログ（高解像度サムネイル）
  - 部位切替タブ + 枚数バッジ
  - スケルトンローディング
- 体重入力・推移グラフ (`/member/weight`)
  - 日付 + 体重kg + メモ入力フォーム
  - body_weight テーブルへの保存
  - 入力バリデーション（範囲チェック）
  - 保存成功/エラーフィードバック
  - 統計カード（最新値・前回比・変動幅）
  - 体重推移折れ線グラフ (SVGベース WeightChart — 最大90件)
  - 記録履歴リスト（前回比差分カラー表示）
  - スケルトンローディング
- 会員レイアウトのナビゲーション修正（正しいパスへのリンク）

### Step 7: トレーニング記録パイプライン + セッション管理 (本番品質実装) - 完了
実装日: 2026-03-19

**パイプライン本体 (`src/lib/pipeline/`):**
- `detect.ts` — ファイル種別自動判別 (拡張子ベース audio/text 判定 + MIME type ヘルパー、日本語エラーメッセージ)
- `transcribe.ts` — Route A: OpenAI Whisper API 日本語音声→テキスト変換 (response_format=text、APIキー未設定時フォールバック対応)
- `structure.ts` — Route B: Gemini API 構造化データ抽出 (種目名/重量kg/レップ数/セット数/コメント、詳細プロンプト、APIキー未設定時フォールバック対応)
- `orchestrator.ts` — パイプライン全体制御 (ステータス段階的更新: queued→transcribing→structuring→pending_review)、confirmPipelineJob() で workout_sessions + session_sets 自動作成、exercises マスター自動登録

**API エンドポイント:**
- `POST /api/pipeline/webhook` — ファイルアップロード受信、inbox_files レコード作成、pipeline_jobs 作成、orchestrator 非同期起動、バリデーション + 日本語エラーメッセージ

**トレーナー画面:**
- `/trainer/members/[id]/today` — 性格タイプ・指導ポイント冒頭カード、AI提案メニュー表示 + [この提案を採用]/[修正する] ボタン、過去メニュー重量推移グラフ (種目別・セッション間差分表示)、セッション履歴リスト、新規セッション記録ボタン
- `/trainer/sessions/new` — 会員選択 (URLクエリパラメータ対応)、タブ切替 (ファイルアップロード / 手動入力)、手動メニュー入力 (種目/重量/レップ/セット/メモ、追加/削除)、ファイルアップロード→Supabase Storage→パイプライン起動、workout_sessions + session_sets 直接保存
- `/trainer/sessions/[id]` — pipeline_jobs / workout_sessions 両対応、AI構造化結果の確認・手動修正 (種目追加/削除)、文字起こし結果表示 (Route A)、処理中スピナー + 状態更新ボタン、確定ボタン (confirmed に更新 + workout_sessions/session_sets 作成)、失敗時エラー表示 + 再試行導線

**トレーナーダッシュボード:**
- `/trainer/trainer-dashboard` — Supabase から動的取得: 本日のセッション数/担当会員数/未確認記録数、未確認パイプラインジョブ一覧 (ステータスバッジ付き)、最近のセッション一覧 (会員名表示)、新規セッション記録ボタン、スケルトンローディング

**シードデータ:**
- `supabase/seed.sql` — exercises テーブルに主要20種目のマスターデータ (胸/脚/背中/肩/腕/体幹/臀部)

### QA検証 - 完了
実施日: 2026-03-19

**ビルドエラー修正 (3件):**
1. Stripe v20+ 型互換性修正 — `invoice.subscription` を `invoice.parent.subscription_details.subscription` に変更 (`/api/stripe/webhook`)
2. `useSearchParams` Suspense boundary 追加 — `/signup/complete`, `/sessions/new`, `/signup/payment` の3ページ
3. Supabase JOIN 型アサーション修正 — `as unknown as` パターンで配列/オブジェクト不一致を解消 (`/api/ai/suggest-menu`)

**ESLint エラー修正 (2件):**
1. `setState` in effect 修正 — `/signup/complete` で初期値を searchParams から同期的に導出
2. `setState` in effect 修正 — `/signup/payment` で canceled パラメータを初期値として設定

**構成確認:**
- 重複ルートあり: `(trainer)/members/[id]/counseling/...` (Client版) と `(trainer)/trainer/members/[id]/counseling/...` (Server版) が共存。両方とも動作するが URL パスが異なるため競合なし。既存リンクは `/members/[id]/counseling` を使用。
- API routes: 全5エンドポイントで認証チェック確認済み
- 環境変数: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY は NEXT_PUBLIC_ 未使用で安全
- Supabase クライアント使い分け正常: Browser(client) / Server(server) / Admin(admin)

### Step 8: AIメニュー提案 (本番品質実装) - 完了
実装日: 2026-03-19

**Gemini API クライアント拡張 (`src/lib/gemini/client.ts`):**
- `suggestMenu(data)` — トレーニングデータ集約結果を受け取り、Gemini APIでメニュー提案を生成
- `MemberTrainingData` 型 — 会員情報・トレーニング履歴・体重・カウンセリング情報の集約構造体
- `MenuSuggestion` / `SuggestedExercise` 型 — AI提案結果の型定義
- 種目別重量推移の自動構造化 (最高重量セットを種目ごとに時系列化)
- 性格タイプ別の強度ガイダンス自動生成 (ストイック/褒められ伸びる/コツコツ/チャレンジ/未診断)
- 目標別の種目選定ガイダンス (ダイエット/筋力UP/姿勢改善)
- 漸進的過負荷の原則に基づくプロンプト設計

**API エンドポイント (`/api/ai/suggest-menu`):**
- `POST` — メニュー提案生成
  - member_id + suggested_for_date を受け取り
  - トレーナー-会員関係の検証
  - 6テーブル並列データ取得 (users, workout_sessions+session_sets+exercises, body_weight, counseling_personality, counseling_body, counseling_diet)
  - session_sets を種目別にグループ化・構造化
  - Gemini API 呼出 → ai_menu_suggestions テーブルに保存
  - 保存失敗時もレスポンスは返す (フォールバック)
  - 入力バリデーション + 日本語エラーメッセージ
- `GET` — 提案履歴取得 (memberId フィルタ、limit パラメータ、会員名JOIN)
- `PATCH` — 提案ステータス更新 (accepted/modified/rejected、所有者チェック)

**トレーナー向け UI (`/trainer/ai-suggest`):**
- 会員選択ドロップダウン (担当会員リストを動的取得)
- 日付選択 (デフォルト: 今日)
- 「AI提案を生成」ボタン + ローディングスピナー (分析中メッセージ付き)
- 推奨メニュー詳細表示
  - 種目カード (番号・種目名・筋群バッジ・重量・レップ・セット・休憩時間)
  - 筋群別カラーコーディング (胸=赤/脚=青/背中=緑/肩=黄/腕=紫/体幹=橙/臀部=桃)
  - 展開/折りたたみでフォーム注意点・根拠表示
  - 推定所要時間バッジ
- AI分析・根拠テキスト表示 (ブルー背景カード)
- 注意事項表示 (イエロー警告カード)
- 全体戦略表示
- 承認 / 修正して採用 / 却下ボタン → ステータス即時更新
- 過去の提案履歴一覧
  - 会員名・日付・ステータスバッジ表示
  - アコーディオン展開で詳細表示
  - ステータス別スタイル (未確認=secondary/承認済=default/修正済=outline/却下=destructive)
  - スケルトンローディング
- エラー表示 (destructive カード)
