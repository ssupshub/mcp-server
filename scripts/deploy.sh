#!/usr/bin/env bash
# deploy.sh — Build, push to ECR, and deploy to EKS
# Usage: ./scripts/deploy.sh [IMAGE_TAG]
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Required env vars ─────────────────────────────────────────────────────────
: "${AWS_REGION:?AWS_REGION must be set}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID must be set}"
: "${EKS_CLUSTER_NAME:?EKS_CLUSTER_NAME must be set}"

IMAGE_TAG="${1:-$(git rev-parse --short HEAD)}"
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/mcp-server"
FULL_IMAGE="${ECR_REPO}:${IMAGE_TAG}"

info "Deploying tag: ${IMAGE_TAG}"

# ── Build ─────────────────────────────────────────────────────────────────────
info "Building TypeScript…"
npm ci
npm run build

# ── Docker build ─────────────────────────────────────────────────────────────
info "Building Docker image…"
docker build \
  --build-arg NODE_ENV=production \
  --tag "mcp-server:${IMAGE_TAG}" \
  --tag "mcp-server:latest" \
  .

# ── ECR push ─────────────────────────────────────────────────────────────────
info "Authenticating to ECR…"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Create repo if it doesn't exist yet
aws ecr describe-repositories --repository-names mcp-server \
  --region "${AWS_REGION}" > /dev/null 2>&1 \
  || aws ecr create-repository --repository-name mcp-server \
       --image-scanning-configuration scanOnPush=true \
       --region "${AWS_REGION}"

info "Pushing image: ${FULL_IMAGE}"
docker tag "mcp-server:${IMAGE_TAG}" "${FULL_IMAGE}"
docker tag "mcp-server:${IMAGE_TAG}" "${ECR_REPO}:latest"
docker push "${FULL_IMAGE}"
docker push "${ECR_REPO}:latest"

# ── Kubernetes deploy ─────────────────────────────────────────────────────────
info "Updating kubeconfig for cluster: ${EKS_CLUSTER_NAME}"
aws eks update-kubeconfig \
  --region "${AWS_REGION}" \
  --name "${EKS_CLUSTER_NAME}"

info "Applying Kubernetes manifests…"
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa-pdb.yaml

info "Rolling out new image…"
kubectl set image deployment/mcp-deployment \
  mcp-server="${FULL_IMAGE}" \
  -n mcp

info "Waiting for rollout to complete (timeout 5m)…"
kubectl rollout status deployment/mcp-deployment \
  -n mcp --timeout=300s

info "Current cluster state:"
kubectl get pods,svc,ingress,hpa -n mcp

info "✅  Deployment complete — tag: ${IMAGE_TAG}"
