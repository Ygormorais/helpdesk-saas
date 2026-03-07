param(
  [string]$Repo = "",
  [string]$Branch = "master",
  [string]$RequiredChecks = "build",
  [int]$RequiredApprovals = 1,
  [switch]$RequireCodeOwnerReviews,
  [switch]$EnableConversationResolution,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoFromOrigin {
  $origin = git remote get-url origin
  if (-not $origin) {
    throw "Nao foi possivel detectar o remote origin."
  }

  if ($origin -match "github\.com[:/](.+?)(\.git)?$") {
    return $Matches[1]
  }

  throw "Remote origin nao aponta para GitHub: $origin"
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI (gh) nao encontrado. Instale: https://cli.github.com/"
}

if ([string]::IsNullOrWhiteSpace($Repo)) {
  $Repo = Get-RepoFromOrigin
}

$contexts = @(
  $RequiredChecks.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
)

if ($contexts.Count -eq 0) {
  throw "Informe ao menos um status check em -RequiredChecks."
}

$payload = @{
  required_status_checks           = @{
    strict   = $true
    contexts = $contexts
  }
  enforce_admins                   = $true
  required_pull_request_reviews    = @{
    dismiss_stale_reviews           = $true
    require_code_owner_reviews      = $RequireCodeOwnerReviews.IsPresent
    required_approving_review_count = $RequiredApprovals
  }
  restrictions                     = $null
  required_linear_history          = $true
  allow_force_pushes               = $false
  allow_deletions                  = $false
  required_conversation_resolution = $EnableConversationResolution.IsPresent
}

$json = $payload | ConvertTo-Json -Depth 8

Write-Host "Repo: $Repo"
Write-Host "Branch: $Branch"
Write-Host "Required checks: $($contexts -join ", ")"

if ($DryRun) {
  Write-Host "`n--- Payload ---"
  Write-Host $json
  exit 0
}

$tmp = New-TemporaryFile
try {
  Set-Content -Path $tmp -Value $json -Encoding Ascii
  & gh api `
    --method PUT `
    --header "Accept: application/vnd.github+json" `
    "/repos/$Repo/branches/$Branch/protection" `
    --input $tmp | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao aplicar protecao de branch (gh exit code $LASTEXITCODE)."
  }
  Write-Host "Protecao de branch aplicada com sucesso."
} finally {
  if (Test-Path $tmp) {
    Remove-Item $tmp -Force
  }
}
