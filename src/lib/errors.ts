import { RestError } from "@azure/core-rest-pipeline";

export class AzureObserverError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AzureObserverError";
  }
}

export class SubscriptionNotAllowedError extends AzureObserverError {
  constructor(subscriptionId: string) {
    super(
      `Subscription "${subscriptionId}" is not in the allowed list`,
      "SUBSCRIPTION_NOT_ALLOWED",
      403,
    );
    this.name = "SubscriptionNotAllowedError";
  }
}

export class DryRunError extends AzureObserverError {
  constructor(
    public readonly operation: string,
    public readonly params: Record<string, unknown>,
  ) {
    super(
      `[DRY RUN] Would execute: ${operation}`,
      "DRY_RUN",
    );
    this.name = "DryRunError";
  }
}

export function formatToolError(err: unknown): string {
  if (err instanceof DryRunError) {
    return `DRY RUN — ${err.operation}\nParameters: ${JSON.stringify(err.params, null, 2)}\n\nNo changes were made. Set AZURE_DRY_RUN=false to execute.`;
  }

  if (err instanceof AzureObserverError) {
    return `Error [${err.code}]: ${err.message}`;
  }

  if (err instanceof RestError) {
    return `Azure API Error [${err.code ?? err.statusCode}]: ${err.message}`;
  }

  if (err instanceof Error) {
    return `Error: ${err.message}`;
  }

  return `Unknown error: ${String(err)}`;
}

export function toolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function toolError(err: unknown) {
  return {
    content: [{ type: "text" as const, text: formatToolError(err) }],
    isError: true,
  };
}
