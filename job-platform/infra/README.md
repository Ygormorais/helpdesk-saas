# Infra (Terraform) - AWS

Objetivo: provisionar infraestrutura para o `job-platform` com IaC.

Componentes:
- VPC (public + private)
- ALB (public)
- ECS Fargate (api + worker) em subnets privadas
- RDS Postgres (privado)
- ElastiCache Redis (privado)
- ECR (repos api/worker)
- S3 (artefatos/export)

## Estrutura

- `infra/environments/staging`
- `infra/environments/prod`
- `infra/modules/*`

## Uso

1) Configure AWS credentials (ideal: role assumida via OIDC no GitHub Actions).
2) Escolha um ambiente (ex: staging):

```bash
cd job-platform/infra/environments/staging
terraform init
terraform plan
terraform apply
```

## Backend remoto + OIDC (recomendado)

Use `job-platform/infra/bootstrap` para criar:
- bucket S3 de state
- tabela DynamoDB de lock
- role IAM para GitHub Actions (OIDC)

Este repo ja inclui `backend "s3" {}` em:
- `job-platform/infra/environments/staging/backend.tf`
- `job-platform/infra/environments/prod/backend.tf`

Voce precisa fornecer os valores via `terraform init -backend-config=...`.

### Deploy via GitHub Actions

O workflow `.github/workflows/job-platform-deploy.yml` espera estas vars por environment:
- `AWS_REGION`
- `TFSTATE_BUCKET`
- `TFLOCK_TABLE`

E este secret por environment:
- `AWS_ROLE_TO_ASSUME`

Os outputs do bootstrap ajudam:
- `tfstate_bucket`
- `tflock_table`
- `github_actions_role_arn` (valor recomendado para `AWS_ROLE_TO_ASSUME`)
