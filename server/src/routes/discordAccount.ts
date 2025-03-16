import express from "express";
import { DiscordAccountController } from "../controllers/DiscordAccountController";

const router = express.Router();
const controller = DiscordAccountController.getInstance();

// Create a new Discord account
router.post("/", (req, res) => controller.createAccount(req, res));

// Get a specific Discord account
router.get("/:accountId", (req, res) => controller.getAccount(req, res));

// Get all Discord accounts for a user
router.get("/user/:userId", (req, res) => controller.getAccountsByUser(req, res));

// Update a Discord account
router.put("/:accountId", (req, res) => controller.updateAccount(req, res));

// Delete a Discord account
router.delete("/:accountId", (req, res) => controller.deleteAccount(req, res));

export default router;
