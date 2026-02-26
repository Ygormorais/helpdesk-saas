-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "cancelRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "cancelledAt" TIMESTAMP(3);
