# ACM Certificate Setup Guide

To use HTTPS with AWS ALB Ingress, you need an ACM certificate.

1. Go to AWS Certificate Manager (ACM).
2. Request a new public certificate for your domain (e.g., mcp.example.com).
3. Validate the domain using DNS (recommended).
4. Once validated, copy the ARN and paste it into `k8s/ingress.yaml`:

    alb.ingress.kubernetes.io/certificate-arn: <PASTE_YOUR_ARN_HERE>

5. Re-apply the ingress manifest:

```bash
kubectl apply -f k8s/ingress.yaml
```
