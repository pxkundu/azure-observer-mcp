import { OperationalInsightsManagementClient } from "@azure/arm-operationalinsights";
import { LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query-logs";
import type { LogsQueryPartialResult } from "@azure/monitor-query-logs";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class LogAnalyticsService {
  private getManagementClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new OperationalInsightsManagementClient(this.ctx.credential, subscriptionId);
  }

  private getQueryClient() {
    return new LogsQueryClient(this.ctx.credential);
  }

  constructor(private ctx: AzureContext) {}

  async listWorkspaces(subscriptionId: string, resourceGroupName?: string) {
    const client = this.getManagementClient(subscriptionId);
    const workspaces: Array<{
      id: string;
      name: string;
      location: string;
      resourceGroup: string;
      customerId: string;
      sku: string;
      retentionInDays: number;
      provisioningState: string;
    }> = [];

    const iter = resourceGroupName
      ? client.workspaces.listByResourceGroup(resourceGroupName)
      : client.workspaces.list();

    for await (const w of iter) {
      workspaces.push({
        id: w.id ?? "",
        name: w.name ?? "",
        location: w.location ?? "",
        resourceGroup: parseResourceGroupFromArmId(w.id) ?? "",
        customerId: w.customerId ?? "",
        sku: w.sku?.name ?? "",
        retentionInDays: w.retentionInDays ?? 0,
        provisioningState: w.provisioningState ?? "Unknown",
      });
    }
    return workspaces;
  }

  async queryWorkspace(
    workspaceId: string,
    kqlQuery: string,
    timeSpanIso8601: string,
  ) {
    const queryClient = this.getQueryClient();
    const result = await queryClient.queryWorkspace(workspaceId, kqlQuery, {
      duration: timeSpanIso8601,
    });

    if (result.status === LogsQueryResultStatus.PartialFailure) {
      const partial = result as LogsQueryPartialResult;
      return {
        status: result.status,
        error: partial.partialError?.message ?? "Partial failure",
        tables: (partial.partialTables ?? []).map((t) => ({
          name: t.name,
          columns: t.columnDescriptors.map((c) => c.name ?? ""),
          rows: t.rows?.slice(0, 200) ?? [],
          totalRows: t.rows?.length ?? 0,
        })),
      };
    }

    const tables = result.tables.map((t) => ({
      name: t.name,
      columns: t.columnDescriptors.map((c) => c.name ?? ""),
      rows: t.rows?.slice(0, 200) ?? [],
      totalRows: t.rows?.length ?? 0,
    }));

    return { status: result.status, tables };
  }
}
