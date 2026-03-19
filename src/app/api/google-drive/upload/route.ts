import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isGoogleDriveConfigured,
  findOrCreateFolder,
  uploadFile,
  getThumbnailUrl,
  makeFilePublic,
} from "@/lib/google-drive/client";
import type { PhotoType } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const memberId = formData.get("memberId") as string | null;
    const photoType = formData.get("photoType") as PhotoType | null;
    const takenAt = (formData.get("takenAt") as string) || new Date().toISOString();

    if (!file || !memberId || !photoType) {
      return NextResponse.json(
        { error: "file, memberId, photoType は必須です" },
        { status: 400 }
      );
    }

    // Validate photoType
    if (!["front", "side", "back"].includes(photoType)) {
      return NextResponse.json(
        { error: "photoType は front, side, back のいずれかを指定してください" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "画像ファイルのみアップロード可能です" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    // Get member info
    const { data: member } = await supabase
      .from("users")
      .select("last_name, first_name")
      .eq("id", memberId)
      .single();

    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    let googleDriveFileId: string | null = null;
    let googleDriveFolderId: string | null = null;
    let thumbnailUrl: string | null = null;

    if (isGoogleDriveConfigured()) {
      try {
        const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
        if (!rootFolderId) {
          throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is not set");
        }

        // Member folder: /Piste/田中太郎_abcd1234/
        const memberFolderName = `${member.last_name}${member.first_name}_${memberId.slice(0, 8)}`;
        const memberFolderId = await findOrCreateFolder(memberFolderName, rootFolderId);

        // Date subfolder: /Piste/田中太郎_abcd1234/2026-03-19/
        const dateFolder = takenAt.slice(0, 10);
        const dateFolderId = await findOrCreateFolder(dateFolder, memberFolderId);

        // Upload file
        const timestamp = Date.now();
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${photoType}_${timestamp}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFile(buffer, filename, file.type, dateFolderId);

        googleDriveFileId = result.fileId;
        googleDriveFolderId = dateFolderId;

        // Make file public for thumbnail access
        await makeFilePublic(result.fileId);
        thumbnailUrl = getThumbnailUrl(result.fileId);
      } catch (driveError) {
        console.error("Google Drive upload failed, saving record without Drive link:", driveError);
        // Continue without Google Drive - record will be saved to DB without file reference
      }
    } else {
      console.warn("Google Drive not configured. Saving photo record without file upload.");
    }

    // Save to body_photos table
    const { data: photo, error: dbError } = await supabase
      .from("body_photos")
      .insert({
        member_id: memberId,
        taken_at: takenAt,
        google_drive_file_id: googleDriveFileId,
        google_drive_folder_id: googleDriveFolderId,
        photo_type: photoType,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json(
        { error: "データベースへの保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: photo.id,
      fileId: googleDriveFileId,
      thumbnailUrl,
      driveConfigured: isGoogleDriveConfigured(),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
