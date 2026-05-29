import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Server } from "@mongodb-js/mongodb-mcp-server/dist/server.js";
import { Session } from "@mongodb-js/mongodb-mcp-server/dist/session.js";
import dns from "dns";

// Preload DNS settings to ensure MongoDB Atlas connection works seamlessly on Cloud Run
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  console.error("[DNS PRELOAD] Failed to configure custom DNS servers:", e);
}

export class StdioMcpClient {
  private session: Session;
  private mcpServer: McpServer;
  private server: Server;
  private initialized = false;

  constructor() {
    this.session = new Session();
    this.mcpServer = new McpServer({
      name: "MongoDB Atlas",
      version: "1.0.0"
    });
    this.server = new Server({
      mcpServer: this.mcpServer,
      session: this.session
    });
    this.server.registerTools();
  }

  async initialize(): Promise<any> {
    if (this.initialized) return;
    this.initialized = true;
  }

  async listTools(): Promise<any> {
    await this.initialize();
    
    // Convert in-memory registeredTools map to the format expected by Gemini listTools
    const toolsList = Object.entries((this.mcpServer as any)._registeredTools)
      .filter(([_, tool]: any) => tool.enabled)
      .map(([name, tool]: any) => {
        return {
          name,
          description: tool.description,
          inputSchema: tool.inputSchema
        };
      });

    return { tools: toolsList };
  }

  async callTool(name: string, args: any): Promise<any> {
    await this.initialize();
    
    const tool = (this.mcpServer as any)._registeredTools[name];
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // Standardize connection args: map connectionString to connectionStringOrClusterName for connect tool compatibility
    let finalArgs = args;
    if (name === "connect") {
      const connStr = args.connectionString || args.connectionStringOrClusterName;
      finalArgs = { connectionStringOrClusterName: connStr };
    }

    try {
      const result = await this.mcpServer.executeToolHandler(tool, finalArgs, {});
      return result;
    } catch (err: any) {
      console.error(`[In-Memory MCP Client] Error calling tool ${name}:`, err);
      throw err;
    }
  }

  close() {
    try {
      this.session.close();
      this.mcpServer.close();
    } catch (e) {
      // Ignore
    }
  }
}
