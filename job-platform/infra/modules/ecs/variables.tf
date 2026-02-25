variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "api_port" {
  type = number
}

variable "api_image" {
  type = string
}

variable "worker_image" {
  type = string
}

variable "app_secret_arn" {
  type = string
}

variable "db_security_group_id" {
  type = string
}

variable "redis_security_group_id" {
  type = string
}

variable "s3_bucket_name" {
  type = string
}
