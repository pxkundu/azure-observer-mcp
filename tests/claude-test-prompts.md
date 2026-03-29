# Claude CLI Test Prompts

Copy-paste these prompts into Claude CLI or Claude Code to validate the Azure Observer MCP tools.
Replace `$SUB` with your actual subscription ID and `$RG` with a resource group name.

---

## Quick Smoke Test

```
Use the azure/identity/whoami tool to show my Azure identity.
Then use azure/subscriptions/list to list my subscriptions.
Report whether both tools are working.
```

---

## Full Read-Only Tool Sweep

```
I want to systematically test all read-only Azure Observer MCP tools.
For my first Azure subscription, run each tool below with minimal parameters.
For each tool, report the result as a single row: Tool Name | Status (OK / EMPTY / ERROR) | Brief note.

Foundation:
1. azure/subscriptions/list
2. azure/resource-groups/list (use the subscription ID from step 1)
3. azure/resources/list (use first resource group from step 2)

Identity & Monitoring:
4. azure/identity/whoami
5. azure/monitor/activity-log (1 day back, max 5 events)
6. azure/deployments/list (use first resource group)

Compute & Storage:
7. azure/compute/vm/list (use first resource group)
8. azure/storage/account/list (use first resource group)

Billing & Security:
9. azure/billing/cost-report (month-to-date, max 5 rows)
10. azure/advisor/recommendations/list (max 5)
11. azure/security/defender/alerts/list (max 5)
12. azure/security/defender/assessments/list (max 5)

App Platform:
13. azure/appservice/sites/list
14. azure/appservice/plans/list
15. azure/sql/servers/list
16. azure/cosmos/accounts/list
17. azure/apim/services/list
18. azure/keyvault/vaults/list

Networking:
19. azure/network/vnet/list
20. azure/network/nsg/list
21. azure/network/publicip/list

Containers:
22. azure/containers/aks/list
23. azure/containers/acr/list

Observability:
24. azure/logs/workspace/list

DNS:
25. azure/dns/zone/list

Composite:
26. azure/lifecycle/devops-report (with advisorMax=5, securityAlertsMax=5, securityAssessmentsMax=5)

After running all tools, give me a summary table and overall health status.
Mark EMPTY results as OK if the subscription simply has no resources of that type.
Mark permission errors (403) as SKIP with a note about what RBAC role is needed.
```

---

## Detail Tests — Use When Resources Exist

### Test resource drill-down (needs a specific resource group with resources)

```
For subscription $SUB and resource group $RG:
1. List all resources in the resource group
2. Pick the first resource and get its details using azure/resources/get
3. Tell me what type of resource it is and its provisioning state
```

### Test VM tools (needs a VM)

```
For subscription $SUB and resource group $RG:
1. List VMs using azure/compute/vm/list
2. If any VM exists, get its details with azure/compute/vm/get
3. Report the VM's power state, OS type, and size
```

### Test NSG rules (needs an NSG)

```
For subscription $SUB:
1. List all NSGs using azure/network/nsg/list
2. If any NSG exists, get its rules with azure/network/nsg/rules
3. Check if any rule allows inbound traffic from source "*" (internet) and flag it
```

### Test AKS detail (needs an AKS cluster)

```
For subscription $SUB:
1. List AKS clusters using azure/containers/aks/list
2. If any cluster exists, get its details with azure/containers/aks/get
3. Report: Kubernetes version, node pool count, autoscaling status, network plugin
```

### Test ACR detail (needs a container registry)

```
For subscription $SUB:
1. List container registries using azure/containers/acr/list
2. If any ACR exists, get its details with azure/containers/acr/get
3. Report: SKU tier, admin user enabled, encryption status, public network access
```

### Test KQL query (needs a Log Analytics workspace)

```
For subscription $SUB:
1. List Log Analytics workspaces using azure/logs/workspace/list
2. If a workspace exists, note its customerId (workspace GUID)
3. Run this KQL query using azure/logs/query with timeSpan P1D:
   AzureActivity | summarize count() by Level | top 5 by count_
4. Report the query results
```

### Test DNS records (needs a DNS zone)

```
For subscription $SUB:
1. List DNS zones using azure/dns/zone/list
2. If a zone exists, list its record sets using azure/dns/recordset/list
3. Separately filter for A records and CNAME records
4. Report what you find
```

