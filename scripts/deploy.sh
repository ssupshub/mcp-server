#!/bin/bash
# Deploy script for MCP Server
set -e

# Build and transpile code
echo "Building application..."
npm run build

# Build docker image
echo "Building Docker image..."
docker build -t mcp-server:latest .

# Tag and push to AWS ECR
echo "Tagging and pushing image to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker tag mcp-server:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mcp-server:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mcp-server:latest

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/

echo "Deployment completed."
