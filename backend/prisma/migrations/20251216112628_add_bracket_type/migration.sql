-- CreateEnum
CREATE TYPE "BracketType" AS ENUM ('UPPER', 'LOWER', 'GRAND_FINAL');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bracketType" "BracketType" NOT NULL DEFAULT 'UPPER';
