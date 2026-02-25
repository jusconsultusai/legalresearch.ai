/**
 * ONLYOFFICE DocSpace API Client
 * https://api.onlyoffice.com/docspace/api-backend/get-started/basic-concepts/
 *
 * Uses an API key (Bearer token) for server-side operations.
 * The API key was created via POST /api/2.0/keys on the DocSpace instance.
 */

import HTMLtoDOCX from "html-to-docx";

const DOCSPACE_URL = process.env.DOCSPACE_URL || "https://docspace-h0gtq0.onlyoffice.com";
const DOCSPACE_API_KEY = process.env.DOCSPACE_API_KEY || "";

/** Shared auth headers for every DocSpace API request. */
function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${DOCSPACE_API_KEY}`,
    Accept: "application/json",
  };
}

/** Low-level fetch wrapper — throws on non-OK with the DocSpace error message. */
async function dsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DOCSPACE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...((init?.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error?.message || body?.message || message;
    } catch { /* ignore parse error */ }
    throw new Error(`DocSpace API ${res.status}: ${message}`);
  }
  return res.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocSpaceFile {
  id: number;
  title: string;
  folderId: number;
  fileType: number;
  fileExst: string;
  webUrl: string;
}

export interface DocSpaceFolder {
  id: number;
  title: string;
  parentId: number;
}

export interface DocSpaceSharedLink {
  sharedTo: {
    shareLink: string;
    linkType: number; // 1 = edit, 2 = view
    expirationDate: string | null;
    requestToken: string;
  };
}

// ─── Folder helpers ──────────────────────────────────────────────────────────

/** Returns the numeric ID of the authenticated user's "My Documents" folder. */
export async function getMyFolderId(): Promise<number> {
  // GET /api/2.0/files/@my returns { response: { current: {...}, folders: [], files: [] } }
  const data = await dsRequest<{ response: { current: DocSpaceFolder; folders: DocSpaceFolder[]; files: unknown[] } }>("/api/2.0/files/@my");
  return data.response.current.id;
}

/**
 * Find or create a sub-folder named `folderTitle` inside `parentFolderId`.
 * Used to keep JusConsultus documents in their own folder in DocSpace.
 */
export async function getOrCreateFolder(
  parentFolderId: number,
  folderTitle: string
): Promise<number> {
  // List children — GET /api/2.0/files/{id} returns { response: { current, folders, files } }
  const data = await dsRequest<{ response: { current: DocSpaceFolder; folders: DocSpaceFolder[] } }>(
    `/api/2.0/files/${parentFolderId}`
  );
  const existing = data.response.folders?.find((f) => f.title === folderTitle);
  if (existing) return existing.id;

  // Create it — DocSpace API: POST /api/2.0/files/folder/{parentId}
  const created = await dsRequest<{ response: DocSpaceFolder }>(`/api/2.0/files/folder/${parentFolderId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: folderTitle }),
  });
  return created.response.id;
}

// ─── File operations ─────────────────────────────────────────────────────────

/**
 * Upload a .docx binary to DocSpace, returns the new file's numeric ID.
 * The file is placed in `folderId`.
 */
export async function uploadDocx(
  folderId: number,
  filename: string,
  docxBuffer: Buffer | ArrayBuffer
): Promise<number> {
  const buffer = Buffer.isBuffer(docxBuffer) ? docxBuffer : Buffer.from(docxBuffer);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    filename
  );

  const data = await dsRequest<{ response: DocSpaceFile[] }>(
    `/api/2.0/files/${folderId}/upload`,
    { method: "POST", body: form }
  );

  const file = Array.isArray(data.response) ? data.response[0] : (data.response as any);
  return file.id;
}

/**
 * Update the content of an existing DocSpace file with a new .docx binary.
 */
export async function updateDocxFile(
  fileId: number,
  filename: string,
  docxBuffer: Buffer | ArrayBuffer
): Promise<void> {
  const buffer = Buffer.isBuffer(docxBuffer) ? docxBuffer : Buffer.from(docxBuffer);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    filename
  );

  await dsRequest<unknown>(`/api/2.0/files/${fileId}/update`, {
    method: "PUT",
    body: form,
  });
}

/**
 * Get an external "edit" shared link (requestToken) for a DocSpace file.
 * DocSpace uses this token so the embedded SDK can open the file without
 * requiring the end-user to log into DocSpace themselves.
 */
export async function getOrCreateEditLink(fileId: number): Promise<string> {
  // List existing external links
  try {
    const existing = await dsRequest<{ response: DocSpaceSharedLink[] }>(
      `/api/2.0/files/file/${fileId}/links`
    );
    const editLink = existing.response?.find(
      (l) => l.sharedTo.linkType === 1
    );
    if (editLink?.sharedTo.requestToken) {
      return editLink.sharedTo.requestToken;
    }
  } catch {
    // No existing links — create one below
  }

  // Create an edit link
  const created = await dsRequest<{ response: DocSpaceSharedLink }>(
    `/api/2.0/files/file/${fileId}/links`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkType: 1, // 1 = edit access
        expirationDate: null, // no expiry
      }),
    }
  );
  return created.response.sharedTo.requestToken;
}

// ─── High-level sync ─────────────────────────────────────────────────────────

/**
 * Convert HTML to a .docx buffer using html-to-docx.
 */
export async function htmlToDocxBuffer(
  html: string,
  title: string
): Promise<Buffer> {
  const buf = await HTMLtoDOCX(html || "<p></p>", null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
    font: "Times New Roman",
    fontSize: 24,
    margins: { top: 1440, bottom: 1440, left: 1800, right: 1800 },
    title,
  });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
}

/**
 * Ensure a document exists in DocSpace and is up-to-date with the provided HTML.
 * - If `docspaceFileId` is null → uploads and returns a new file ID.
 * - If `docspaceFileId` is set → updates existing file, returns same ID.
 * Also returns a `requestToken` for the embedded SDK editor.
 */
export async function syncDocumentToDocSpace(opts: {
  html: string;
  title: string;
  docspaceFileId: number | null;
}): Promise<{ fileId: number; requestToken: string }> {
  const { html, title, docspaceFileId } = opts;
  const filename = `${title.replace(/[^\w\s-]/g, "").trim() || "document"}.docx`;
  const docxBuf = await htmlToDocxBuffer(html, title);

  let fileId: number;

  if (docspaceFileId) {
    // Update existing file
    await updateDocxFile(docspaceFileId, filename, docxBuf);
    fileId = docspaceFileId;
  } else {
    // Upload to My Documents → JusConsultus subfolder
    const myFolderId = await getMyFolderId();
    const folderId = await getOrCreateFolder(myFolderId, "JusConsultus");
    fileId = await uploadDocx(folderId, filename, docxBuf);
  }

  const requestToken = await getOrCreateEditLink(fileId);
  return { fileId, requestToken };
}
