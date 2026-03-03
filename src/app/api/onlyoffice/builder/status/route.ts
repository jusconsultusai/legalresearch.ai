// /api/onlyoffice/builder/status/route.ts
// Check the status of Document Builder backends

import { NextRequest, NextResponse } from "next/server";

interface BuilderStatus {
  docker: {
    available: boolean;
    message: string;
    url?: string;
  };
  htmlToDocx: {
    available: boolean;
    message: string;
  };
  python: {
    available: boolean;
    message: string;
  };
  recommended: "docker" | "htmlToDocx" | "python";
}

export async function GET(req: NextRequest) {
  const status: BuilderStatus = {
    docker: { available: false, message: "Checking..." },
    htmlToDocx: { available: true, message: "Available (no dependencies)" },
    python: { available: false, message: "Checking..." },
    recommended: "htmlToDocx",
  };

  // Check Docker Document Builder
  const builderUrl = process.env.ONLYOFFICE_BUILDER_URL || process.env.ONLYOFFICE_SERVER_URL || "http://localhost:8000";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${builderUrl}/healthcheck`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      if (text === "true" || text.trim() === "true") {
        status.docker = {
          available: true,
          message: "Docker Document Server is running",
          url: builderUrl,
        };
        status.recommended = "docker";
      } else {
        status.docker = {
          available: false,
          message: `Document Server returned unexpected response: ${text.slice(0, 50)}`,
        };
      }
    } else {
      status.docker = {
        available: false,
        message: `Document Server responded with ${res.status}`,
      };
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      status.docker = {
        available: false,
        message: "Connection timeout - Docker may not be running",
      };
    } else {
      status.docker = {
        available: false,
        message: `Connection failed: ${err.message || "Unknown error"}`,
      };
    }
  }

  // Check Python docbuilder
  try {
    const { spawn } = await import("child_process");
    const pythonBin = process.platform === "win32" ? "python" : "python3";
    
    const result = await new Promise<{ available: boolean; message: string }>((resolve) => {
      const child = spawn(pythonBin, ["-c", "import docbuilder; print('ok')"]);
      let stdout = "";
      let stderr = "";
      
      child.stdout.on("data", (d) => stdout += d.toString());
      child.stderr.on("data", (d) => stderr += d.toString());
      
      const timeout = setTimeout(() => {
        child.kill();
        resolve({ available: false, message: "Check timeout" });
      }, 5000);

      child.on("error", () => {
        clearTimeout(timeout);
        resolve({ available: false, message: "Python not found" });
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code === 0 && stdout.includes("ok")) {
          resolve({ available: true, message: "Python docbuilder package available" });
        } else {
          resolve({ 
            available: false, 
            message: stderr.includes("No module named") 
              ? "docbuilder package not installed (pip install docbuilder)"
              : `Python check failed: ${stderr.slice(0, 100) || "Unknown error"}`
          });
        }
      });
    });

    status.python = result;
    if (result.available && !status.docker.available) {
      status.recommended = "python";
    }
  } catch {
    status.python = { available: false, message: "Failed to check Python" };
  }

  return NextResponse.json(status);
}
