import { Request, Response } from "express";
import { steamService } from "../services/steamService.js";
import prisma from "../lib/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const syncSteam = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const keycloakId = (req as AuthenticatedRequest).user?.sub;
        if (!keycloakId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: keycloakId }
        });


        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.steamId) {
            return res.status(400).json({ success: false, message: "Steam ID not set" });
        }

        const count = await steamService.syncUserPerfectGames(user.id, user.steamId);

        res.json({ success: true, count });
    } catch (error: any) {
        console.error("Steam sync error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
