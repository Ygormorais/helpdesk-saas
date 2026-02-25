# Bootstrap (Terraform State + GitHub OIDC)

Este modulo cria recursos basicos para:
- Backend remoto do Terraform (S3 + DynamoDB lock)
- Role IAM para GitHub Actions via OIDC (sem access keys)

## Uso

1) Configure credenciais AWS localmente (perfil/SSO) com permissao para criar S3/DynamoDB/IAM.
2) Rode:

```bash
cd job-platform/infra/bootstrap
terraform init
terraform apply
```

3) Pegue os outputs e configure:
- backend do Terraform em `infra/environments/*/backend.tf` (arquivo local, nao versionado)
- GitHub Secrets:
  - `AWS_REGION`
  - `AWS_ROLE_TO_ASSUME`
