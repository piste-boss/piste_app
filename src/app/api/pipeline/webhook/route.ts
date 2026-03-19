import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectFileType } from "@/lib/pipeline/detect";
import { processPipelineJob } from "@/lib/pipeline/orchestrator";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, uploadedBy, filename, storagePath, fileSizeBytes } = body;
    const fileType = detectFileType(filename);

    // Create inbox_file record
    const { data: inboxFile, error: inboxError } = await supabase
      .from("inbox_files")
      .insert({
        member_id: memberId,
        uploaded_by: uploadedBy,
        file_type: fileType,
        original_filename: filename,
        storage_path: storagePath,
        file_size_bytes: fileSizeBytes,
      })
      .select()
      .single();

    if (inboxError || !inboxFile) {
      return NextResponse.json({ error: "Failed to create inbox file" }, { status: 500 });
    }

    // Create pipeline job
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
      return NextResponse.json({ error: "Failed to create pipeline job" }, { status: 500 });
    }

    // Process asynchronously (in production, use a queue)
    processPipelineJob(job.id).catch(console.error);

    return NextResponse.json({ jobId: job.id, status: "queued" });
  } catch (error) {
    console.error("Pipeline webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
