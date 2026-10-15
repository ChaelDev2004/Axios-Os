import { z } from "zod";
import { FINANCE_NOTIFICATION_TYPES } from "@/features/finance/lib/finance-notifications";

export const financeNotificationIdSchema = z.string().uuid("Invalid notification id");

export const listFinanceNotificationsQuerySchema = z.object({
  type: z.enum(FINANCE_NOTIFICATION_TYPES).optional(),
  unread: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const createFinanceNotificationSchema = z
  .object({
    type: z.enum(FINANCE_NOTIFICATION_TYPES).optional(),
    title: z.string().trim().min(1).max(120).optional(),
    message: z.string().trim().min(1).max(500).optional(),
    transactionId: z.string().uuid().optional(),
  })
  .refine((data) => data.transactionId || (data.title && data.message) || data.type === "finance_daily", {
    message: "Provide title and message, a transactionId, or type finance_daily.",
  });

export const updateFinanceNotificationSchema = z.object({
  read: z.boolean(),
});

export type ListFinanceNotificationsQuery = z.output<typeof listFinanceNotificationsQuerySchema>;
export type CreateFinanceNotificationInput = z.output<typeof createFinanceNotificationSchema>;
