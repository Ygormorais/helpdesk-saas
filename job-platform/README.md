# Async Jobs Platform (AWS-ready)

Este projeto e um backend (API + worker) para processamento assincrono com fila, retries/backoff e status persistido.

## Rodar local (dev)

Pre-req: Node 20+ e Docker.

1) Suba Postgres/Redis:

```bash
cd job-platform
docker compose up -d
```

Obs: o Redis fica exposto em `localhost:6380` para evitar conflito com redis local.

Obs: o Postgres fica exposto em `localhost:5433` para evitar conflito com postgres local.

2) Configure env:

```bash
cp .env.example packages/api/.env
cp .env.example packages/worker/.env
```

3) Instale deps e rode migrations:

```bash
npm install
npm -w @jp/api run prisma:migrate
```

4) Rode API + worker:

```bash
npm run dev
```

## Endpoints

- `GET /health`
- `POST /jobs` (header opcional: `Idempotency-Key`)
- `GET /jobs/:id`
- `GET /jobs/:id/artifact` (presigned URL se S3)

## Jobs (exemplos)

- `type`: `report.generate`
  - `payload`: `{ "rows": 100, "value": "demo" }`
  - artefato: CSV em S3 (`S3_BUCKET`) ou arquivo local em `job-platform/tmp/`

## AWS (futuro)

Deploy alvo: ECS Fargate (api + worker), RDS Postgres, ElastiCache Redis, S3.
