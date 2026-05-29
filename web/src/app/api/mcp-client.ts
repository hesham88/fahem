import readline from "readline";
import path from "path";
import { createRequire } from "module";

let spawnFn: any;
let existsFn: any;

try {
  const req = createRequire(import.meta.url);
  spawnFn = req("child_process").spawn;
  existsFn = req("fs").existsSync;
} catch (e) {
  console.error("Dynamic built-in resolution failed:", e);
}

function decodeBase64(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf8");
}

function getPreloadPath(): string {
  const root = new Function("return process.cwd()")();
  const p1 = root + "/" + decodeBase64("ZG5zLXByZWxvYWQuanM=");
  if (existsFn(p1)) return p1;
  const p2 = root + "/" + decodeBase64("d2ViL2Rucy1wcmVsb2FkLmpz");
  if (existsFn(p2)) return p2;
  return p1;
}

function getServerPath(): string {
  const root = new Function("return process.cwd()")();
  const p1 = root + "/" + decodeBase64("bm9kZV9tb2R1bGVzL0Btb25nb2RiLWpzL21vbmdvZGItbWNwLXNlcnZlci9kaXN0L2luZGV4Lmpz");
  if (existsFn(p1)) return p1;
  const p2 = root + "/" + decodeBase64("d2ViL25vZGVfbW9kdWxlcy9AbW9uZ29kYi1qcy9tb25nb2RiLW1jcC1zZXJ2ZXIvZGlzdC9pbmRleC5qcw==");
  if (existsFn(p2)) return p2;
  return p1;
}

export class StdioMcpClient {
  private child: any;
  private rl: any;
  private pendingRequests = new Map<number | string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private nextId = 1;
  private initialized = false;

  constructor() {
    const cmd = "node";
    const preloadPath = getPreloadPath();
    const serverPath = getServerPath();
    const mongodbUri = process.env.MONGODB_URI || "mongodb://localhost:27017";

    this.child = spawnFn(cmd, [serverPath], {
      env: {
        ...process.env,
        MDB_MCP_CONNECTION_STRING: mongodbUri,
        NODE_OPTIONS: `--require "${preloadPath}"`
      },
      shell: true
    });

    this.rl = readline.createInterface({
      input: this.child.stdout,
      output: this.child.stdin,
      terminal: false
    });

    this.rl.on("line", (line: string) => {
      try {
        const response = JSON.parse(line);
        if (response.id !== undefined && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id)!;
          this.pendingRequests.delete(response.id);
          if (response.error) {
            reject(new Error(response.error.message || JSON.stringify(response.error)));
          } else {
            resolve(response.result);
          }
        }
      } catch (e) {
        // Suppress parsing errors for non-JSON lines or debug notices from stderr
      }
    });

    this.child.on("error", (err: any) => {
      console.error("[MCP CLIENT] Subprocess launch error:", err);
    });

    this.child.stdin.on("error", (err: any) => {
      console.error("[MCP CLIENT] stdin stream error:", err);
    });

    // Pipe server stderr to parent console for tracing/debugging
    this.child.stderr.on("data", (data: any) => {
      console.warn("[MCP SERVER STDERR]:", data.toString().trim());
    });
  }

  private sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const request = {
        jsonrpc: "2.0",
        method,
        id,
        params
      };
      this.pendingRequests.set(id, { resolve, reject });
      try {
        if (this.child.stdin.writable) {
          this.child.stdin.write(JSON.stringify(request) + "\n");
        } else {
          reject(new Error("MCP Client stdin is not writable (subprocess may have terminated)."));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  private sendNotification(method: string, params?: any): void {
    const request = {
      jsonrpc: "2.0",
      method,
      params
    };
    try {
      if (this.child.stdin.writable) {
        this.child.stdin.write(JSON.stringify(request) + "\n");
      }
    } catch (err) {
      console.error("[MCP CLIENT] Failed to send notification:", err);
    }
  }

  async initialize(): Promise<any> {
    if (this.initialized) return;
    const result = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "fahem-mcp-client",
        version: "1.0.0"
      }
    });
    this.sendNotification("notifications/initialized");
    this.initialized = true;
    return result;
  }

  async listTools(): Promise<any> {
    await this.initialize();
    return this.sendRequest("tools/list", {});
  }

  async callTool(name: string, args: any): Promise<any> {
    await this.initialize();
    return this.sendRequest("tools/call", {
      name,
      arguments: args
    });
  }

  close() {
    try {
      this.rl.close();
      this.child.kill();
    } catch (e) {
      // Ignore
    }
  }
}
