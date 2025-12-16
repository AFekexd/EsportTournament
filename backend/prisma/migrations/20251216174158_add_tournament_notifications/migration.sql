-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "discordChannelId" TEXT DEFAULT 'matches',
ADD COLUMN     "notifyDiscord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyUsers" BOOLEAN NOT NULL DEFAULT false;
