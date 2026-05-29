import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pythonScript = path.resolve(process.cwd(), "agents/get_metadata.py");
    
    // Execute python script to collect database statistics and metadata
    const { stdout, stderr } = await execAsync(`python "${pythonScript}"`, {
      cwd: process.cwd()
    });

    if (stderr && !stdout) {
      console.error("[db-metadata] Python script stderr:", stderr);
    }

    try {
      const metadata = JSON.parse(stdout.trim());
      return new Response(JSON.stringify(metadata), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (parseError: unknown) {
      const pErr = parseError as Error;
      console.error("[db-metadata] Failed to parse metadata json:", stdout, pErr);
      throw new Error(`Invalid JSON output from python agent: ${pErr.message}`);
    }

  } catch (err: unknown) {
    const e = err as Error;
    console.error("[db-metadata] Error fetching database metadata:", e);
    return new Response(JSON.stringify({ 
      databaseName: "fahem",
      collectionsCount: "...",
      collectionList: "...",
      storageSize: "...",
      indexCount: "...",
      status: `Disconnected (Error: ${e.message})` 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
