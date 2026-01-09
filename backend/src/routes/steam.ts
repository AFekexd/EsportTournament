import { Router } from "express";
import { syncSteam } from "../controllers/steamController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

export const steamRouter = router;

steamRouter.post("/sync", authenticate, syncSteam);
