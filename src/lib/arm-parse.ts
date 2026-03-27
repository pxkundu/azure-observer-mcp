/** Extract resource group name from an ARM resource ID. */
export function parseResourceGroupFromArmId(id?: string): string | undefined {
  if (!id) return undefined;
  const m = id.match(/\/resourceGroups\/([^/]+)\//i);
  return m?.[1];
}
