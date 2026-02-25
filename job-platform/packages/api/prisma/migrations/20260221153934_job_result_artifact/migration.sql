-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "artifactBucket" TEXT,
ADD COLUMN     "artifactKey" TEXT,
ADD COLUMN     "result" JSONB;
