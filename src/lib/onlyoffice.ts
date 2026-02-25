/**
 * ONLYOFFICE Document Server API Client
 * Provides functions to interact with ONLYOFFICE Document Server for collaborative document editing
 * Docs: https://api.onlyoffice.com/editors/basic
 */

import { createHash, createHmac, randomBytes } from "crypto";
import jwt from "jsonwebtoken";

const ONLYOFFICE_SERVER_URL = process.env.ONLYOFFICE_SERVER_URL || "http://localhost:8000";
const ONLYOFFICE_JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || "";

if (!ONLYOFFICE_JWT_SECRET) {
  console.warn("ONLYOFFICE_JWT_SECRET is not set. Document editing will not work securely.");
}

/**
 * Document types supported by ONLYOFFICE
 */
export enum DocumentType {
  TEXT = "text", // Word documents
  SPREADSHEET = "spreadsheet", // Excel documents
  PRESENTATION = "presentation", // PowerPoint documents
}

/**
 * Document formats
 */
export const DocumentFormats = {
  TEXT: [".doc", ".docx", ".docm", ".dot", ".dotx", ".dotm", ".odt", ".fodt", ".ott", ".rtf", ".txt", ".html", ".htm", ".mht", ".pdf", ".djvu", ".fb2", ".epub", ".xps"],
  SPREADSHEET: [".xls", ".xlsx", ".xlsm", ".xlt", ".xltx", ".xltm", ".ods", ".fods", ".ots", ".csv"],
  PRESENTATION: [".pps", ".ppsx", ".ppsm", ".ppt", ".pptx", ".pptm", ".pot", ".potx", ".potm", ".odp", ".fodp", ".otp"],
};

/**
 * Convert a document ID to a unique document key
 * ONLYOFFICE uses this to identify document versions
 */
export function documentIdToKey(documentId: string, version: number = 1): string {
  return `doc-${documentId}-v${version}`;
}

/**
 * Get document type from file extension
 */
export function getDocumentType(filename: string): DocumentType {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  
  if (DocumentFormats.TEXT.includes(ext)) return DocumentType.TEXT;
  if (DocumentFormats.SPREADSHEET.includes(ext)) return DocumentType.SPREADSHEET;
  if (DocumentFormats.PRESENTATION.includes(ext)) return DocumentType.PRESENTATION;
  
  return DocumentType.TEXT; // Default to text
}

/**
 * Generate JWT token for ONLYOFFICE API requests
 * Uses proper HMAC-SHA256 via the jsonwebtoken package.
 */
function generateJWT(payload: any): string {
  if (!ONLYOFFICE_JWT_SECRET) return "";

  try {
    return jwt.sign(payload, ONLYOFFICE_JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "1h",
    });
  } catch (error) {
    console.error("JWT generation error:", error);
    return "";
  }
}

/**
 * Configuration for ONLYOFFICE Document Editor
 */
export interface DocumentConfig {
  documentId: string;
  documentTitle: string;
  documentUrl: string;
  documentType: DocumentType;
  documentKey: string;
  user: {
    id: string;
    name: string;
  };
  callbackUrl?: string;
  mode?: "edit" | "view";
  permissions?: {
    edit?: boolean;
    download?: boolean;
    print?: boolean;
    review?: boolean;
    comment?: boolean;
  };
}

/**
 * Generate ONLYOFFICE editor configuration
 * This is used to initialize the editor on the client side
 */
export function generateEditorConfig(config: DocumentConfig) {
  const {
    documentId,
    documentTitle,
    documentUrl,
    documentType,
    documentKey,
    user,
    callbackUrl,
    mode = "edit",
    permissions = {
      edit: true,
      download: true,
      print: true,
      review: true,
      comment: true,
    },
  } = config;

  const editorConfig = {
    document: {
      fileType: documentTitle.split(".").pop() || "docx",
      key: documentKey,
      title: documentTitle,
      url: documentUrl,
      permissions: {
        edit: mode === "edit" && permissions.edit,
        download: permissions.download,
        print: permissions.print,
        review: permissions.review,
        comment: permissions.comment,
      },
    },
    documentType: documentType,
    editorConfig: {
      mode: mode,
      lang: "en",
      callbackUrl: callbackUrl,
      user: {
        id: user.id,
        name: user.name,
      },
      customization: {
        autosave: true,
        forcesave: true,
        commentAuthorOnly: false,
        comments: true,
        compactHeader: false,
        compactToolbar: false,
        compatibleFeatures: false,
        feedback: false,
        hideRightMenu: false,
        plugins: true,
        toolbarNoTabs: false,
        uiTheme: "theme-light",
      },
    },
    width: "100%",
    height: "100%",
  };

  // Generate JWT token for the config if secret is available
  if (ONLYOFFICE_JWT_SECRET) {
    const token = generateJWT(editorConfig);
    return {
      ...editorConfig,
      token,
    };
  }

  return editorConfig;
}

