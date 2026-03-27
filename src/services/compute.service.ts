import { ComputeManagementClient } from "@azure/arm-compute";
import type { AzureContext } from "../auth/credential.js";
import { DryRunError } from "../lib/errors.js";

export class ComputeService {
  private getClient(subscriptionId: string) {
    this.ctx.assertSubscriptionAllowed(subscriptionId);
    return new ComputeManagementClient(this.ctx.credential, subscriptionId);
  }

  constructor(private ctx: AzureContext) {}

  async listVMs(subscriptionId: string, resourceGroupName: string) {
    const client = this.getClient(subscriptionId);
    const vms: Array<{
      id: string;
      name: string;
      location: string;
      vmSize: string;
      provisioningState: string;
      osType: string;
    }> = [];

    for await (const vm of client.virtualMachines.list(resourceGroupName)) {
      vms.push({
        id: vm.id ?? "",
        name: vm.name ?? "",
        location: vm.location ?? "",
        vmSize: vm.hardwareProfile?.vmSize ?? "",
        provisioningState: vm.provisioningState ?? "Unknown",
        osType: vm.storageProfile?.osDisk?.osType ?? "Unknown",
      });
    }

    return vms;
  }

  async getVM(subscriptionId: string, resourceGroupName: string, vmName: string) {
    const client = this.getClient(subscriptionId);
    const vm = await client.virtualMachines.get(resourceGroupName, vmName, {
      expand: "instanceView",
    });

    const statuses = vm.instanceView?.statuses ?? [];
    const powerState = statuses.find((s) => s.code?.startsWith("PowerState/"))?.displayStatus ?? "Unknown";

    return {
      id: vm.id ?? "",
      name: vm.name ?? "",
      location: vm.location ?? "",
      vmSize: vm.hardwareProfile?.vmSize ?? "",
      provisioningState: vm.provisioningState ?? "Unknown",
      powerState,
      osType: vm.storageProfile?.osDisk?.osType ?? "Unknown",
      adminUsername: vm.osProfile?.adminUsername ?? "",
      computerName: vm.osProfile?.computerName ?? "",
      tags: (vm.tags as Record<string, string>) ?? {},
    };
  }

  async startVM(subscriptionId: string, resourceGroupName: string, vmName: string) {
    if (this.ctx.config.dryRun) {
      throw new DryRunError("startVM", { subscriptionId, resourceGroupName, vmName });
    }
    const client = this.getClient(subscriptionId);
    await client.virtualMachines.beginStartAndWait(resourceGroupName, vmName);
    return { started: true, vmName };
  }

  async stopVM(subscriptionId: string, resourceGroupName: string, vmName: string) {
    if (this.ctx.config.dryRun) {
      throw new DryRunError("stopVM", { subscriptionId, resourceGroupName, vmName });
    }
    const client = this.getClient(subscriptionId);
    await client.virtualMachines.beginDeallocateAndWait(resourceGroupName, vmName);
    return { stopped: true, vmName };
  }

  async deleteVM(subscriptionId: string, resourceGroupName: string, vmName: string) {
    if (this.ctx.config.dryRun) {
      throw new DryRunError("deleteVM", { subscriptionId, resourceGroupName, vmName });
    }
    const client = this.getClient(subscriptionId);
    await client.virtualMachines.beginDeleteAndWait(resourceGroupName, vmName);
    return { deleted: true, vmName };
  }
}
