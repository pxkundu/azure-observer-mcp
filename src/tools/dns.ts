import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DnsService } from "../services/dns.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerDnsTools(
  server: McpServer,
  dnsService: DnsService,
) {
  server.tool(
    "azure/dns/zone/list",
    "List all Azure DNS zones in a subscription",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
    },
    async ({ subscriptionId }) => {
      try {
        const zones = await dnsService.listZones(subscriptionId);
        return toolResult({ count: zones.length, zones });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/dns/recordset/list",
    "List DNS record sets for a zone — optionally filtered by record type (A, AAAA, CNAME, MX, NS, TXT, SRV)",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      zoneName: z.string().describe("DNS zone name, e.g. contoso.com"),
      recordType: z.string().optional().describe("Filter by record type (A, CNAME, MX, etc.)"),
    },
    async ({ subscriptionId, resourceGroupName, zoneName, recordType }) => {
      try {
        const records = await dnsService.listRecordSets(
          subscriptionId,
          resourceGroupName,
          zoneName,
          recordType,
        );
        return toolResult({ count: records.length, recordSets: records });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
