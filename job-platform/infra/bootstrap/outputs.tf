output "tfstate_bucket" {
  value = aws_s3_bucket.tfstate.bucket
}

output "tflock_table" {
  value = aws_dynamodb_table.lock.name
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}
