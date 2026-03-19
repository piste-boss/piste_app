# Gemini API - Piste

## ヘルパー関数 (`src/lib/gemini/client.ts`)

### generateWithGemini(prompt, options?): Promise<string>
テキスト生成。Gemini APIにプロンプトを送信し、生成テキストを返す。
- `options.temperature`: 生成のランダム性 (default: 0.7)
- `options.maxOutputTokens`: 最大トークン数 (default: 2048)

### generateJsonWithGemini<T>(prompt, options?): Promise<T>
JSON生成。プロンプトの末尾に「JSONのみを返してください」を追加し、レスポンスからJSONを抽出してパースする。
- JSON生成向けにデフォルト temperature を 0.4 に設定

### analyzePersonality(answers): Promise<PersonalityAnalysis>
性格診断の回答から Gemini で指導ポイントを自動生成する。
- 入力: `Record<string, string>` (質問ID -> 回答テキスト)
- 出力: `{ training_style: string, coaching_tips: string[] }`
- 性格タイプ名 + トレーナー向け指導ポイント 3-5項目を生成

## 使用例
```typescript
import { generateWithGemini, generateJsonWithGemini, analyzePersonality } from "@/lib/gemini/client";

const text = await generateWithGemini("トレーニングメニューを提案して");
const data = await generateJsonWithGemini<{ exercises: string[] }>("...");
const personality = await analyzePersonality({ motivation: "褒められたとき", pace: "コツコツ" });
```

## 環境変数
- `GEMINI_API_KEY`: Gemini APIキー (未設定時はエラーを投げる)

## エラーハンドリング
- APIキー未設定: `GEMINI_API_KEY environment variable is not set`
- APIエラー: ステータスコードとレスポンスボディを含むエラーメッセージ
- JSON パース失敗: `Gemini response is not valid JSON`
