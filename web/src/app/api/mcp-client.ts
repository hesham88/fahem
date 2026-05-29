import { spawn } from "child_process";
import readline from "readline";
import path from "path";
import fs from "fs";

function getPreloadPath(): string {
  const startDir = process.cwd();
  let current = startDir;
  while (true) {
    let potential = path.join(current, "dns-preload.js");
    if (fs.existsSync(potential)) return potential;
    potential = path.join(current, "web/dns-preload.js");
    if (fs.existsSync(potential)) return potential;
    
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  
  // Check relative to compiled chunks
  const dirPotential = path.join(__dirname, "../../../dns-preload.js");
  if (fs.existsSync(dirPotential)) return dirPotential;
  const dirPotential2 = path.join(__dirname, "dns-preload.js");
  if (fs.existsSync(dirPotential2)) return dirPotential2;
  
  return path.join(startDir, "dns-preload.js");
}

export class StdioMcpClient {
  private child: any;
  private rl: any;
  private pendingRequests = new Map<number | string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private nextId = 1;
  private initialized = false;

  constructor() {
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const preloadPath = getPreloadPath();
    const mongodbUri = process.env.MONGODB_URI || "mongodb://localhost:27017";

    this.child = spawn(cmd, ["-y", "@mongodb-js/mongodb-mcp-server"], {
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
      this.child.stdin.write(JSON.stringify(request) + "\n");
    });
  }

  private sendNotification(method: string, params?: any): void {
    const request = {
      jsonrpc: "2.0",
      method,
      params
    };
    this.child.stdin.write(JSON.stringify(request) + "\n");
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
