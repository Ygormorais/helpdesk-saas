locals {
  name = "${var.project_name}-${var.environment}"
}

data "aws_availability_zones" "available" {
  state = "available"
}

module "network" {
  source = "../../modules/network"

  name = local.name
  cidr = "10.40.0.0/16"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)

  public_subnets  = ["10.40.0.0/20", "10.40.16.0/20"]
  private_subnets = ["10.40.128.0/20", "10.40.144.0/20"]
}

module "ecr" {
  source = "../../modules/ecr"

  name = local.name
}

module "data" {
  source = "../../modules/data"

  name               = local.name
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
}

module "ecs" {
  source = "../../modules/ecs"

  name               = local.name
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = module.network.public_subnet_ids
  private_subnet_ids = module.network.private_subnet_ids

  api_port = var.api_port

  api_image    = "${module.ecr.api_repository_url}:${var.api_image_tag}"
  worker_image = "${module.ecr.worker_repository_url}:${var.worker_image_tag}"

  app_secret_arn = module.data.app_secret_arn

  db_security_group_id    = module.data.db_security_group_id
  redis_security_group_id = module.data.redis_security_group_id

  s3_bucket_name = module.data.bucket_name
}
