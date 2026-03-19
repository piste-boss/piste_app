import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createFolder, uploadFile } from "@/lib/google-drive/client";
import type { PhotoType } from "@/types/database";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const memberId = formData.get("memberId") as string;
    const photoType = formData.get("photoType") as PhotoType;

    if (!file || !memberId || !photoType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get member info
    const { data: member } = await supabase
      .from("users")
      .select("last_name, first_name")
      .eq("id", memberId)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
    const memberFolderName = `${member.last_name}${member.first_name}_${memberId.slice(0, 8)}`;

    // Create member folder if needed
    const memberFolderId = await createFolder(memberFolderName, rootFolderId);

    // Create date subfolder
    const dateFolder = new Date().toISOString().slice(0, 10);
    const dateFolderId = await createFolder(dateFolder, memberFolderId);

    // Upload file
    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileId } = await uploadFile(buffer, file.name, file.type, dateFolderId);

    // Save to DB
    await supabase.from("body_photos").insert({
      member_id: memberId,
      taken_at: new Date().toISOString(),
      google_drive_file_id: fileId,
      google_drive_folder_id: dateFolderId,
      photo_type: photoType,
    });

    return NextResponse.json({ fileId });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
