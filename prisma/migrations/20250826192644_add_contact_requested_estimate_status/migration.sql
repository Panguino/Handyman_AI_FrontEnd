-- CreateEnum
CREATE TYPE "public"."EstimateStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT');

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "contactRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."EstimateSummary" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."EstimateStatus" NOT NULL DEFAULT 'DRAFT';
