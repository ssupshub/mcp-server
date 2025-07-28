variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS Cluster name"
  type        = string
  default     = "mcp-cluster"
}

variable "node_group_name" {
  description = "Node group name"
  type        = string
  default     = "mcp-nodes"
}

variable "desired_capacity" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}
