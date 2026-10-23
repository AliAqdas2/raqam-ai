import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ───────────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    username: v.optional(v.string()),
    name: v.optional(v.string()),
    preferredLanguage: v.union(v.literal("ur"), v.literal("en")),
    currency: v.string(),
    // Phase 13 — proactive assistance. Absent ⇒ every alert type is on.
    notificationPrefs: v.optional(
      v.object({
        budget80: v.boolean(),
        budget100: v.boolean(),
        billReminder: v.boolean(),
        unusualSpend: v.boolean(),
        monthlySummary: v.boolean(),
      }),
    ),
    // High-water mark: month-start Unix ms of the last monthly summary the user
    // dismissed. A later month re-triggers the summary card.
    lastSummaryDismissedMonth: v.optional(v.number()),
    // Phase 15 — set once the user finishes (or skips) the /onboarding flow.
    // Absent ⇒ first-run: the app redirects to /onboarding.
    onboardingCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  // ─── Categories ──────────────────────────────────────────────────────────
  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    nameUr: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    type: v.union(v.literal("income"), v.literal("expense"), v.literal("both")),
    isSystem: v.boolean(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── Transactions ─────────────────────────────────────────────────────────
  transactions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
    descriptionUr: v.optional(v.string()),
    date: v.number(),
    notes: v.optional(v.string()),
    source: v.union(
      v.literal("manual"),
      v.literal("conversational"),
      v.literal("voice"),
      v.literal("receipt"),
      v.literal("import"),
    ),
    importId: v.optional(v.id("imports")),
    receiptStorageId: v.optional(v.string()),
    isRecurring: v.boolean(),
    recurringExpenseId: v.optional(v.id("recurringExpenses")),
    pendingConfirmation: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_category", ["userId", "categoryId"]),

  // ─── Budgets ──────────────────────────────────────────────────────────────
  budgets: defineTable({
    userId: v.id("users"),
    month: v.number(),
    totalLimit: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId_month", ["userId", "month"]),

  budgetCategories: defineTable({
    budgetId: v.id("budgets"),
    userId: v.id("users"),
    categoryId: v.id("categories"),
    limit: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_userId", ["userId"]),

  // ─── Savings Goals ────────────────────────────────────────────────────────
  savingsGoals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    nameUr: v.optional(v.string()),
    targetAmount: v.number(),
    currentAmount: v.number(),
    targetDate: v.optional(v.number()),
    isCompleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── Recurring Expenses ───────────────────────────────────────────────────
  recurringExpenses: defineTable({
    userId: v.id("users"),
    categoryId: v.id("categories"),
    description: v.string(),
    amount: v.number(),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    ),
    nextDueDate: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── Reminders ────────────────────────────────────────────────────────────
  reminders: defineTable({
    userId: v.id("users"),
    message: v.string(),
    messageUr: v.optional(v.string()),
    dueAt: v.number(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── Financial Snapshots ──────────────────────────────────────────────────
  financialSnapshots: defineTable({
    userId: v.id("users"),
    month: v.number(),
    totalIncome: v.number(),
    totalExpenses: v.number(),
    netSavings: v.number(),
    categoryBreakdown: v.array(
      v.object({
        categoryId: v.id("categories"),
        total: v.number(),
      }),
    ),
    createdAt: v.number(),
  }).index("by_userId_month", ["userId", "month"]),

  // ─── Imports ──────────────────────────────────────────────────────────────
  imports: defineTable({
    userId: v.id("users"),
    fileName: v.string(),
    fileType: v.union(v.literal("csv"), v.literal("pdf"), v.literal("xlsx")),
    // Raw uploaded file in Convex file storage (audit trail; optional so a
    // failed storage upload never blocks an otherwise valid import).
    storageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("uploaded"),
      v.literal("parsing"),
      v.literal("preview"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    rowCount: v.optional(v.number()),
    importedCount: v.optional(v.number()),
    duplicateCount: v.optional(v.number()),
    // Rows dropped during parsing (unparseable date/amount) — shown in preview.
    skippedCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  importedTransactions: defineTable({
    importId: v.id("imports"),
    userId: v.id("users"),
    rawData: v.string(),
    normalizedData: v.optional(
      v.object({
        type: v.union(v.literal("income"), v.literal("expense")),
        amount: v.number(),
        description: v.string(),
        date: v.number(),
        suggestedCategoryId: v.optional(v.id("categories")),
      }),
    ),
    isDuplicate: v.boolean(),
    isConfirmed: v.boolean(),
    transactionId: v.optional(v.id("transactions")),
    createdAt: v.number(),
  }).index("by_importId", ["importId"]),

  // ─── AI Conversations ─────────────────────────────────────────────────────
  conversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    inputMode: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("receipt")),
    ),
    intentType: v.optional(
      v.union(
        v.literal("educate"),
        v.literal("analyze"),
        v.literal("recommend"),
        v.literal("act"),
        v.literal("offTopic"), // blocked by the input relevance guardrail
      ),
    ),
    createdAt: v.number(),
  }).index("by_conversationId", ["conversationId"]),

  // ─── Dismissed Proactive Alerts (Phase 13) ────────────────────────────────
  // One row per dismissal. The proactive alert query derives alerts live from
  // current data and filters out any whose (alertKey, periodKey) pair is here.
  // periodKey scoping means a dismissed budget alert re-appears next month if
  // still over threshold, and a dismissed bill reminder re-appears on its next
  // due cycle. The monthly summary uses users.lastSummaryDismissedMonth instead.
  dismissedAlerts: defineTable({
    userId: v.id("users"),
    // "budget80:<catId>" | "budget100:<catId>" | "anomaly:<catId>" | "bill:<recurringId>"
    alertKey: v.string(),
    // month-start ms (budget/anomaly) or nextDueDate ms (bill), stringified
    periodKey: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── Pending Actions (Phase 9 — AI confirmation gate) ──────────────────────
  pendingActions: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    actionType: v.union(
      v.literal("createTransaction"),
      v.literal("deleteTransaction"),
      v.literal("createSavingsGoal"),
    ),
    // JSON-encoded action parameters (decoded server-side on confirmation)
    parameters: v.string(),
    userFacingMessage: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("executed"),
      v.literal("failed"),
    ),
    resultMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_conversationId", ["conversationId"]),

  // ─── Sent Alert Notifications (post-hackathon — email/SMS dispatch) ───────
  // One row per (userId, alertKey, periodKey) that has already been pushed out
  // as email and/or SMS, so the hourly cron never re-sends the same alert.
  // Mirrors the `dismissedAlerts` key shape — a new period re-arms sending,
  // same as it re-arms visibility on the dashboard.
  notificationsSent: defineTable({
    userId: v.id("users"),
    alertKey: v.string(),
    periodKey: v.string(),
    channels: v.array(v.union(v.literal("email"), v.literal("sms"))),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── Audit Log (AGENTS.md §6) ─────────────────────────────────────────────
  // Append-only trail. Phase 15 wires the AI-initiated write paths only:
  // the confirmAction executors (source "ai") and import confirmation
  // (source "user"). Manual CRUD is intentionally not logged for the
  // hackathon build. The one table with no ownership-check requirement on
  // read — but `list` is still auth-scoped by userId.
  auditLog: defineTable({
    userId: v.id("users"),
    action: v.string(), // e.g. "transaction.create"
    entityType: v.string(),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON stringified
    source: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
