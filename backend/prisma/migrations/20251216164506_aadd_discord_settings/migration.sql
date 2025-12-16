-- CreateTable
CREATE TABLE "DiscordSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "notifyOnTournamentStart" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnMatchScheduled" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnMatchResult" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnTeamInvite" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnRoundComplete" BOOLEAN NOT NULL DEFAULT true,
    "mentionRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordSettings_userId_key" ON "DiscordSettings"("userId");

-- AddForeignKey
ALTER TABLE "DiscordSettings" ADD CONSTRAINT "DiscordSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
