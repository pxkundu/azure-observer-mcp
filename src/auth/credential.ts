import { DefaultAzureCredential } from "@azure/identity";
import type { TokenCredential } from "@azure/identity";
import type { Config } from "../lib/config.js";
import type { Logger } from "../lib/logger.js";
import { SubscriptionNotAllowedError } from "../lib/errors.js";

export interface AzureContext {
  credential: TokenCredential;
  config: Config;
  logger: Logger;
  assertSubscriptionAllowed(subscriptionId: string): void;
}

export function createAzureContext(config: Config, logger: Logger): AzureContext {
  const credential = new DefaultAzureCredential();

  logger.info("Azure credential initialized (DefaultAzureCredential chain)");

  if (config.allowedSubscriptions.length > 0) {
    logger.info(
      { allowedSubscriptions: config.allowedSubscriptions },
      "Subscription allow-list active",
    );
  }

  if (config.dryRun) {
    logger.warn("DRY RUN mode enabled — mutating operations will not execute");
  }

  return {
    credential,
    config,
    logger,
    assertSubscriptionAllowed(subscriptionId: string) {
      if (
        config.allowedSubscriptions.length > 0 &&
        !config.allowedSubscriptions.includes(subscriptionId)
      ) {
        throw new SubscriptionNotAllowedError(subscriptionId);
      }
    },
  };
}
