import { DnsManagementClient } from "@azure/arm-dns";
import type { AzureContext } from "../auth/credential.js";
import { parseResourceGroupFromArmId } from "../lib/arm-parse.js";

export class DnsService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new DnsManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listZones(subscriptionId: string) {
    const client = this.getClient(subscriptionId);
    const zones: Array<{
      id: string;
      name: string;
      location: string;
      resourceGroup: string;
      numberOfRecordSets: number;
      nameServers: string[];
    }> = [];

    for await (const z of client.zones.list()) {
      zones.push({
        id: z.id ?? "",
        name: z.name ?? "",
        location: z.location ?? "",
        resourceGroup: parseResourceGroupFromArmId(z.id) ?? "",
        numberOfRecordSets: z.numberOfRecordSets ?? 0,
        nameServers: z.nameServers ?? [],
      });
    }
    return zones;
  }

  async listRecordSets(
    subscriptionId: string,
    resourceGroupName: string,
    zoneName: string,
    recordType?: string,
  ) {
    const client = this.getClient(subscriptionId);
    const records: Array<{
      id: string;
      name: string;
      type: string;
      ttl: number;
      fqdn: string;
      records: string[];
    }> = [];

    for await (const rs of client.recordSets.listByDnsZone(resourceGroupName, zoneName)) {
      const rsType = (rs.type ?? "").split("/").pop() ?? "";

      if (recordType && rsType.toLowerCase() !== recordType.toLowerCase()) continue;

      const recs = extractRecordValues(rs, rsType);
      records.push({
        id: rs.id ?? "",
        name: rs.name ?? "",
        type: rsType,
        ttl: rs.ttl ?? 0,
        fqdn: rs.fqdn ?? "",
        records: recs,
      });
    }
    return records;
  }
}

function extractRecordValues(rs: any, rsType: string): string[] {
  switch (rsType.toUpperCase()) {
    case "A":
      return (rs.aRecords ?? []).map((r: any) => r.ipv4Address ?? "");
    case "AAAA":
      return (rs.aaaaRecords ?? []).map((r: any) => r.ipv6Address ?? "");
    case "CNAME":
      return rs.cnameRecord?.cname ? [rs.cnameRecord.cname] : [];
    case "MX":
      return (rs.mxRecords ?? []).map((r: any) => `${r.preference} ${r.exchange}`);
    case "NS":
      return (rs.nsRecords ?? []).map((r: any) => r.nsdname ?? "");
    case "TXT":
      return (rs.txtRecords ?? []).map((r: any) => (r.value ?? []).join(""));
    case "SRV":
      return (rs.srvRecords ?? []).map(
        (r: any) => `${r.priority} ${r.weight} ${r.port} ${r.target}`,
      );
    default:
      return [];
  }
}
