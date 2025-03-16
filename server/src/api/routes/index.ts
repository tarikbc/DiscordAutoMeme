import { Router } from "express";
import discordAccountsRouter from "./discord-accounts";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import setupRouter from "./setup";
import dashboardRouter from "./dashboard";
import permissionsRouter from "./permissions";
import rolesRouter from "./roles";
import { initializePassport } from "../middleware/auth";

const router = Router();

// Initialize Passport
router.use(initializePassport());

// Routes
router.use("/auth", authRouter);
router.use("/accounts", discordAccountsRouter);
router.use("/health", healthRouter);
router.use("/users", usersRouter);
router.use("/setup", setupRouter);
router.use("/dashboard", dashboardRouter);
router.use("/roles", rolesRouter);
router.use("/permissions", permissionsRouter);

export default router;
