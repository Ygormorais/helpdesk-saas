output "alb_dns_name" {
  value = module.ecs.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_api_service_name" {
  value = module.ecs.api_service_name
}

output "ecs_worker_service_name" {
  value = module.ecs.worker_service_name
}

output "ecr_api" {
  value = module.ecr.api_repository_url
}

output "ecr_worker" {
  value = module.ecr.worker_repository_url
}

output "database_secret_arn" {
  value = module.data.db_secret_arn
}

output "redis_secret_arn" {
  value = module.data.redis_secret_arn
}

output "app_secret_arn" {
  value = module.data.app_secret_arn
}
