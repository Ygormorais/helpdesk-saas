resource "aws_security_group" "db" {
  name        = "${var.name}-db"
  description = "Postgres access"
  vpc_id      = var.vpc_id
}

resource "aws_security_group" "redis" {
  name        = "${var.name}-redis"
  description = "Redis access"
  vpc_id      = var.vpc_id
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db"
  subnet_ids = var.private_subnet_ids
}

resource "random_password" "db" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "db" {
  name = "${var.name}/db"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = "jp"
    password = random_password.db.result
  })
}

resource "aws_db_instance" "this" {
  identifier = var.name

  engine               = "postgres"
  engine_version       = "16"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  max_allocated_storage = 50

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]

  username = "jp"
  password = random_password.db.result
  db_name  = "jp"

  publicly_accessible = false
  skip_final_snapshot = true

  backup_retention_period = 3
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "random_password" "redis" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "redis" {
  name = "${var.name}/redis"
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    auth_token = random_password.redis.result
  })
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = var.name
  description          = "Redis for job-platform"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = "cache.t3.micro"

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.redis.id]

  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  auth_token                 = random_password.redis.result

  num_cache_clusters = 1
  port               = 6379
}

resource "aws_secretsmanager_secret" "app" {
  name = "${var.name}/app"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://jp:${random_password.db.result}@${aws_db_instance.this.address}:5432/jp?schema=public"
    REDIS_URL    = "rediss://:${random_password.redis.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  })
}

resource "aws_s3_bucket" "this" {
  bucket_prefix = "${var.name}-"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
