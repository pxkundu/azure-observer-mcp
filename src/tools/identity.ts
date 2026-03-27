import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IdentityService } from "../services/identity.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerIdentityTools(
  server: McpServer,
  identityService: IdentityService,
) {
  server.tool(
    "azure/identity/whoami",
    "Show the currently authenticated Azure identity, permissions scope, and server configuration",
    {},
    async () => {
      try {
        const identity = await identityService.whoami();
        return toolResult(identity);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
