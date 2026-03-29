#!/usr/bin/env bash
#
# Azure Observer MCP — Tool Validation Script
#
# Sweeps all read-only tools against your live Azure subscription via
# JSON-RPC over stdio. Reports PASS / FAIL / SKIP for each tool.
#
# Prerequisites:
#   - Node.js >= 20
#   - Project built (npm run build)
#   - Authenticated via Azure CLI (az login) or env vars
#
# Usage:
#   chmod +x tests/validate-tools.sh
#   ./tests/validate-tools.sh                     # auto-detect subscription
#   ./tests/validate-tools.sh <subscription-id>   # specific subscription

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER="$PROJECT_DIR/dist/index.js"

PASS=0
FAIL=0
SKIP=0
RESULTS=()

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  Azure Observer MCP — Tool Validation${NC}"
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
  echo ""
}

check_prereqs() {
  echo -e "${BOLD}Checking prerequisites...${NC}"

  if ! command -v node &>/dev/null; then
    echo -e "  ${RED}✗ Node.js not found${NC}"
    exit 1
  fi
  echo -e "  ${GREEN}✓ Node.js $(node --version)${NC}"

  if [ ! -f "$SERVER" ]; then
    echo -e "  ${RED}✗ Server not built. Run: npm run build${NC}"
    exit 1
  fi
  echo -e "  ${GREEN}✓ Server built at dist/index.js${NC}"

  if command -v az &>/dev/null && az account show &>/dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Azure CLI authenticated${NC}"
  elif [ -n "${AZURE_CLIENT_ID:-}" ]; then
    echo -e "  ${GREEN}✓ Service principal env vars detected${NC}"
  else
    echo -e "  ${RED}✗ Not authenticated. Run 'az login' or set AZURE_CLIENT_ID/SECRET/TENANT${NC}"
    exit 1
  fi
  echo ""
}

# Send a JSON-RPC request to the MCP server and capture the response.
# The server communicates over stdio, so we send an initialize + the tool call
# and parse the response.
call_tool() {
  local tool_name="$1"
  local params="$2"
  local request_id=$((RANDOM % 10000 + 1))

  local init_msg='{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  local init_notif='{"jsonrpc":"2.0","method":"notifications/initialized"}'
  local call_msg="{\"jsonrpc\":\"2.0\",\"id\":${request_id},\"method\":\"tools/call\",\"params\":{\"name\":\"${tool_name}\",\"arguments\":${params}}}"

  local response
  response=$(printf '%s\n%s\n%s\n' "$init_msg" "$init_notif" "$call_msg" \
    | timeout 30 node "$SERVER" 2>/dev/null \
    | grep -o "{\"jsonrpc\":\"2.0\",\"id\":${request_id}.*" \
    | head -1) || true

  echo "$response"
}

record_result() {
  local test_id="$1"
  local tool="$2"
  local status="$3"
  local note="$4"

  case "$status" in
    PASS)
      echo -e "  ${GREEN}✓ ${test_id} ${tool}${NC} — ${note}"
      ((PASS++))
      ;;
    FAIL)
      echo -e "  ${RED}✗ ${test_id} ${tool}${NC} — ${note}"
      ((FAIL++))
      ;;
    SKIP)
      echo -e "  ${YELLOW}○ ${test_id} ${tool}${NC} — ${note}"
      ((SKIP++))
      ;;
  esac

  RESULTS+=("$test_id|$tool|$status|$note")
}

run_test() {
  local test_id="$1"
  local tool_name="$2"
  local params="$3"
  local expect_field="$4"

  local response
  response=$(call_tool "$tool_name" "$params")

  if [ -z "$response" ]; then
    record_result "$test_id" "$tool_name" "FAIL" "No response (timeout or crash)"
    return
  fi

  if echo "$response" | grep -q '"isError":true'; then
    local err_text
    err_text=$(echo "$response" | grep -o '"text":"[^"]*"' | head -1 | sed 's/"text":"//;s/"$//')

    if echo "$err_text" | grep -qi "403\|authorization\|forbidden\|not authorized"; then
      record_result "$test_id" "$tool_name" "SKIP" "Permission denied (expected — missing RBAC role)"
      return
    fi
    record_result "$test_id" "$tool_name" "FAIL" "Error: ${err_text:0:100}"
    return
  fi

  if [ -n "$expect_field" ] && echo "$response" | grep -q "$expect_field"; then
    record_result "$test_id" "$tool_name" "PASS" "Response contains expected field"
    return
  fi

  if echo "$response" | grep -q '"result"'; then
    record_result "$test_id" "$tool_name" "PASS" "Returned valid result"
    return
  fi

  record_result "$test_id" "$tool_name" "FAIL" "Unexpected response format"
}

print_summary() {
  echo ""
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  Summary${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
  echo ""
  local total=$((PASS + FAIL + SKIP))
  echo -e "  Total:   ${BOLD}${total}${NC} tools tested"
  echo -e "  ${GREEN}Passed:  ${PASS}${NC}"
  echo -e "  ${RED}Failed:  ${FAIL}${NC}"
  echo -e "  ${YELLOW}Skipped: ${SKIP}${NC} (missing RBAC — expected)"
  echo ""

  if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}All tools operational!${NC}"
  else
    echo -e "  ${RED}${BOLD}${FAIL} tool(s) need attention.${NC}"
    echo ""
    echo -e "  Failed tools:"
    for r in "${RESULTS[@]}"; do
      IFS='|' read -r tid tname tstatus tnote <<< "$r"
      if [ "$tstatus" = "FAIL" ]; then
        echo -e "    ${RED}✗ ${tid} ${tname}${NC}: ${tnote}"
      fi
    done
  fi
  echo ""
}

