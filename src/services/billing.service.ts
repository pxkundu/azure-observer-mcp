import {
  CostManagementClient,
  KnownExportType,
  KnownTimeframeType,
  KnownFunctionType,
  KnownQueryColumnType,
} from "@azure/arm-costmanagement";
import type { QueryResult } from "@azure/arm-costmanagement";
import type { AzureContext } from "../auth/credential.js";

export type BillingGroupBy = "ServiceName" | "ResourceGroupName" | "ResourceLocation";

function mapQueryResult(result: QueryResult) {
  const colNames = result.columns?.map((c) => c.name ?? "") ?? [];
  const rows =
    result.rows?.map((row) => {
      const obj: Record<string, unknown> = {};
      row.forEach((cell, i) => {
        obj[colNames[i] ?? `col${i}`] = cell;
      });
      return obj;
    }) ?? [];
  return { columns: colNames, rows };
}

export class BillingService {
  private client: CostManagementClient;

  constructor(private ctx: AzureContext) {
    this.client = new CostManagementClient(ctx.credential);
  }

  /**
   * Cost / usage report for a subscription (requires Cost Management permissions).
   */
  async costReport(
    subscriptionId: string,
    options: {
      groupBy: BillingGroupBy;
      timeframe: "MonthToDate" | "TheLastMonth" | "WeekToDate" | "Custom";
      from?: string;
      to?: string;
      maxRows?: number;
    },
  ) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);

    const scope = `/subscriptions/${subscriptionId}`;
    const maxRows = Math.min(options.maxRows ?? 25, 100);

    let timeframe: string = KnownTimeframeType.MonthToDate;
    let timePeriod: { from: Date; to: Date } | undefined;

    if (options.timeframe === "Custom") {
      if (!options.from || !options.to) {
        throw new Error("Custom timeframe requires 'from' and 'to' (ISO date strings).");
      }
      timeframe = KnownTimeframeType.Custom;
      timePeriod = { from: new Date(options.from), to: new Date(options.to) };
    } else if (options.timeframe === "TheLastMonth") {
      timeframe = KnownTimeframeType.TheLastMonth;
    } else if (options.timeframe === "WeekToDate") {
      timeframe = KnownTimeframeType.WeekToDate;
    } else {
      timeframe = KnownTimeframeType.MonthToDate;
    }

    const queryDefinition = {
      type: KnownExportType.ActualCost,
      timeframe,
      timePeriod,
      dataset: {
        aggregation: {
          totalCost: {
            name: "PreTaxCost",
            function: KnownFunctionType.Sum,
          },
        },
        grouping: [
          {
            type: KnownQueryColumnType.Dimension,
            name: options.groupBy,
          },
        ],
      },
    };

    const raw = await this.client.query.usage(scope, queryDefinition);
    const mapped = mapQueryResult(raw);

    return {
      scope,
      groupBy: options.groupBy,
      timeframe: options.timeframe,
      note: "Costs are in the billing currency for your subscription. Requires Cost Management Reader or equivalent.",
      rowCount: mapped.rows.length,
      rows: mapped.rows.slice(0, maxRows),
      truncated: mapped.rows.length > maxRows,
    };
  }
}
