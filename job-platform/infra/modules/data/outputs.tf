output "db_security_group_id" {
  value = aws_security_group.db.id
}

output "redis_security_group_id" {
  value = aws_security_group.redis.id
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "redis_secret_arn" {
  value = aws_secretsmanager_secret.redis.arn
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "database_url" {
  value = "postgresql://jp:${random_password.db.result}@${aws_db_instance.this.address}:5432/jp?schema=public"
  sensitive = true
}

output "redis_url" {
  value = "rediss://:${random_password.redis.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  sensitive = true
}

output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}