### Test App Service detail (needs a web app)

```
For subscription $SUB:
1. List App Service sites using azure/appservice/sites/list
2. If any site exists, get its details with azure/appservice/site/get
3. Report: default hostname, HTTPS-only status, state
```

### Test SQL databases (needs a SQL server)

```
For subscription $SUB:
1. List SQL servers using azure/sql/servers/list
2. If any server exists, list its databases with azure/sql/databases/list
3. Report server FQDN and database names
```

---

## Mutation Safety Tests (requires AZURE_DRY_RUN=true)

### Test resource group create/delete dry-run

```
I have AZURE_DRY_RUN=true set on my Azure Observer MCP server.

1. Try to create a resource group called 'mcp-dryrun-test-rg' in eastus for subscription $SUB
2. Confirm the response says "DRY RUN"
3. Try to delete the same resource group
4. Confirm the response says "DRY RUN"
5. Now list resource groups and confirm 'mcp-dryrun-test-rg' does NOT exist
```

### Test storage account create dry-run

```
I have AZURE_DRY_RUN=true set.

1. Try to create a storage account called 'mcpdryruntest2026' in eastus in resource group $RG
2. Confirm the response says "DRY RUN"
3. List storage accounts in $RG and confirm 'mcpdryruntest2026' does NOT exist
```

### Test VM mutation dry-run (needs a VM)

```
I have AZURE_DRY_RUN=true set.

1. List VMs in $RG
2. If a VM exists, try to stop it
3. Confirm the response says "DRY RUN"
4. Get the VM details and confirm it is still in its original power state
```

---

## End-to-End Workflow Tests

### Workflow Test 1: Environment Discovery

```
Perform a full Azure environment discovery:
1. List all subscriptions
2. For the first subscription, list all resource groups
3. For the first 3 resource groups, list all resources
4. Give me a summary: how many subscriptions, resource groups, and total resources
```

### Workflow Test 2: Network Security Audit

```
For subscription $SUB, perform a network security audit:
1. List all VNets and their subnets
2. List all NSGs
3. For each NSG, get the security rules
4. List all public IPs
5. Produce a security report:
   - Flag NSG rules that allow inbound from "*" to sensitive ports (22, 3389, 1433, 3306)
   - Flag unattached public IPs
   - Summarize the network topology
```

### Workflow Test 3: Container Platform Review

```
For subscription $SUB, review the container platform:
1. List AKS clusters
2. For each cluster, get details (K8s version, node pools, autoscaling)
3. List container registries
4. List Log Analytics workspaces
5. If a workspace exists, query for pod restart counts:
   KubePodInventory | summarize restarts=sum(PodRestartCount) by Name | where restarts > 0 | top 10 by restarts
6. Produce a container platform health report
```

### Workflow Test 4: Full DevOps Snapshot

```
For subscription $SUB, generate a comprehensive DevOps snapshot:
1. Run the lifecycle DevOps report
2. List all App Service sites
3. List all SQL servers
4. List all Key Vaults
5. Combine all findings into a single report with:
   - Cost trends
   - Security priorities
   - Infrastructure inventory
   - Recommended next actions
```

### Workflow Test 5: Subscription Guardrail Test

```
Test the subscription allow-list feature:
1. Show my identity with azure/identity/whoami
2. List subscriptions
3. Try to list resource groups using a fake subscription ID "00000000-0000-0000-0000-000000000000"
4. Confirm the request is either rejected by the allow-list or returns an Azure error
```

---

## Expected Error Behaviors

These tests validate that the MCP server handles errors gracefully.

### Invalid subscription ID

```
Try to list resource groups for subscription ID "not-a-valid-uuid".
The tool should return a clear error, not crash.
```

### Missing required parameters

```
Try calling azure/resource-groups/list without providing a subscriptionId.
The tool should return a validation error from Zod.
```

### Nonexistent resource group

```
Try to list resources in a resource group called "this-rg-definitely-does-not-exist-12345" in subscription $SUB.
The tool should return a clear Azure error (404 or similar), not crash.
```

### Nonexistent resource

```
Try to get VM details for a VM called "nonexistent-vm-xyz" in resource group "nonexistent-rg" in subscription $SUB.
The tool should return a clear error.
```
