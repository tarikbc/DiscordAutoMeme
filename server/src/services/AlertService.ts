import { Types } from "mongoose";
import { AlertConfig, AlertHistory, IAlertConfig } from "../models/Alert";
import { DiscordAccount } from "../models/DiscordAccount";
import logger from "../utils/logger";
import axios from "axios";
import nodemailer from "nodemailer";
import config from "../config";
import { User } from "../models/User";

/**
 * Service for managing alert configurations and handling alert sending
 */
export class AlertService {
  private static instance: AlertService;
  private emailTransporter: nodemailer.Transporter | null = null;

  private constructor() {
    // Initialize email transporter if SMTP settings are available
    if (config.alerts.email.enabled) {
      this.emailTransporter = nodemailer.createTransport({
        host: config.alerts.email.host,
        port: config.alerts.email.port,
        secure: config.alerts.email.secure,
        auth: {
          user: config.alerts.email.user,
          pass: config.alerts.email.pass,
        },
      });
      logger.info("Email transporter initialized for alerts");
    } else {
      logger.warn("SMTP settings not available, email alerts disabled");
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  /**
   * Get alert configuration for a user
   * @param userId User ID to get configuration for
   */
  async getAlertConfig(userId: Types.ObjectId): Promise<Partial<IAlertConfig> | null> {
    try {
      const alertConfigDoc = await AlertConfig.findOne({ userId });

      if (!alertConfigDoc) {
        // If no config exists, get user email for default config
        const user = await User.findById(userId);
        if (!user) {
          logger.warn(`User ${userId} not found when getting alert config`);
          return null;
        }

        // Return default config with user's email
        return {
          enabled: true,
          channelType: "email" as "email" | "webhook",
          destination: user.email,
          triggers: {
            connectionLost: true,
            highErrorRate: true,
            tokenInvalid: true,
            rateLimited: true,
          },
          thresholds: {
            errorRateThreshold: config.alerts.defaultThresholds.errorRateThreshold,
            disconnectionThreshold: config.alerts.defaultThresholds.disconnectionThreshold,
          },
          cooldown: config.alerts.defaultThresholds.cooldownMinutes,
        };
      }

      return alertConfigDoc.toObject();
    } catch (error) {
      logger.error(`Error getting alert config for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Set alert configuration for a user
   * @param userId User ID to set configuration for
   * @param configData New configuration data
   */
  async setAlertConfig(
    userId: Types.ObjectId,
    configData: Partial<IAlertConfig>,
  ): Promise<Partial<IAlertConfig>> {
    try {
      // Get existing config or create new one
      let alertConfigDoc = await AlertConfig.findOne({ userId });

      if (!alertConfigDoc) {
        // Create new config
        const user = await User.findById(userId);
        if (!user) {
          throw new Error(`User ${userId} not found when setting alert config`);
        }

        // Create default config with user's email
        const defaultConfig = {
          enabled: true,
          channelType: "email" as "email" | "webhook",
          destination: user.email,
          triggers: {
            connectionLost: true,
            highErrorRate: true,
            tokenInvalid: true,
            rateLimited: true,
          },
          thresholds: {
            errorRateThreshold: config.alerts.defaultThresholds.errorRateThreshold,
            disconnectionThreshold: config.alerts.defaultThresholds.disconnectionThreshold,
          },
          cooldown: config.alerts.defaultThresholds.cooldownMinutes,
        };

        // Apply updates
        const mergedConfig = { ...defaultConfig };

        // Update top-level fields
        if (configData.enabled !== undefined) mergedConfig.enabled = configData.enabled;
        if (configData.channelType !== undefined) mergedConfig.channelType = configData.channelType;
        if (configData.destination !== undefined) mergedConfig.destination = configData.destination;
        if (configData.cooldown !== undefined) mergedConfig.cooldown = configData.cooldown;

        // Update nested triggers
        if (configData.triggers) {
          mergedConfig.triggers = {
            ...mergedConfig.triggers,
            ...configData.triggers,
          };
        }

        // Update nested thresholds
        if (configData.thresholds) {
          mergedConfig.thresholds = {
            ...mergedConfig.thresholds,
            ...configData.thresholds,
          };
        }

        // Create new config document
        alertConfigDoc = await AlertConfig.create({
          userId,
          config: mergedConfig,
        });

        return mergedConfig;
      } else {
        // Update existing config
        const currentConfig = alertConfigDoc.toObject();

        // Update top-level fields
        if (configData.enabled !== undefined) currentConfig.enabled = configData.enabled;
        if (configData.channelType !== undefined)
          currentConfig.channelType = configData.channelType;
        if (configData.destination !== undefined)
          currentConfig.destination = configData.destination;
        if (configData.cooldown !== undefined) currentConfig.cooldown = configData.cooldown;

        // Update nested triggers
        if (configData.triggers && currentConfig.triggers) {
          currentConfig.triggers = {
            ...currentConfig.triggers,
            ...configData.triggers,
          };
        }

        // Update nested thresholds
        if (configData.thresholds && currentConfig.thresholds) {
          currentConfig.thresholds = {
            ...currentConfig.thresholds,
            ...configData.thresholds,
          };
        }

        // Update the document
        await AlertConfig.updateOne(
          { _id: alertConfigDoc._id },
          { $set: { config: currentConfig } },
        );
        return currentConfig;
      }
    } catch (error) {
      logger.error(`Error setting alert config for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new alert
   * @param alertData Alert data to create
   */
  async createAlert(alertData: {
    userId: Types.ObjectId;
    accountId: Types.ObjectId;
    accountName: string;
    type: "connectionLost" | "highErrorRate" | "tokenInvalid" | "rateLimited" | "other";
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    resolved?: boolean;
    data?: any;
  }) {
    try {
      // Check for existing unresolved alert with same type and account
      const existingAlert = await AlertHistory.findOne({
        userId: alertData.userId,
        accountId: alertData.accountId,
        alertType: alertData.type,
        resolved: false,
      });

      if (existingAlert) {
        logger.debug(
          `Alert already exists for ${alertData.type} on account ${alertData.accountId}`,
        );
        return existingAlert;
      }

      // Create new alert
      const alertHistory = await AlertHistory.create({
        alertConfigId: alertData.userId,
        userId: alertData.userId,
        accountId: alertData.accountId,
        alertType: alertData.type,
        message: alertData.message,
        severity: alertData.severity,
        resolved: alertData.resolved || false,
        data: alertData.data || {},
        sentAt: new Date(),
      });

      // Send notification based on user's alert config
      await this.sendAlertNotification(alertHistory);

      return alertHistory;
    } catch (error) {
      logger.error("Error creating alert:", error);
      throw error;
    }
  }

  /**
   * Mark an alert as resolved
   * @param alertId ID of the alert to resolve
   */
  async resolveAlert(alertId: Types.ObjectId) {
    try {
      const alert = await AlertHistory.findByIdAndUpdate(
        alertId,
        {
          resolved: true,
          resolvedAt: new Date(),
        },
        { new: true },
      );

      if (alert) {
        logger.info(`Alert ${alertId} marked as resolved`);
      }

      return alert;
    } catch (error) {
      logger.error(`Error resolving alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Get alert history for a user
   * @param userId User ID to get alerts for
   * @param accountId Optional account ID to filter by
   * @param resolved Optional resolved status to filter by
   * @param limit Number of alerts to return
   * @param skip Number of alerts to skip (for pagination)
   */
  async getAlertHistory(
    userId: Types.ObjectId,
    accountId?: Types.ObjectId,
    resolved?: boolean,
    limit = 50,
    skip = 0,
  ) {
    try {
      // Build query
      const query: any = { userId };

      if (accountId) {
        query.accountId = accountId;
      }

      if (resolved !== undefined) {
        query.resolved = resolved;
      }

      // Get total count
      const total = await AlertHistory.countDocuments(query);

      // Get alerts
      const alerts = await AlertHistory.find(query)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("accountId", "name");

      return { alerts, total };
    } catch (error) {
      logger.error(`Error getting alert history for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send alert notification based on user's preferred method
   * @param alert Alert to send notification for
   */
  private async sendAlertNotification(alert: any) {
    try {
      // Get user's alert config
      const alertConfig = await this.getAlertConfig(alert.userId);

      if (!alertConfig || !alertConfig.enabled) {
        logger.debug(`Alerts disabled for user ${alert.userId}`);
        return;
      }

      // Check if the alert type is enabled in the user's config
      const alertType = alert.alertType as keyof typeof alertConfig.triggers;
      if (!alertConfig.triggers?.[alertType]) {
        logger.debug(`Alert type ${alert.alertType} disabled for user ${alert.userId}`);
        return;
      }

      // Check cooldown period
      if (alertConfig.lastSent && alertConfig.cooldown) {
        const lastSent = new Date(alertConfig.lastSent);
        const cooldownMs = alertConfig.cooldown * 60 * 1000;
        const now = new Date();

        if (now.getTime() - lastSent.getTime() < cooldownMs) {
          logger.debug(`Alert notification in cooldown period for user ${alert.userId}`);
          return;
        }
      }

      // Send notification based on channel type
      if (alertConfig.channelType === "email") {
        await this.sendEmailAlert(alert, alertConfig);
      } else if (alertConfig.channelType === "webhook") {
        await this.sendWebhookAlert(alert, alertConfig);
      }

      // Update last sent timestamp
      await AlertConfig.findOneAndUpdate(
        { userId: alert.userId },
        { "config.lastSent": new Date() },
      );
    } catch (error) {
      logger.error(`Error sending alert notification:`, error);
    }
  }

  /**
   * Send alert via email
   * @param alert Alert to send
   * @param alertConfig User's alert configuration
   */
  private async sendEmailAlert(alert: any, alertConfig: Partial<IAlertConfig>) {
    if (!this.emailTransporter) {
      logger.warn("Cannot send email alert: Email transporter not initialized");
      return false;
    }

    try {
      const severity = this.getSeverityText(alert.severity);
      const mailOptions = {
        from: config.alerts.email.from,
        to: alertConfig.destination,
        subject: `[${severity}] Discord Bot Alert: ${alert.alertType}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${this.getSeverityColor(
              alert.severity,
            )}; color: white; padding: 10px 15px; border-radius: 4px 4px 0 0;">
              <h2 style="margin: 0;">${severity} Alert</h2>
            </div>
            <div style="border: 1px solid #ddd; border-top: none; padding: 15px; border-radius: 0 0 4px 4px;">
              <h3>${alert.message}</h3>
              <p><strong>Account:</strong> ${alert.accountName}</p>
              <p><strong>Issue Type:</strong> ${alert.alertType}</p>
              <p><strong>Detected At:</strong> ${new Date(alert.sentAt).toLocaleString()}</p>
              ${
                alert.data && Object.keys(alert.data).length > 0
                  ? `
                <div style="margin-top: 20px;">
                  <h4>Additional Details:</h4>
                  <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${JSON.stringify(
                    alert.data,
                    null,
                    2,
                  )}</pre>
                </div>`
                  : ""
              }
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 0.9em;">
                  This is an automated alert from your Discord Auto Meme system.
                  You can manage your alert settings in the dashboard.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email alert sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error("Error sending email alert:", error);
      return false;
    }
  }

  /**
   * Send alert via webhook
   * @param alert Alert to send
   * @param config User's alert configuration
   */
  private async sendWebhookAlert(alert: any, config: Partial<IAlertConfig>) {
    try {
      if (!config.destination) {
        logger.warn(`No webhook URL configured for user ${alert.userId}`);
        return;
      }

      // Prepare payload
      const payload = {
        alert_id: alert._id.toString(),
        type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        account_id: alert.accountId.toString(),
        account_name: alert.accountName,
        created_at: alert.sentAt,
        data: alert.data || {},
      };

      // Send webhook request
      await axios.post(config.destination, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      logger.info(`Webhook alert sent to ${config.destination} for alert ${alert._id}`);
    } catch (error) {
      logger.error("Error sending webhook alert:", error);
    }
  }

  /**
   * Get text representation of alert severity
   * @param severity Alert severity
   */
  private getSeverityText(severity: string): string {
    switch (severity) {
      case "critical":
        return "CRITICAL";
      case "high":
        return "HIGH";
      case "medium":
        return "MEDIUM";
      case "low":
        return "LOW";
      default:
        return "UNKNOWN";
    }
  }

  /**
   * Get color code for alert severity
   * @param severity Alert severity
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical":
        return "#FF0000"; // Red
      case "high":
        return "#FF8000"; // Orange
      case "medium":
        return "#FFFF00"; // Yellow
      case "low":
        return "#00FF00"; // Green
      default:
        return "#808080"; // Grey
    }
  }

  /**
   * Check for connection loss issue
   */
  async checkConnectionLossIssues(): Promise<void> {
    try {
      // Find accounts that were active but disconnected
      const disconnectedAccounts = await DiscordAccount.find({
        isActive: true,
        "status.isConnected": false,
        "status.lastDisconnection": { $ne: null },
      });

      for (const account of disconnectedAccounts) {
        // Get user's alert config
        const alertConfig = await AlertConfig.findOne({ userId: account.userId });
        if (!alertConfig || !alertConfig.enabled || !alertConfig.triggers.connectionLost) {
          continue;
        }

        // Check if disconnected for too long (more than 5 minutes)
        const lastDisconnection = account.status.lastDisconnection;
        if (!lastDisconnection) continue;

        const disconnectedTime = Date.now() - lastDisconnection.getTime();
        const disconnectionThresholdMs = 5 * 60 * 1000; // 5 minutes

        if (disconnectedTime > disconnectionThresholdMs) {
          await this.createAlert({
            userId: account.userId,
            accountId: account._id,
            accountName: account.name,
            type: "connectionLost",
            message: `Discord account "${account.name}" has been disconnected for ${Math.round(disconnectedTime / 60000)} minutes`,
            severity: "critical",
            resolved: false,
            data: {
              disconnectedAt: lastDisconnection,
              disconnectedForMs: disconnectedTime,
            },
          });
        }
      }
    } catch (error) {
      logger.error("Error checking for connection loss issues:", error);
    }
  }

  /**
   * Check for high error rate issues
   */
  async checkHighErrorRateIssues(): Promise<void> {
    try {
      // Find accounts with high error rates in the last 5 minutes
      const activeAccounts = await DiscordAccount.find({ isActive: true });

      for (const account of activeAccounts) {
        // Get user's alert config
        const alertConfig = await AlertConfig.findOne({ userId: account.userId });
        if (!alertConfig || !alertConfig.enabled || !alertConfig.triggers.highErrorRate) {
          continue;
        }

        // Calculate error rate (errors per minute)
        // For simplicity, this assumes there's some tracking mechanism that's updating the error count
        const errorRate = account.metrics.errors / 5; // Assuming we check last 5 minutes

        if (errorRate > alertConfig.thresholds.errorRateThreshold) {
          await this.createAlert({
            userId: account.userId,
            accountId: account._id,
            accountName: account.name,
            type: "highErrorRate",
            message: `Discord account "${account.name}" has a high error rate (${errorRate.toFixed(1)} errors/min)`,
            severity: "high",
            resolved: false,
            data: {
              errorRate,
              totalErrors: account.metrics.errors,
              threshold: alertConfig.thresholds.errorRateThreshold,
            },
          });
        }
      }
    } catch (error) {
      logger.error("Error checking for high error rate issues:", error);
    }
  }
}
