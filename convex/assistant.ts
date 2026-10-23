// convex/assistant.ts — Queries and mutations backing the AI pipeline.
// The `sendMessage` action itself lives in `convex/ai.ts` ("use node").

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * Get the user's preferred language for the AI prompt.
 */
export const getPreferredLanguage = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    return user.preferredLanguage ?? "ur";
  },
});

/**
 * Get conversation history for the AI context window (last 10 messages).
 * Ownership-checked: the conversation must belong to the authenticated caller
 * (same guard as conversations.getMessages).
 */
export const getConversationHistory = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: QueryCtx, args) => {
    const user = await requireUser(ctx);

    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(10);

    return messages.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  },
});

// ─── Internal mutations (called from the action) ────────────────────────────────

/**
 * Save user message to conversation.
 */
export const saveUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    inputMode: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("receipt")),
    ),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      inputMode: args.inputMode ?? "text",
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    return messageId;
  },
});

/**
 * Save assistant response to conversation.
 */
export const saveAssistantMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    intentType: v.optional(
      v.union(
        v.literal("educate"),
        v.literal("analyze"),
        v.literal("recommend"),
        v.literal("act"),
        v.literal("offTopic"),
      ),
    ),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "assistant",
      content: args.content,
      intentType: args.intentType,
      createdAt: Date.now(),
    });

    // Update conversation timestamp + auto-title
    const conv = await ctx.db.get(args.conversationId);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (conv && !conv.title) {
      const firstUserMsg = await ctx.db
        .query("messages")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .order("asc")
        .first();
      if (firstUserMsg?.role === "user") {
        updates.title = firstUserMsg.content.slice(0, 50);
      }
    }
    await ctx.db.patch(args.conversationId, updates);
    return messageId;
  },
});

// ─── Main AI action ─────────────────────────────────────────────────────────────
//
// The `sendMessage` action lives in `convex/ai.ts` (a `"use node"` file) so the
// `openai` client and `@openai/agents` SDK run in the Convex Node runtime. It
// calls the queries and mutations above via `ctx.runQuery` / `ctx.runMutation`.
