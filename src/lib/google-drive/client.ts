const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";

/** Check whether Google Drive service account credentials are configured */
export function isGoogleDriveConfigured(): boolean {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) return false;
  try {
    const parsed = JSON.parse(key);
    return !!(parsed.client_email && parsed.private_key);
  } catch {
    return false;
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 300_000) {
    return cachedToken.token;
  }

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not set");
  }

  const key = JSON.parse(raw);
  if (!key.client_email || !key.private_key) {
    throw new Error("Invalid service account key: missing client_email or private_key");
  }

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const claim = Buffer.from(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(key.private_key, "base64url");

  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google OAuth token error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

/**
 * Search for an existing folder by name inside a parent folder.
 * Returns the folder ID if found, or null.
 */
export async function findFolder(name: string, parentId: string): Promise<string | null> {
  const token = await getAccessToken();
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );

  const res = await fetch(`${GOOGLE_DRIVE_API}/files?q=${q}&fields=files(id)&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("findFolder error:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Create a folder in Google Drive. Returns the folder ID.
 */
export async function createFolder(name: string, parentId?: string): Promise<string> {
  const token = await getAccessToken();
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const res = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`createFolder error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Find an existing folder or create a new one.
 * Prevents duplicate folder creation for the same member.
 */
export async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const existingId = await findFolder(name, parentId);
  if (existingId) return existingId;
  return createFolder(name, parentId);
}

/**
 * Upload a file to Google Drive.
 * Returns the file ID and webViewLink.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const token = await getAccessToken();

  const metadata = {
    name: filename,
    parents: [folderId],
  };

  const boundary = "piste_upload_boundary";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
  ].join("\r\n");

  const bodyBuffer = Buffer.concat([
    Buffer.from(body + "\r\n"),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyBuffer,
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`uploadFile error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return {
    fileId: data.id,
    webViewLink: data.webViewLink ?? "",
  };
}

/**
 * Get a thumbnail URL for a Google Drive file.
 * Returns a proxied URL that doesn't require authentication.
 */
export function getThumbnailUrl(fileId: string, size: number = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

/**
 * Get a direct content URL for a Google Drive file (for images).
 */
export function getImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Make a file publicly readable (for thumbnail access).
 */
export async function makeFilePublic(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });
  if (!res.ok) {
    console.error("makeFilePublic error:", await res.text());
  }
}
