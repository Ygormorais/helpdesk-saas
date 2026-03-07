# GitHub Governance

## 1) Objetivo

Padronizar protecao de branch e fluxo obrigatorio por PR para `master`.

## 2) Pre-requisitos

- Permissao de admin no repositorio.
- GitHub CLI autenticado (`gh auth login`).

## 3) Aplicar branch protection via script

Windows (PowerShell):

```bash
scripts/setup-branch-protection.ps1 -Repo Ygormorais/helpdesk-saas -Branch master -RequiredChecks "build"
```

Linux/macOS:

```bash
scripts/setup-branch-protection.sh Ygormorais/helpdesk-saas master build
```

Modo solo (sem review obrigatoria, mantendo PR + CI):

Windows:

```bash
scripts/setup-branch-protection.ps1 -Repo Ygormorais/helpdesk-saas -Branch master -RequiredChecks "build" -RequiredApprovals 0
```

Linux/macOS:

```bash
scripts/setup-branch-protection.sh Ygormorais/helpdesk-saas master build 0 false false
```

## 4) Regras aplicadas

- Pull request obrigatorio.
- 1 aprovacao minima.
- Code owner review obrigatorio.
- Dismiss stale reviews habilitado.
- Status checks obrigatorios (ex: `build`).
- Conversation resolution obrigatorio.
- Linear history obrigatorio.
- Force push/destruicao de branch bloqueados.
- Regras aplicadas tambem para admins.

## 5) Validacao

No GitHub: `Settings -> Branches -> Branch protection rules`.

Confirme que a branch `master` exige PR e status check.
