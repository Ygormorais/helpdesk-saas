#!/usr/bin/env bash
set -euo pipefail

repo="${1:-}"
branch="${2:-master}"
required_checks="${3:-build}"
required_approvals="${4:-1}"
require_code_owner_reviews="${5:-true}"
require_conversation_resolution="${6:-true}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[error] GitHub CLI (gh) nao encontrado. Instale: https://cli.github.com/"
  exit 2
fi

if [ -z "$repo" ]; then
  origin="$(git remote get-url origin)"
  if [[ "$origin" =~ github\.com[:/]([^/]+/[^/.]+)(\.git)?$ ]]; then
    repo="${BASH_REMATCH[1]}"
  else
    echo "[error] Nao foi possivel detectar owner/repo a partir do origin: $origin"
    exit 2
  fi
fi

IFS=',' read -r -a raw_checks <<< "$required_checks"
checks=()
for check in "${raw_checks[@]}"; do
  trimmed="$(echo "$check" | xargs)"
  if [ -n "$trimmed" ]; then
    checks+=("$trimmed")
  fi
done

if [ "${#checks[@]}" -eq 0 ]; then
  echo "[error] Informe ao menos um required check."
  exit 2
fi

contexts_json="["
for check in "${checks[@]}"; do
  contexts_json="${contexts_json}\"${check}\","
done
contexts_json="${contexts_json%,}]"

tmp="$(mktemp)"
cat >"$tmp" <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": $contexts_json
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": $require_code_owner_reviews,
    "required_approving_review_count": $required_approvals
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": $require_conversation_resolution
}
JSON

echo "Repo: $repo"
echo "Branch: $branch"
echo "Required checks: ${checks[*]}"

gh api \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  "/repos/$repo/branches/$branch/protection" \
  --input "$tmp" >/dev/null

rm -f "$tmp"
echo "[ok] Protecao de branch aplicada com sucesso."
