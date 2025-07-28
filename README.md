# MCP Server

A **Microservice Control Plane (MCP)** server built with Node.js and Express, deployed on AWS using Docker, Kubernetes (EKS), and Terraform. This server provides centralized health checks and control endpoints for your microservices, ensuring high availability, scalability, and easy integration into existing architectures.

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Prerequisites](#prerequisites)
5. [Running the Project](#running-the-project)
6. [Setup and Installation](#setup-and-installation)
7. [Project Structure](#project-structure)
8. [Environment Variables](#environment-variables)
9. [What to Expect](#what-to-expect)
10. [Deployment Guide](#deployment-guide)
11. [API Endpoints](#api-endpoints)
12. [Configuration](#configuration)
13. [Monitoring & Logging](#monitoring--logging)
14. [CI/CD Integration](#cicd-integration)
15. [Troubleshooting](#troubleshooting)
16. [Contributing](#contributing)

---

## Introduction

The MCP Server offers a lightweight control plane for monitoring and managing microservices. It runs as a containerized Node.js application on an EKS cluster behind an AWS Application Load Balancer (ALB). It simplifies service health checks, centralized configuration, and orchestrated deployments.

## Features

* **Health Endpoints**: Readiness and liveness probes out of the box.
* **ConfigMap Integration**: Centralized configuration via Kubernetes ConfigMap.
* **Automated Container Workflow**: Build, tag, and publish Docker images to ECR.
* **Infrastructure as Code**: Provision EKS, networking, and IAM with Terraform.
* **Secure Ingress**: TLS termination via AWS ALB with ACM certificates.
* **Extensible API**: Easily add custom control-plane endpoints.

## Technology Stack

* **Node.js (v18+) & ES Modules**
* **Express.js**
* **Dotenv**
* **Babel**
* **Docker & Docker Compose**
* **AWS ECR & AWS CLI**
* **Amazon EKS & kubectl**
* **Terraform**
* **GitHub Actions (optional)**

## Prerequisites

* **AWS Account** with permissions for ECR, EKS, IAM, ACM.
* **Local Tools**: Node.js, npm, Docker, AWS CLI, kubectl, Terraform.
* **DNS**: A domain or subdomain for ALB Ingress if using HTTPS.
* **IAM Roles**: For EC2 nodes and CI/CD pipelines.

## Running the Project

### 1. Locally (Node.js)

```bash
git clone https://github.com/<org>/mcp-server.git
cd mcp-server
npm install
npm run dev
```

* Access: `http://localhost:3000`

### 2. Docker (Ubuntu/Linux)

```bash
docker build -t mcp-server .
docker run -d -p 3000:3000 --env-file .env mcp-server
```

* Access: `http://<host-ip>:3000`

### 3. AWS EC2 (Ubuntu AMI)

```bash
# On EC2
sudo apt update && sudo apt install -y docker.io git
git clone https://github.com/<org>/mcp-server.git
cd mcp-server
docker build -t mcp-server .
docker run -d -p 3000:3000 --env-file .env mcp-server
```

* Access via EC2 public DNS or Elastic IP

### 4. Docker Compose

```yaml
version: "3.8"
services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
```

```bash
docker-compose up --build -d
```

### 5. Kubernetes (Minikube / EKS)

```bash
# Ensure image is pushed to ECR or Docker Hub
kubectl apply -f k8s/
```

* Minikube: `minikube service mcp-service -n mcp`
* EKS: ALB DNS via Ingress

## Setup and Installation

1. **Clone Repo**

   ```bash
   ```

git clone [https://github.com/](https://github.com/)<org>/mcp-server.git
cd mcp-server

````
2. **Install Dependencies**  
   ```bash
npm install
````

3. **Configure .env**

   ```bash
   ```

cp .env.example .env

# Update values

````
4. **Build for Production**  
   ```bash
npm run build
````

## Project Structure

```plaintext
mcp-server/
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml (optional)
├── package.json
├── .env.example
├── README.md
├── scripts/
│   ├── deploy.sh
│   └── setup-acm.md
├── src/
│   ├── index.js
│   ├── config/
│   │   └── config.js
│   ├── controllers/
│   │   └── mcpController.js
│   └── routes/
│       └── mcpRoutes.js
├── dist/ (build output)
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── terraform/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

## Environment Variables

| Key        | Description               | Default                         |
| ---------- | ------------------------- | ------------------------------- |
| PORT       | HTTP port                 | `3000`                          |
| LOG\_LEVEL | Application log verbosity | `info`                          |
| DB\_URI    | MongoDB connection string | `mongodb://localhost:27017/mcp` |

## What to Expect

* **Rapid health checks** with minimal latency.
* **High availability** via multiple replicas.
* **Zero-downtime** deployments using rolling updates.
* **Centralized control-plane** for microservices.

## Deployment Guide

1. **Authenticate & Build Image**

   ```bash
   ```

aws ecr get-login-password --region \$AWS\_REGION&#x20;
\| docker login --username AWS --password-stdin \$AWS\_ACCOUNT\_ID.dkr.ecr.\$AWS\_REGION.amazonaws.com
npm run build
docker build -t \$AWS\_ACCOUNT\_ID.dkr.ecr.\$AWS\_REGION.amazonaws.com/mcp-server\:latest .

````
2. **Push to ECR**  
   ```bash
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mcp-server:latest
````

3. **Terraform Provision**

   ```bash
   ```

cd terraform
terraform init
terraform apply

````
4. **Kubernetes Deploy**  
   ```bash
kubectl apply -f k8s/
````

5. **Verify**

   ```bash
   ```

kubectl get pods,svc,ingress -n mcp

````

## API Endpoints

- **GET /api/health**  
  ```json
  { "status": "UP", "uptime": 123.45 }
````

* **Add your own control endpoints in `src/controllers`.**

## Configuration

* **Local development**: `.env` file
* **Production**: Kubernetes ConfigMap & Secrets

## Monitoring & Logging

* Integrate **Prometheus** for metrics scraping
* Use **Grafana** dashboards for visualization
* Ship logs with **Fluentd** into **Elasticsearch–Kibana (EFK)**

## CI/CD Integration

Example GitHub Actions workflow in `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline
on: [push]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install && npm run build
      - run: |
          aws ecr get-login-password --region ${{ secrets.AWS_REGION }} \
            | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
      - run: |
          docker build -t ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com/mcp-server:latest .
      - run: docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com/mcp-server:latest
      - run: kubectl apply -f k8s/
        env:
          KUBE_CONFIG_DATA: ${{ secrets.KUBE_CONFIG }}
```

## Troubleshooting

* **Pods Crash**: `kubectl logs <pod> -n mcp`
* **ImagePullBackOff**: Verify ECR repo and IAM policy
* **Ingress Issues**: Check ALB logs and DNS configuration

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/xyz`)
3. Implement changes and tests
4. Open a Pull Request


