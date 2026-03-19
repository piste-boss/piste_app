import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectFileType } from "@/lib/pipeline/detect";
import { processPipelineJob } from "@/lib/pipeline/orchestrator";

/**
 * POST /api/pipeline/webhook
 *
 * ファイルアップロード受信 → inbox_files レコード作成 → pipeline_jobs 作成 → orchestrator 起動
 *
 * リクエスト形式 (JSON):
 * {
 *   trainer_id: string,
 *   member_id: string,
 *   session_date: string,
 *   file_path: string,      // Supabase Storage パス
 *   file_name: string,       // 元ファイル名
 *   file_size?: number
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const {
      trainer_id,
      member_id,
      session_date,
      file_path,
      file_name,
      file_size,
    } = body;

    // バリデーション
    if (!member_id || !file_path || !file_name) {
      return NextResponse.json(
        {
          error:
            "必須パラメータが不足しています (member_id, file_path, file_name)",
        },
        { status: 400 }
      );
    }

    // ファイル種別判定
    let fileType: "audio" | "text";
    try {
      fileType = detectFileType(file_name);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "ファイル形式不明" },
        { status: 400 }
      );
    }

    // inbox_files レコード作成
    const { data: inboxFile, error: inboxError } = await supabase
      .from("inbox_files")
      .insert({
        member_id,
        uploaded_by: trainer_id || user.id,
        file_type: fileType,
        original_filename: file_name,
        storage_path: file_path,
        file_size_bytes: file_size ?? null,
      })
      .select()
      .single();

    if (inboxError || !inboxFile) {
      console.error("inbox_files 作成失敗:", inboxError);
      return NextResponse.json(
        { error: "ファイル記録の作成に失敗しました" },
        { status: 500 }
      );
    }

    // pipeline_jobs 作成
    const { data: job, error: jobError } = await supabase
      .from("pipeline_jobs")
      .insert({
        inbox_file_id: inboxFile.id,
        route: fileType,
        status: "queued",
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("pipeline_jobs 作成失敗:", jobError);
      return NextResponse.json(
        { error: "パイプラインジョブの作成に失敗しました" },
        { status: 500 }
      );
    }

    // 非同期でパイプライン処理を開始
    // 本番環境ではキューサービス (BullMQ, Inngest 等) を使うべき
    processPipelineJob(job.id).catch((err) => {
      console.error(`パイプラインジョブ ${job.id} の処理失敗:`, err);
    });

    return NextResponse.json({
      job_id: job.id,
      inbox_file_id: inboxFile.id,
      status: "queued",
      route: fileType,
      session_date,
    });
  } catch (error) {
    console.error("Pipeline webhook error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
