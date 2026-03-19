# Component API - Piste

## レイアウト構成

| ルートグループ | 対象 | レイアウト特徴 |
|--------------|------|--------------|
| `(public)` | 未認証ユーザー | ヘッダー + フッター |
| `(trainer)` | トレーナー | サイドバー + ヘッダー (iPad最適化) |
| `(member)` | 会員 | ヘッダー + ボトムナビ (モバイル最適化) |

## 共通コンポーネント (`src/components/layout/`)

### PageShell
ページラッパー。タイトル + アクションボタン + コンテンツ。
```tsx
<PageShell title="会員一覧" description="担当会員の管理" actions={<Button>新規追加</Button>}>
  {children}
</PageShell>
```

### LoadingState
スケルトンベースのローディング。`count` で行数指定。
```tsx
<LoadingState count={5} />
```

### EmptyState
データ未登録時の表示。アイコン + メッセージ + アクション。
```tsx
<EmptyState icon="📋" title="記録がありません" action={{ label: "記録する", onClick: fn }} />
```

### ErrorBoundary
Reactエラーバウンダリ。子コンポーネントのエラーをキャッチ。
```tsx
<ErrorBoundary>
  <SomeComponent />
</ErrorBoundary>
```

## shadcn/ui コンポーネント (`src/components/ui/`)
button, card, input, label, dialog, sheet, tabs, badge, avatar, separator, dropdown-menu, skeleton

## 状態管理
Zustand (`src/stores/`) — 必要に応じてストアを追加
