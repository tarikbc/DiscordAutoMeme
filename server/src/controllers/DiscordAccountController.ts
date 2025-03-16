import { Request, Response } from "express";
import { Types } from "mongoose";
import { DiscordAccountService } from "../services/DiscordAccountService";
import { CreateAccountInput, UpdateAccountInput } from "../services/DiscordAccountService";

export class DiscordAccountController {
  private static instance: DiscordAccountController;
  private accountService: DiscordAccountService;

  private constructor() {
    this.accountService = DiscordAccountService.getInstance();
  }

  public static getInstance(): DiscordAccountController {
    if (!DiscordAccountController.instance) {
      DiscordAccountController.instance = new DiscordAccountController();
    }
    return DiscordAccountController.instance;
  }

  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateAccountInput = {
        userId: new Types.ObjectId(req.body.userId),
        name: req.body.name,
        token: req.body.token,
        settings: req.body.settings,
      };

      const account = await this.accountService.createAccount(input);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating Discord account:", error);
      res.status(500).json({
        error: "Failed to create Discord account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = new Types.ObjectId(req.params.accountId);
      const account = await this.accountService.getAccount(accountId);

      if (!account) {
        res.status(404).json({ error: "Discord account not found" });
        return;
      }

      res.json(account);
    } catch (error) {
      console.error("Error getting Discord account:", error);
      res.status(500).json({
        error: "Failed to get Discord account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getAccountsByUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = new Types.ObjectId(req.params.userId);
      const accounts = await this.accountService.getAccountsByUser(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error getting user Discord accounts:", error);
      res.status(500).json({
        error: "Failed to get user Discord accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = new Types.ObjectId(req.params.accountId);
      const input: UpdateAccountInput = {
        name: req.body.name,
        token: req.body.token,
        isActive: req.body.isActive,
        settings: req.body.settings,
      };

      const account = await this.accountService.updateAccount(accountId, input);

      if (!account) {
        res.status(404).json({ error: "Discord account not found" });
        return;
      }

      res.json(account);
    } catch (error) {
      console.error("Error updating Discord account:", error);
      res.status(500).json({
        error: "Failed to update Discord account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountId = new Types.ObjectId(req.params.accountId);
      const success = await this.accountService.deleteAccount(accountId);

      if (!success) {
        res.status(404).json({ error: "Discord account not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Discord account:", error);
      res.status(500).json({
        error: "Failed to delete Discord account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
