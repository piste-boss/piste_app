# アーキテクチャ判断ログ

## Supabase クライアント型パラメータ除去
Database型をジェネリックパラメータとして渡すと、RLSポリシーのFOR ALLが型レベルでinsert/updateをneverにする問題が発生。型パラメータを外して回避。本番ではsupabase gen typesで生成した型を使用する。

## Stripe 遅延初期化
`new Stripe()` をモジュールトップレベルで実行すると、ビルド時に環境変数が未設定でエラー。`getStripe()` 関数で遅延初期化するパターンに変更。

## middleware.ts の deprecation 警告
Next.js 16で middleware が deprecated。将来 proxy に移行予定。現時点では機能するため維持。

## ルートグループのパス衝突
(trainer)/dashboard と (member)/dashboard が同じ /dashboard パスに解決されて衝突。trainer-dashboard, member-dashboard にリネームして回避。
