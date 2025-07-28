provider "aws" {
  region = var.region
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = var.cluster_name
  cluster_version = "1.26"
  subnets         = data.aws_subnets.eks.ids

  node_groups = {
    mcp_nodes = {
      desired_capacity = var.desired_capacity
      max_capacity     = var.desired_capacity + 1
      min_capacity     = 1
      instance_types   = ["t3.medium"]
    }
  }
}

data "aws_subnets" "eks" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_vpc" "default" {
  default = true
}
