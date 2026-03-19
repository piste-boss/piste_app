# Gemini API - Piste

## ヘルパー関数 (`src/lib/gemini/client.ts`)

### generateWithGemini(prompt: string): Promise<string>
テキスト生成。Gemini APIにプロンプトを送信し、生成テキストを返す。

### generateJsonWithGemini<T>(prompt: string): Promise<T>
JSON生成。プロンプトの末尾に「JSONのみを返してください」を追加し、レスポンスからJSONを抽出してパースする。

## 使用例
```typescript
import { generateWithGemini, generateJsonWithGemini } from "@/lib/gemini/client";

const text = await generateWithGemini("トレーニングメニューを提案して");
const data = await generateJsonWithGemini<{ exercises: string[] }>("...");
```

## 環境変数
- `GEMINI_API_KEY`: Gemini APIキー
