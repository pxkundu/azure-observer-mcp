export interface Config {
  azureSubscriptionId?: string;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  allowedSubscriptions: string[];
  dryRun: boolean;
  logLevel: string;
}

export function loadConfig(): Config {
  const allowed = process.env.AZURE_ALLOWED_SUBSCRIPTIONS;

  return {
    azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    azureTenantId: process.env.AZURE_TENANT_ID,
    azureClientId: process.env.AZURE_CLIENT_ID,
    azureClientSecret: process.env.AZURE_CLIENT_SECRET,
    allowedSubscriptions: allowed ? allowed.split(",").map((s) => s.trim()) : [],
    dryRun: process.env.AZURE_DRY_RUN === "true",
    logLevel: process.env.LOG_LEVEL || "info",
  };
}
