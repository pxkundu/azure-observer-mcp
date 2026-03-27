import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ComputeService } from "../services/compute.service.js";
import { toolResult, toolError } from "../lib/errors.js";

export function registerComputeTools(
  server: McpServer,
  computeService: ComputeService,
) {
  server.tool(
    "azure/compute/vm/list",
    "List all virtual machines in a resource group",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
    },
    async ({ subscriptionId, resourceGroupName }) => {
      try {
        const vms = await computeService.listVMs(subscriptionId, resourceGroupName);
        return toolResult({ count: vms.length, virtualMachines: vms });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/compute/vm/get",
    "Get detailed information and power state of a virtual machine",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      vmName: z.string().describe("Virtual machine name"),
    },
    async ({ subscriptionId, resourceGroupName, vmName }) => {
      try {
        const vm = await computeService.getVM(subscriptionId, resourceGroupName, vmName);
        return toolResult(vm);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/compute/vm/start",
    "Start a stopped/deallocated virtual machine",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      vmName: z.string().describe("Virtual machine name"),
    },
    async ({ subscriptionId, resourceGroupName, vmName }) => {
      try {
        const result = await computeService.startVM(subscriptionId, resourceGroupName, vmName);
        return toolResult(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/compute/vm/stop",
    "Stop and deallocate a running virtual machine (stops billing for compute)",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      vmName: z.string().describe("Virtual machine name"),
    },
    async ({ subscriptionId, resourceGroupName, vmName }) => {
      try {
        const result = await computeService.stopVM(subscriptionId, resourceGroupName, vmName);
        return toolResult(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "azure/compute/vm/delete",
    "Permanently delete a virtual machine (destructive, irreversible)",
    {
      subscriptionId: z.string().describe("Azure subscription ID"),
      resourceGroupName: z.string().describe("Resource group name"),
      vmName: z.string().describe("Virtual machine name to delete"),
    },
    async ({ subscriptionId, resourceGroupName, vmName }) => {
      try {
        const result = await computeService.deleteVM(subscriptionId, resourceGroupName, vmName);
        return toolResult({
          ...result,
          warning: "Virtual machine has been permanently deleted.",
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
