variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "job-platform"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "api_port" {
  type    = number
  default = 4010
}

variable "api_image_tag" {
  type    = string
  default = "latest"
}

variable "worker_image_tag" {
  type    = string
  default = "latest"
}
