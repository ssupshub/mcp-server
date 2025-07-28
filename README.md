# MCP Server

A **Microservice Control Plane (MCP)** server built with Node.js and Express, deployed on AWS using Docker, Kubernetes (EKS), and Terraform. This server provides centralized health checks and control endpoints for your microservices.

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Prerequisites](#prerequisites)
5. [Setup and Installation](#setup-and-installation)
6. [Project Structure](#project-structure)
7. [Deployment Guide](#deployment-guide)
8. [API Endpoints](#api-endpoints)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)
11. [Contributing](#contributing)

---

## Introduction

The MCP Server offers a lightweight control plane for monitoring and managing microservices. It runs as a containerized application on an EKS cluster behind an Application Load Balancer, ensuring high availability and scalability.

## Features

- Health checks with readiness and liveness probes
- Centralized configuration via ConfigMap
- Automated Docker builds and ECR publishing
- Infrastructure provisioning with Terraform
- Secure HTTPS ingress via AWS ALB
- Simple, extensible REST API

## Technology Stack

- **Node.js (v18+)** – Server runtime
- **Express.js** – Web framework
- **Dotenv** – Configuration management
- **Babel** – Modern JS transpilation
- **Docker** – Containerization
- **AWS ECR** – Docker registry
- **AWS EKS** – Kubernetes managed service
- **Terraform** – Infrastructure as code
- **kubectl** & **AWS CLI** – Cluster and AWS management

## Prerequisites

Ensure the following tools are installed and configured:

- Node.js and npm
- Docker
- AWS CLI (configured with access keys)
- kubectl (configured for your EKS cluster)
- Terraform (v1.0+)

## Setup and Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ssupshub/mcp-server.git
   cd mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Edit `.env` with your values (PORT, DB_URI, etc.)

4. **Local development**:
   ```bash
   npm run dev
   ```
   The server runs at `http://localhost:3000` by default.

## Project Structure

```
mcp-server/
├── .dockerignore       # Files and folders ignored by Docker
├── .gitignore          # Ignored files by Git
├── Dockerfile          # Docker build instructions
├── package.json        # npm manifests and scripts
├── .env.example        # Sample environment variables
├── scripts/            # Deployment and helper scripts
├── src/                # Source code
│   ├── index.js        # Application entry point
│   ├── config/         # Configuration loader
│   ├── controllers/    # Request handlers
│   └── routes/         # Route definitions
├── k8s/                # Kubernetes manifests
└── terraform/          # Terraform configurations
```

## Deployment Guide

1. **Build and push Docker image**:
   ```bash
   npm run build
   docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mcp-server:latest .
   aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mcp-server:latest
   ```

2. **Provision EKS cluster**:
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

3. **Deploy to Kubernetes**:
   ```bash
   kubectl apply -f k8s/
   ```

4. **Verify resources**:
   ```bash
   kubectl get pods,svc,ingress -n mcp
   ```

## API Endpoints

- **GET /api/health**: Returns server status and uptime
  ```json
  {
    "status": "UP",
    "uptime": 123.45
  }
  ```

## Configuration

- Local: `.env` file
- Kubernetes: ConfigMap and Secrets

## Troubleshooting

- **Pod errors**: `kubectl logs <pod> -n mcp`
- **Image issues**: Check ECR repo and IAM permissions
- **Ingress errors**: Confirm ALB ingress annotations and DNS settings

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a pull request


