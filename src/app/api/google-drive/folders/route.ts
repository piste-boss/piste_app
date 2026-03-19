import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isGoogleDriveConfigured,
  findOrCreateFolder,
} from "@/lib/google-drive/client";

/**
 * POST /api/google-drive/folders
 * Body: { memberId: string }
 *
 * Ensures a member folder exists in Google Drive.
 * Creates /Piste/[会員名]_[ID]/ if it doesn't exist.
 * Returns the folder ID.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId は必須です" },
        { status: 400 }
      );
    }

    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          error: "Google Drive が設定されていません",
          configured: false,
        },
        { status: 503 }
      );
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      return NextResponse.json(
        { error: "GOOGLE_DRIVE_ROOT_FOLDER_ID が設定されていません" },
        { status: 500 }
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

    const memberFolderName = `${member.last_name}${member.first_name}_${memberId.slice(0, 8)}`;
    const folderId = await findOrCreateFolder(memberFolderName, rootFolderId);

    return NextResponse.json({
      folderId,
      folderName: memberFolderName,
      configured: true,
    });
  } catch (error) {
    console.error("Folder creation error:", error);
    return NextResponse.json(
      { error: "フォルダの作成に失敗しました" },
      { status: 500 }
    );
  }
}