# ── Main ──

print_header
check_prereqs

SUB_ID="${1:-}"

if [ -z "$SUB_ID" ]; then
  echo -e "${BOLD}Detecting subscription ID...${NC}"
  SUB_RESPONSE=$(call_tool "azure/subscriptions/list" "{}")
  SUB_ID=$(echo "$SUB_RESPONSE" | grep -o '"subscriptionId":"[^"]*"' | head -1 | sed 's/"subscriptionId":"//;s/"//')

  if [ -z "$SUB_ID" ]; then
    echo -e "${RED}Could not detect subscription ID. Pass it as an argument.${NC}"
    exit 1
  fi
  echo -e "  Using subscription: ${GREEN}${SUB_ID}${NC}"
  echo ""
fi

# Discover a resource group for tools that need one
echo -e "${BOLD}Discovering a resource group...${NC}"
RG_RESPONSE=$(call_tool "azure/resource-groups/list" "{\"subscriptionId\":\"${SUB_ID}\"}")
RG_NAME=$(echo "$RG_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"//;s/"//')

if [ -n "$RG_NAME" ]; then
  echo -e "  Using resource group: ${GREEN}${RG_NAME}${NC}"
else
  echo -e "  ${YELLOW}No resource groups found — some tests will use a placeholder${NC}"
  RG_NAME="nonexistent-rg"
fi
echo ""

# ── Foundation ──
echo -e "${BOLD}Foundation tools${NC}"
run_test "TC-001" "azure/subscriptions/list" "{}" "subscriptionId"
run_test "TC-002" "azure/resource-groups/list" "{\"subscriptionId\":\"${SUB_ID}\"}" "name"
run_test "TC-005" "azure/resources/list" "{\"subscriptionId\":\"${SUB_ID}\",\"resourceGroupName\":\"${RG_NAME}\"}" ""
echo ""

# ── Identity & Monitoring ──
echo -e "${BOLD}Identity & Monitoring tools${NC}"
run_test "TC-015" "azure/identity/whoami" "{}" "authenticated"
run_test "TC-016" "azure/monitor/activity-log" "{\"subscriptionId\":\"${SUB_ID}\",\"daysBack\":1,\"maxEvents\":5}" ""
run_test "TC-017" "azure/deployments/list" "{\"subscriptionId\":\"${SUB_ID}\",\"resourceGroupName\":\"${RG_NAME}\"}" ""
echo ""

# ── Compute ──
echo -e "${BOLD}Compute tools${NC}"
run_test "TC-007" "azure/compute/vm/list" "{\"subscriptionId\":\"${SUB_ID}\",\"resourceGroupName\":\"${RG_NAME}\"}" ""
echo ""

# ── Storage ──
echo -e "${BOLD}Storage tools${NC}"
run_test "TC-012" "azure/storage/account/list" "{\"subscriptionId\":\"${SUB_ID}\",\"resourceGroupName\":\"${RG_NAME}\"}" ""
echo ""

# ── Billing & Optimization ──
echo -e "${BOLD}Billing & Optimization tools${NC}"
run_test "TC-019" "azure/billing/cost-report" "{\"subscriptionId\":\"${SUB_ID}\",\"maxRows\":5}" ""
run_test "TC-020" "azure/advisor/recommendations/list" "{\"subscriptionId\":\"${SUB_ID}\",\"maxItems\":5}" ""
echo ""

# ── Security ──
echo -e "${BOLD}Security tools${NC}"
run_test "TC-021" "azure/security/defender/alerts/list" "{\"subscriptionId\":\"${SUB_ID}\",\"maxItems\":5}" ""
run_test "TC-022" "azure/security/defender/assessments/list" "{\"subscriptionId\":\"${SUB_ID}\",\"maxItems\":5}" ""
echo ""

# ── App Service ──
echo -e "${BOLD}App Service tools${NC}"
run_test "TC-023" "azure/appservice/sites/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
run_test "TC-024" "azure/appservice/plans/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
echo ""

# ── Data ──
echo -e "${BOLD}Data tools${NC}"
run_test "TC-026" "azure/sql/servers/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
run_test "TC-028" "azure/cosmos/accounts/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
echo ""

# ── Integration ──
echo -e "${BOLD}Integration tools${NC}"
run_test "TC-029" "azure/apim/services/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
run_test "TC-030" "azure/keyvault/vaults/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
echo ""

# ── Networking ──
echo -e "${BOLD}Networking tools${NC}"
run_test "TC-031" "azure/network/vnet/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
run_test "TC-032" "azure/network/nsg/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
run_test "TC-034" "azure/network/publicip/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
echo ""

# ── Containers ──
echo -e "${BOLD}Container tools${NC}"
run_test "TC-035" "azure/containers/aks/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
run_test "TC-037" "azure/containers/acr/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
echo ""

# ── Observability ──
echo -e "${BOLD}Observability tools${NC}"
run_test "TC-039" "azure/logs/workspace/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
echo ""

# ── DNS ──
echo -e "${BOLD}DNS tools${NC}"
run_test "TC-041" "azure/dns/zone/list" "{\"subscriptionId\":\"${SUB_ID}\"}" ""
echo ""

# ── Composite ──
echo -e "${BOLD}Composite tools${NC}"
run_test "TC-043" "azure/lifecycle/devops-report" "{\"subscriptionId\":\"${SUB_ID}\",\"includeCost\":true,\"includeAdvisor\":true,\"includeSecurity\":true,\"advisorMax\":5,\"securityAlertsMax\":5,\"securityAssessmentsMax\":5}" ""
echo ""

print_summary
exit $FAIL
