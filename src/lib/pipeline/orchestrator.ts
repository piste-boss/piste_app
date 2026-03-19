import { createClient } from "@/lib/supabase/server";
import { detectFileType } from "./detect";
import { transcribeAudio } from "./transcribe";
import { structureTranscript } from "./structure";

export async function processPipelineJob(jobId: string) {
  const supabase = await createClient();

  // Get job and file info
  const { data: job } = await supabase
    .from("pipeline_jobs")
    .select("*, inbox_files(*)")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error(`Job not found: ${jobId}`);

  try {
    let transcript: string;

    if (job.route === "audio") {
      // Route A: Audio → Transcribe → Structure
      await supabase
        .from("pipeline_jobs")
        .update({ status: "transcribing" })
        .eq("id", jobId);

      // Fetch audio file from storage
      const { data: fileData } = await supabase.storage
        .from("inbox")
        .download(job.inbox_files.storage_path);

      if (!fileData) throw new Error("Failed to download audio file");

      const buffer = Buffer.from(await fileData.arrayBuffer());
      transcript = await transcribeAudio(buffer, job.inbox_files.original_filename);

      await supabase
        .from("pipeline_jobs")
        .update({ whisper_result: transcript })
        .eq("id", jobId);
    } else {
      // Route B: Text → Structure
      const { data: fileData } = await supabase.storage
        .from("inbox")
        .download(job.inbox_files.storage_path);

      if (!fileData) throw new Error("Failed to download text file");
      transcript = await fileData.text();
    }

    // Structure the transcript
    await supabase
      .from("pipeline_jobs")
      .update({ status: "structuring" })
      .eq("id", jobId);

    const structured = await structureTranscript(transcript);

    await supabase
      .from("pipeline_jobs")
      .update({
        status: "pending_review",
        structured_data: structured as unknown as Record<string, unknown>,
      })
      .eq("id", jobId);

    // Mark inbox file as processed
    await supabase
      .from("inbox_files")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", job.inbox_file_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await supabase
      .from("pipeline_jobs")
      .update({ status: "failed", error_message: message })
      .eq("id", jobId);
    throw error;
  }
}
