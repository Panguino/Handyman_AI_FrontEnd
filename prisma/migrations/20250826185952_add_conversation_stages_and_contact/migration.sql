-- CreateEnum
CREATE TYPE "public"."ConversationStage" AS ENUM ('DEFINITION', 'RECAP_PENDING', 'RECAP_CONFIRMED', 'QUOTING', 'APPROVED', 'BOOKING', 'SCHEDULED', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "recapConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "recapText" TEXT,
ADD COLUMN     "stage" "public"."ConversationStage" NOT NULL DEFAULT 'DEFINITION';
