import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SubscriptionService } from "../services/subscription.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerSubscriptionTools(
  server: McpServer,
  subscriptionService: SubscriptionService,
) {
  server.tool(
    "azure/subscriptions/list",
    "List all accessible Azure subscriptions (filtered by allow-list if configured)",
    {},
    async () => {
      try {
        const subs = await subscriptionService.list();
        return toolResult({ count: subs.length, subscriptions: subs });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
