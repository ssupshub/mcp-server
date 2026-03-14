# MCP Server v2

A production-grade **Microservice Control Plane (MCP)** server — fully modernized from v1 with TypeScript, strict security hardening, structured logging, comprehensive testing, and battle-tested Kubernetes manifests.

---

## What Changed from v1

| Area | v1 | v2 |
|---|---|---|
| Language | JavaScript (ES Modules + Babel) | **TypeScript 5 (strict mode)** |
| Runtime | Node 18 | **Node 20 LTS** |
| Config validation | None — raw `process.env` | **Zod schema validation, fail-fast on startup** |
| Error handling | None — uncaught crashes | **Typed error classes + centralised Express handler** |
| Logging | `console.log` | **Winston structured JSON + daily rotating files** |
| Security headers | None | **Helmet with strict CSP + HSTS** |
| Rate limiting | None | **Global + per-route limiters** |
| CORS | None | **Configurable, env-driven** |
| Database | URI config only, no connection handling | **Mongoose with retry logic, pooling, graceful disconnect** |
| Health checks | Single `/api/health` endpoint | **Separate `/live`, `/ready`, and full `/health` endpoints** |
| K8s probes | Single HTTP probe | **Startup + liveness + readiness split correctly** |
| K8s security | None | **Non-root, read-only rootfs, dropped capabilities** |
| K8s service type | `LoadBalancer` | **`ClusterIP` — traffic via Ingress/ALB only** |
| K8s secret handling | ConfigMap for everything | **Secrets for sensitive values, ConfigMap for config** |
| K8s autoscaling | None | **HPA (CPU + memory) + PodDisruptionBudget** |
| Docker image | Single-stage, runs as root | **Multi-stage build, non-root user, HEALTHCHECK** |
| Terraform | EKS only, outdated module | **VPC + EKS v20 + ECR + lifecycle policies + IRSA** |
| CI/CD | Basic build+push | **Lint → typecheck → test → npm audit → Trivy scan → build → deploy** |
| Shutdown | Process killed | **Graceful HTTP drain + DB disconnect** |
| Unhandled errors | Silent crash | **`unhandledRejection` / `uncaughtException` guards with clean exit** |
| Request tracing | None | **`X-Request-Id` header on every request/response** |
| API | GET /api/health only | **Full CRUD for services + paginated listing + search** |
| Tests | None | **Vitest + Supertest, coverage reporting** |

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Running Locally](#running-locally)
4. [Environment Variables](#environment-variables)
5. [API Reference](#api-reference)
6. [Testing](#testing)
7. [Docker](#docker)
8. [Kubernetes (EKS)](#kubernetes-eks)
9. [Terraform](#terraform)
10. [CI/CD](#cicd)
11. [Security Notes](#security-notes)
12. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
mcp-server/
├── src/
│   ├── index.ts                  # Entrypoint — bootstrap, graceful shutdown
│   ├── app.ts                    # Express app factory (testable, no side effects)
│   ├── config/
│   │   └── env.ts                # Zod-validated environment config
│   ├── controllers/
│   │   ├── healthController.ts   # /health, /health/live, /health/ready
│   │   └── serviceController.ts  # CRUD for registered microservices
│   ├── middleware/
│   │   ├── errorHandler.ts       # Centralised error + 404 handler
│   │   ├── httpLogger.ts         # Structured HTTP request logging
│   │   └── requestId.ts          # X-Request-Id tracing header
│   ├── models/
│   │   └── service.ts            # Mongoose model with indexes + transforms
│   ├── routes/
│   │   ├── health.ts
│   │   └── services.ts           # Per-route rate limiting
│   ├── services/
│   │   └── database.ts           # Singleton DB service, retry + pooling
│   └── utils/
│       ├── errors.ts             # Typed AppError hierarchy
│       └── logger.ts             # Winston logger + HTTP stream
├── tests/
│   └── health.test.ts
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml               # Template — never commit real values
│   ├── deployment.yaml           # Non-root, read-only rootfs, topology spread
│   ├── service.yaml              # ClusterIP (not LoadBalancer)
│   ├── ingress.yaml              # ALB with TLS, WAF-ready, access logs
│   └── hpa-pdb.yaml              # HPA + PodDisruptionBudget
├── terraform/
│   ├── main.tf                   # VPC + EKS v20 + ECR + lifecycle policies
│   ├── variables.tf
│   └── outputs.tf
├── scripts/
│   └── deploy.sh                 # Idempotent build → push → rollout script
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # Full CI/CD pipeline
├── Dockerfile                    # Multi-stage, non-root, HEALTHCHECK
├── docker-compose.yml            # Local dev with MongoDB + Mongo Express
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .env.example
└── package.json
```

---

## Prerequisites

- **Node.js 20+** and npm
- **Docker** (for container builds)
- **AWS CLI v2** configured with appropriate permissions
- **kubectl** connected to your cluster
- **Terraform 1.6+** (for infra provisioning)

---

## Running Locally

### 1. Clone and install

```bash
git clone https://github.com/your-org/mcp-server.git
cd mcp-server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set DB_URI if you have a local MongoDB
```

### 3. Start with Docker Compose (recommended)

```bash
# Starts mcp-server + MongoDB
docker compose up --build

# Also starts Mongo Express UI at http://localhost:8081
docker compose --profile debug up --build
```

### 4. Start without Docker

```bash
# Requires a running MongoDB instance
npm run dev
```

Server runs at `http://localhost:3000`.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `API_VERSION` | API version prefix | `v1` |
| `LOG_LEVEL` | Winston log level | `info` |
| `DB_URI` | MongoDB connection URI | `mongodb://localhost:27017/mcp` |
| `DB_POOL_SIZE` | Mongoose connection pool size | `10` |
| `DB_CONNECT_TIMEOUT_MS` | DB connection timeout | `5000` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `CORS_ORIGINS` | Allowed CORS origins (`*` or CSV) | `*` |
| `REQUEST_TIMEOUT_MS` | Request timeout | `30000` |
| `SHUTDOWN_TIMEOUT_MS` | Graceful shutdown window | `10000` |

All variables are validated on startup via Zod — the process exits immediately with a descriptive error if anything is misconfigured.

---

## API Reference

All endpoints are prefixed `/api/v1`.

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Full health report (DB ping, memory) |
| GET | `/api/v1/health/live` | Liveness probe — process alive? |
| GET | `/api/v1/health/ready` | Readiness probe — DB connected? |

**GET /api/v1/health** response:

```json
{
  "status": "UP",
  "version": "v1",
  "uptime": 123.456,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "checks": {
    "database": { "status": "UP", "responseTimeMs": 2 },
    "memory": {
      "status": "UP",
      "heapUsedMb": 45.2,
      "heapTotalMb": 68.0,
      "externalMb": 1.4,
      "rssM": 82.1
    }
  }
}
```

### Services

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/services` | List services (paginated, searchable) |
| GET | `/api/v1/services/:id` | Get single service |
| POST | `/api/v1/services` | Register a new service |
| PATCH | `/api/v1/services/:id` | Update a service |
| DELETE | `/api/v1/services/:id` | Deregister a service |

**Query params for GET /services:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort` | string | `createdAt` | Sort field |
| `order` | `asc`/`desc` | `desc` | Sort direction |
| `search` | string | — | Search name/description |

**POST /api/v1/services** body:

```json
{
  "name": "user-service",
  "url": "https://users.internal.svc",
  "description": "Handles user auth and profiles",
  "tags": ["auth", "users"],
  "metadata": { "team": "platform" }
}
```

All error responses follow a consistent shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Testing

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# With coverage report (HTML + lcov)
npm run test:coverage
```

---

## Docker

```bash
# Build production image
docker build -t mcp-server:latest .

# Run
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  mcp-server:latest
```

The image:
- Uses **multi-stage build** (builder + minimal production image)
- Runs as **non-root user** (`appuser`, UID 1001)
- Has a built-in **HEALTHCHECK** pointing at `/api/v1/health/live`
- Based on `node:20-alpine` (~180 MB final image)

---

## Kubernetes (EKS)

### 1. Create Secrets

```bash
# Base64-encode your values
DB_URI_B64=$(echo -n "mongodb://user:pass@host:27017/mcp" | base64)
CORS_B64=$(echo -n "https://app.example.com" | base64)

# Edit k8s/secret.yaml, replace placeholders, then apply
kubectl apply -f k8s/secret.yaml
```

> **Never commit real secret values.** Use AWS Secrets Manager + External Secrets Operator or Sealed Secrets in production.

### 2. Apply manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa-pdb.yaml
```

### 3. Verify

```bash
kubectl get pods,svc,ingress,hpa,pdb -n mcp
kubectl rollout status deployment/mcp-deployment -n mcp
```

### Key K8s improvements

- **Startup probe** — gives the app time to connect to DB before liveness kicks in, eliminating crash-loops on cold start
- **Split liveness/readiness** — liveness is fast (no DB), readiness checks DB so traffic is only routed to ready pods
- **`ClusterIP` service** — external traffic only enters through ALB, reducing attack surface
- **`readOnlyRootFilesystem: true`** — writable `emptyDir` volumes for `/tmp` and `/app/logs` only
- **`capabilities: drop: [ALL]`** — no Linux capabilities granted to container process
- **Topology spread constraints** — pods distributed across AZs automatically
- **HPA** — scales on both CPU and memory, with stabilisation windows to prevent flapping
- **PodDisruptionBudget** — guarantees minimum 2 pods during node drains/upgrades

---

## Terraform

```bash
cd terraform

# Initialise (downloads providers + modules)
terraform init

# Preview changes
terraform plan -var="environment=production"

# Apply
terraform apply -var="environment=production"

# Get kubeconfig update command
terraform output kubeconfig_command
```

Infrastructure provisioned:
- **VPC** with public + private subnets across 3 AZs, NAT gateways
- **EKS cluster** (v1.31) with managed node groups, encrypted EBS, IRSA enabled
- **ECR repository** with image scanning on push + lifecycle policies
- All resources tagged with `Project`, `Environment`, `ManagedBy`

---

## CI/CD

The GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) runs on every push to `main`:

```
push to main
  │
  ├─ quality    lint + typecheck + vitest coverage
  ├─ security   npm audit + Trivy filesystem scan
  ├─ build      Docker build → push to ECR → Trivy image scan
  └─ deploy     kubectl rollout → wait for completion
```

Pull requests run `quality` and `security` only (no deployment).

Required GitHub secrets:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | CI IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | CI IAM user secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `CODECOV_TOKEN` | Optional — for coverage upload |

---

## Security Notes

1. **Secrets** — Never store sensitive values in ConfigMaps. Use K8s Secrets + a secrets manager.
2. **ECR** — Images are immutable-tagged and scanned on push. Pin image tags in production deployments.
3. **ALB + WAF** — The Ingress annotation for WAF ACL is commented out. Uncomment and set your ACL ARN.
4. **Network policies** — Add `NetworkPolicy` resources to restrict pod-to-pod communication.
5. **RBAC** — Create a dedicated `ServiceAccount` with minimal permissions for the MCP deployment.
6. **Terraform state** — Uncomment the S3 backend block in `main.tf` for remote, encrypted state.
7. **`CORS_ORIGINS`** — Set to your actual domains in production, never `*`.
8. **`cluster_public_access_cidrs`** — Restrict to your office/VPN CIDR in production.

---

## Troubleshooting

| Symptom | Command |
|---|---|
| Pod crash-looping | `kubectl logs <pod> -n mcp --previous` |
| ImagePullBackOff | `kubectl describe pod <pod> -n mcp` — check ECR auth + IAM |
| Readiness failing | `kubectl exec -n mcp <pod> -- wget -qO- localhost:3000/api/v1/health/ready` |
| ALB not routing | Check ALB target group health in AWS Console |
| DB connection errors | Verify `DB_URI` in secret, check security groups |
| HPA not scaling | `kubectl describe hpa mcp-hpa -n mcp` — check metrics-server is installed |
