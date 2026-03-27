import { MonitorClient } from "@azure/arm-monitor";
import type { AzureContext } from "../auth/credential.js";

export class MonitorService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new MonitorClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async getActivityLog(
    subscriptionId: string,
    options: {
      resourceGroupName?: string;
      daysBack?: number;
      maxEvents?: number;
    } = {},
  ) {
    const client = this.getClient(subscriptionId);
    const daysBack = options.daysBack ?? 1;
    const maxEvents = options.maxEvents ?? 50;

    const startTime = new Date();
    startTime.setDate(startTime.getDate() - daysBack);

    let filter = `eventTimestamp ge '${startTime.toISOString()}'`;
    if (options.resourceGroupName) {
      filter += ` and resourceGroupName eq '${options.resourceGroupName}'`;
    }

    const events: Array<{
      eventTimestamp: string;
      operationName: string;
      status: string;
      caller: string;
      resourceId: string;
      level: string;
    }> = [];

    let count = 0;
    for await (const event of client.activityLogs.list(filter)) {
      if (count >= maxEvents) break;
      events.push({
        eventTimestamp: event.eventTimestamp?.toISOString() ?? "",
        operationName: event.operationName?.localizedValue ?? event.operationName?.value ?? "",
        status: event.status?.localizedValue ?? event.status?.value ?? "",
        caller: event.caller ?? "",
        resourceId: event.resourceId ?? "",
        level: event.level ?? "",
      });
      count++;
    }

    return events;
  }
}