/**
 * Handle document save callback from ONLYOFFICE
 * ONLYOFFICE sends this when a document is saved
 */
export interface CallbackStatus {
  status: number; // 0=no doc, 1=editing, 2=ready for saving, 3=saving error, 4=closed no changes, 6=editing force save, 7=error force save
  url?: string; // Download URL for the saved document
  key?: string;
  users?: string[];
  actions?: any[];
  lastsave?: string;
  notmodified?: boolean;
}

/**
 * Process ONLYOFFICE callback
 * Returns true if the document should be saved
 */
export function shouldSaveDocument(status: CallbackStatus): boolean {
  // Status 2 = document is ready for saving
  // Status 6 = editing, but force save requested
  return status.status === 2 || status.status === 6;
}

/**
 * Download document from ONLYOFFICE callback URL
 */
export async function downloadDocument(url: string): Promise<Buffer> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download document: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Create a new empty document
 * Returns the document buffer for a blank document
 */
export function createBlankDocument(type: DocumentType): Buffer {
  // These are minimal valid OOXML documents
  const templates: Record<DocumentType, string> = {
    [DocumentType.TEXT]: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t></w:t></w:r></w:p>
  </w:body>
</w:document>`,
    [DocumentType.SPREADSHEET]: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData/>
</worksheet>`,
    [DocumentType.PRESENTATION]: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst/>
  <p:sldIdLst/>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
</p:presentation>`,
  };

  return Buffer.from(templates[type] || templates[DocumentType.TEXT], "utf-8");
}

/**
 * Generate a unique file key for version tracking
 * ONLYOFFICE requires a unique key that changes when the document is modified
 */
export function generateFileKey(documentId: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const hash = createHash("sha256")
    .update(`${documentId}-${time}`)
    .digest("hex")
    .substring(0, 16);
  
  return `${documentId}-${hash}`;
}

/**
 * Verify JWT token from ONLYOFFICE callback
 */
export function verifyCallbackToken(token: string): boolean {
  if (!ONLYOFFICE_JWT_SECRET) return false;

  try {
    jwt.verify(token, ONLYOFFICE_JWT_SECRET, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get ONLYOFFICE server health status
 */
export async function getServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ONLYOFFICE_SERVER_URL}/healthcheck`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Convert document using ONLYOFFICE Document Converter Service
 */
export async function convertDocument(
  fileUrl: string,
  fromFormat: string,
  toFormat: string,
  title: string
): Promise<{ fileUrl: string; percent: number }> {
  const conversionConfig = {
    async: false,
    url: fileUrl,
    outputtype: toFormat.replace(".", ""),
    filetype: fromFormat.replace(".", ""),
    title: title,
    key: generateFileKey(title),
  };

  const token = ONLYOFFICE_JWT_SECRET ? generateJWT(conversionConfig) : undefined;

  const response = await fetch(`${ONLYOFFICE_SERVER_URL}/ConvertService.ashx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(token ? { token } : conversionConfig),
  });

  if (!response.ok) {
    throw new Error(`Document conversion failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Conversion error: ${result.error}`);
  }

  return {
    fileUrl: result.fileUrl || result.url,
    percent: result.percent || 100,
  };
}

/**
 * Get document information from ONLYOFFICE
 */
export async function getDocumentInfo(key: string): Promise<any> {
  try {
    const config = { key };
    const token = ONLYOFFICE_JWT_SECRET ? generateJWT(config) : undefined;

    const response = await fetch(`${ONLYOFFICE_SERVER_URL}/coauthoring/CommandService.ashx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        c: "info",
        ...(token ? { token } : config),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get document info: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Get document info error:", error);
    throw error;
  }
}
