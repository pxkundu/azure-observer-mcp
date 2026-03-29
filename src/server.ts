import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AzureContext } from "./auth/credential.js";

import { SubscriptionService } from "./services/subscription.service.js";
import { ResourceService } from "./services/resource.service.js";
import { ComputeService } from "./services/compute.service.js";
import { StorageService } from "./services/storage.service.js";
import { IdentityService } from "./services/identity.service.js";
import { MonitorService } from "./services/monitor.service.js";
import { BillingService } from "./services/billing.service.js";
import { AdvisorService } from "./services/advisor.service.js";
import { SecurityScanService } from "./services/security-scan.service.js";
import { AppServiceDevService } from "./services/appservice-dev.service.js";
import { SqlDataService } from "./services/sql-data.service.js";
import { ApimService } from "./services/apim.service.js";
import { CosmosDataService } from "./services/cosmos-data.service.js";
import { KeyVaultMetaService } from "./services/keyvault-meta.service.js";
import { LifecycleReportService } from "./services/lifecycle-report.service.js";

import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerResourceGroupTools } from "./tools/resource-groups.js";
import { registerResourceTools } from "./tools/resources.js";
import { registerComputeTools } from "./tools/compute.js";
import { registerStorageTools } from "./tools/storage.js";
import { registerIdentityTools } from "./tools/identity.js";
import { registerMonitorTools } from "./tools/monitor.js";
import { registerDeploymentTools } from "./tools/deployments.js";
import { registerBillingTools } from "./tools/billing.js";
import { registerAdvisorTools } from "./tools/advisor.js";
import { registerSecurityScanTools } from "./tools/security-scan.js";
import { registerAppServiceDevTools } from "./tools/appservice-dev.js";
import { registerSqlDataTools } from "./tools/sql-data.js";
import { registerApimTools } from "./tools/apim.js";
import { registerCosmosDataTools } from "./tools/cosmos-data.js";
import { registerKeyVaultMetaTools } from "./tools/keyvault-meta.js";
import { registerLifecycleTools } from "./tools/lifecycle.js";

import { NetworkService } from "./services/network.service.js";
import { AksService } from "./services/aks.service.js";
import { AcrService } from "./services/acr.service.js";
import { LogAnalyticsService } from "./services/log-analytics.service.js";
import { DnsService } from "./services/dns.service.js";

import { registerNetworkTools } from "./tools/network.js";
import { registerAksTools } from "./tools/aks.js";
import { registerAcrTools } from "./tools/acr.js";
import { registerLogAnalyticsTools } from "./tools/log-analytics.js";
import { registerDnsTools } from "./tools/dns.js";

export function createServer(azureCtx: AzureContext): McpServer {
  const server = new McpServer({
    name: "azure-observer",
    version: "0.3.0",
  });

  const subscriptionService = new SubscriptionService(azureCtx);
  const resourceService = new ResourceService(azureCtx);
  const computeService = new ComputeService(azureCtx);
  const storageService = new StorageService(azureCtx);
  const identityService = new IdentityService(azureCtx);
  const monitorService = new MonitorService(azureCtx);
  const billingService = new BillingService(azureCtx);
  const advisorService = new AdvisorService(azureCtx);
  const securityScanService = new SecurityScanService(azureCtx);
  const appServiceDevService = new AppServiceDevService(azureCtx);
  const sqlDataService = new SqlDataService(azureCtx);
  const apimService = new ApimService(azureCtx);
  const cosmosDataService = new CosmosDataService(azureCtx);
  const keyVaultMetaService = new KeyVaultMetaService(azureCtx);
  const lifecycleReportService = new LifecycleReportService(azureCtx);

  registerSubscriptionTools(server, subscriptionService);
  registerResourceGroupTools(server, resourceService);
  registerResourceTools(server, resourceService);
  registerComputeTools(server, computeService);
  registerStorageTools(server, storageService);
  registerIdentityTools(server, identityService);
  registerMonitorTools(server, monitorService);
  registerDeploymentTools(server, resourceService);
  registerBillingTools(server, billingService);
  registerAdvisorTools(server, advisorService);
  registerSecurityScanTools(server, securityScanService);
  registerAppServiceDevTools(server, appServiceDevService);
  registerSqlDataTools(server, sqlDataService);
  registerApimTools(server, apimService);
  registerCosmosDataTools(server, cosmosDataService);
  registerKeyVaultMetaTools(server, keyVaultMetaService);
  registerLifecycleTools(server, lifecycleReportService);

  const networkService = new NetworkService(azureCtx);
  const aksService = new AksService(azureCtx);
  const acrService = new AcrService(azureCtx);
  const logAnalyticsService = new LogAnalyticsService(azureCtx);
  const dnsService = new DnsService(azureCtx);

  registerNetworkTools(server, networkService);
  registerAksTools(server, aksService);
  registerAcrTools(server, acrService);
  registerLogAnalyticsTools(server, logAnalyticsService);
  registerDnsTools(server, dnsService);

  azureCtx.logger.info("All Azure Observer MCP tools registered");

  return server;
}
