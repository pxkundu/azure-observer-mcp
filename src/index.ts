import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./lib/config.js";
import { createLogger } from "./lib/logger.js";
import { createAzureContext } from "./auth/credential.js";
import { createServer } from "./server.js";

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  logger.info({ dryRun: config.dryRun }, "Starting Azure Observer MCP Server");

  const azureCtx = createAzureContext(config, logger);
  const server = createServer(azureCtx);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("Azure Observer MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting Azure Observer MCP Server:", err);
  process.exit(1);
});
