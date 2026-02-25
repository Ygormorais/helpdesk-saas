variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "name" {
  type    = string
  default = "job-platform"
}

variable "github_repo" {
  description = "owner/repo (ex: Ygormorais/helpdesk-saas)"
  type        = string
}

variable "github_ref" {
  description = "ref condition (ex: refs/heads/master)"
  type        = string
  default     = "refs/heads/master"
}
