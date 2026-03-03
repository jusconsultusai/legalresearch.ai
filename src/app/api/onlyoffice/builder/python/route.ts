// /api/onlyoffice/builder/python/route.ts
// Runs an ONLYOFFICE Document Builder Python script server-side
// Uses the `docbuilder` Python package (pip install docbuilder)
// Docs: https://api.onlyoffice.com/docs/document-builder/builder-framework/Python/

import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { getCurrentUser } from "@/lib/auth";

const CONTENT_TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf:  "application/pdf",
};

function runPython(scriptPath: string, timeoutMs = 60_000): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    // Try common Python executables in preference order
    const pythonBin = process.platform === "win32"
      ? ["python", "python3", "py"]
      : ["python3", "python"];

    let tried = 0;

    function attempt(bin: string) {
      const child = spawn(bin, [scriptPath], { timeout: timeoutMs });
      const stdout: string[] = [];
      const stderr: string[] = [];

      child.stdout.on("data", (d) => stdout.push(d.toString()));
      child.stderr.on("data", (d) => stderr.push(d.toString()));

      child.on("error", () => {
        tried++;
        const next = pythonBin[tried];
        if (next) {
          attempt(next);
        } else {
          resolve({ stdout: "", stderr: "Python executable not found. Install Python and the docbuilder package.", code: 1 });
        }
      });

      child.on("close", (code) => {
        resolve({ stdout: stdout.join(""), stderr: stderr.join(""), code: code ?? 1 });
      });
    }

    attempt(pythonBin[0]);
  });
}

export async function POST(req: NextRequest) {
  // SECURITY: Require authentication — this endpoint executes Python code
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      script,
      outputType = "docx",
      filename = "generated",
    } = body as {
      script: string;
      outputType?: string;
      filename?: string;
    };

    if (!script?.trim()) {
      return NextResponse.json({ error: "script is required" }, { status: 400 });
    }

    const id = randomUUID();
    const tmpDir = path.join(process.cwd(), "public", "temp", "pybuilder");
    const scriptPath = path.join(tmpDir, `${id}.py`);
    const outPath = path.join(tmpDir, `${id}.${outputType}`);

    await mkdir(tmpDir, { recursive: true });

    // Inject the output path so the script always saves to a known location
    // We replace any SaveFile call's second argument (the path) with our controlled path.
    // If the user's script already calls SaveFile with a path, we wrap it.
    const patchedScript = `
import os, sys
_ONLYOFFICE_OUT = ${JSON.stringify(outPath)}

# Monkey-patch so SaveFile always writes to our controlled path
_orig_builder_module = None
try:
    import docbuilder as _db_mod
    _OrigCDocBuilder = _db_mod.CDocBuilder
    class _PatchedCDocBuilder(_OrigCDocBuilder):
        def SaveFile(self, format, path=None, params=None):
            # Always redirect to our output path
            if params is not None:
                return super().SaveFile(format, _ONLYOFFICE_OUT, params)
            return super().SaveFile(format, _ONLYOFFICE_OUT)
    _db_mod.CDocBuilder = _PatchedCDocBuilder
except Exception:
    pass  # docbuilder not installed; will fail below with informative error

${script}
`;

    await writeFile(scriptPath, patchedScript, "utf-8");

    const { stdout, stderr, code } = await runPython(scriptPath, 60_000);

    // Clean up script
    unlink(scriptPath).catch(() => {});

    if (code !== 0 || !existsSync(outPath)) {
      const errText = stderr || stdout || "Script exited with no output";
      return NextResponse.json(
        { error: "Python script failed", details: errText },
        { status: 500 }
      );
    }

    const fileBuffer = await readFile(outPath);
    unlink(outPath).catch(() => {});

    const safeFilename = (filename || "generated").replace(/[^a-zA-Z0-9._-]/g, "_");
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[outputType] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFilename}.${outputType}"`,
        "X-Generator": "python-docbuilder",
        "X-Stdout": Buffer.from(stdout.slice(0, 500)).toString("base64"),
      },
    });
  } catch (err: any) {
    console.error("[Python Builder]", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
