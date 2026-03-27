import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AzureContext } from "./auth/credential.js";

import { SubscriptionService } from "./services/subscription.service.js";
import { ResourceService } from "./services/resource.service.js";
import { ComputeService } from "./services/compute.service.js";
import { StorageService } from "./services/storage.service.js";
import { IdentityService } from "./services/identity.service.js";
import { MonitorService } from "./services/monitor.service.js";

import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerResourceGroupTools } from "./tools/resource-groups.js";
import { registerResourceTools } from "./tools/resources.js";
import { registerComputeTools } from "./tools/compute.js";
import { registerStorageTools } from "./tools/storage.js";
import { registerIdentityTools } from "./tools/identity.js";
import { registerMonitorTools } from "./tools/monitor.js";
import { registerDeploymentTools } from "./tools/deployments.js";

export function createServer(azureCtx: AzureContext): McpServer {
  const server = new McpServer({
    name: "azure-observer",
    version: "0.1.0",
  });

  const subscriptionService = new SubscriptionService(azureCtx);
  const resourceService = new ResourceService(azureCtx);
  const computeService = new ComputeService(azureCtx);
  const storageService = new StorageService(azureCtx);
  const identityService = new IdentityService(azureCtx);
  const monitorService = new MonitorService(azureCtx);

  registerSubscriptionTools(server, subscriptionService);
  registerResourceGroupTools(server, resourceService);
  registerResourceTools(server, resourceService);
  registerComputeTools(server, computeService);
  registerStorageTools(server, storageService);
  registerIdentityTools(server, identityService);
  registerMonitorTools(server, monitorService);
  registerDeploymentTools(server, resourceService);

  azureCtx.logger.info("All Azure Observer MCP tools registered");

  return server;
}
