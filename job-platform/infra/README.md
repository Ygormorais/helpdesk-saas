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

Obs: este scaffold nao configura backend remoto (S3/DynamoDB) por padrao.
Quando for usar de verdade, adicione um backend remoto por ambiente.
