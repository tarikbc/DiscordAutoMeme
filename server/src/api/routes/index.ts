import { Router } from "express";
import discordAccountsRouter from "./discord-accounts";
import healthRouter from "./health";
import authRouter from "./auth";

const router = Router();

router.use("/auth", authRouter);
router.use("/accounts", discordAccountsRouter);
router.use("/health", healthRouter);

export default router;
