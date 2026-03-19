import { createClient } from "@/lib/supabase/server";
import { transcribeAudio } from "./transcribe";
import { structureTranscript } from "./structure";
import type { StructuredSession } from "./structure";

/**
 * パイプラインジョブ全体を制御するオーケストレーター。
 *
 * 1. pipeline_jobs のステータスを段階的に更新
 * 2. Route A (audio): Whisper で文字起こし → Gemini で構造化
 * 3. Route B (text): テキスト読込 → Gemini で構造化
 * 4. 構造化結果を pending_review で保存
 * 5. エラー時は failed ステータスとメッセージを記録
 */
export async function processPipelineJob(jobId: string): Promise<void> {
  const supabase = await createClient();

  // ジョブ情報を取得
  const { data: job, error: fetchError } = await supabase
    .from("pipeline_jobs")
    .select("*, inbox_files(*)")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    throw new Error(`ジョブが見つかりません: ${jobId}`);
  }

  try {
    let transcript: string;

    if (job.route === "audio") {
      // ===== Route A: 音声 → 文字起こし → 構造化 =====
      await updateJobStatus(supabase, jobId, "transcribing");

      // Supabase Storage から音声ファイルをダウンロード
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("inbox")
        .download(job.inbox_files.storage_path);

      if (downloadError || !fileData) {
        throw new Error(
          `音声ファイルのダウンロードに失敗: ${downloadError?.message ?? "データなし"}`
        );
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      transcript = await transcribeAudio(
        buffer,
        job.inbox_files.original_filename
      );

      // 文字起こし結果を保存
      await supabase
        .from("pipeline_jobs")
        .update({ whisper_result: transcript })
        .eq("id", jobId);
    } else {
      // ===== Route B: テキスト → 構造化 =====
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("inbox")
        .download(job.inbox_files.storage_path);

      if (downloadError || !fileData) {
        throw new Error(
          `テキストファイルのダウンロードに失敗: ${downloadError?.message ?? "データなし"}`
        );
      }

      transcript = await fileData.text();
    }

    // ===== 構造化処理 =====
    await updateJobStatus(supabase, jobId, "structuring");

    const structured: StructuredSession =
      await structureTranscript(transcript);

    // 構造化結果を保存し、ステータスを pending_review に
    await supabase
      .from("pipeline_jobs")
      .update({
        status: "pending_review",
        structured_data: structured as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // inbox_files を処理済みに更新
    await supabase
      .from("inbox_files")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", job.inbox_file_id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    await supabase
      .from("pipeline_jobs")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    throw error;
  }
}

/**
 * パイプラインジョブの confirmed 時に workout_sessions と session_sets を作成する。
 */
export async function confirmPipelineJob(
  jobId: string,
  memberId: string,
  trainerId: string,
  sessionDate: string,
  exercises: Array<{
    exerciseName: string;
    weightKg: number;
    reps: number;
    sets: number;
    notes?: string;
  }>,
  trainerNotes?: string
): Promise<string> {
  const supabase = await createClient();

  // ジョブのステータスを confirmed に更新
  await supabase
    .from("pipeline_jobs")
    .update({
      status: "confirmed",
      structured_data: { exercises, trainerNotes } as unknown as Record<
        string,
        unknown
      >,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // workout_session を作成
  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      member_id: memberId,
      trainer_id: trainerId,
      pipeline_job_id: jobId,
      session_date: sessionDate,
      status: "confirmed",
      trainer_notes: trainerNotes ?? null,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error(
      `セッション作成に失敗: ${sessionError?.message ?? "不明なエラー"}`
    );
  }

  // exercises マスターから exercise_id を取得してセットを登録
  for (const ex of exercises) {
    // 種目名で exercises マスターを検索（なければ作成）
    let exerciseId: string;
    const { data: existingExercise } = await supabase
      .from("exercises")
      .select("id")
      .eq("name", ex.exerciseName)
      .limit(1)
      .single();

    if (existingExercise) {
      exerciseId = existingExercise.id;
    } else {
      const { data: newExercise, error: createError } = await supabase
        .from("exercises")
        .insert({
          name: ex.exerciseName,
          muscle_group: "その他",
          created_by: trainerId,
        })
        .select("id")
        .single();

      if (createError || !newExercise) {
        console.error(`種目「${ex.exerciseName}」の作成に失敗:`, createError);
        continue;
      }
      exerciseId = newExercise.id;
    }

    // セットを登録
    const setsToInsert = Array.from({ length: ex.sets }, (_, i) => ({
      session_id: session.id,
      exercise_id: exerciseId,
      set_number: i + 1,
      weight_kg: ex.weightKg,
      reps: ex.reps,
      notes: ex.notes ?? null,
    }));

    const { error: setsError } = await supabase
      .from("session_sets")
      .insert(setsToInsert);

    if (setsError) {
      console.error(
        `セット登録に失敗 (種目: ${ex.exerciseName}):`,
        setsError
      );
    }
  }

  return session.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateJobStatus(supabase: any, jobId: string, status: string) {
  await supabase
    .from("pipeline_jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}
