// convex/conversations.ts — Queries and mutations for AI conversations and messages
import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * List all conversations for the authenticated user, newest first.
 */
export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    return ctx.db
      .query("conversations")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Get all messages for a specific conversation, oldest first (chronological).
 */
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: QueryCtx, args) => {
    const user = await requireUser(ctx);

    // Verify ownership
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    return ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Create a new conversation and return its ID.
 */
export const createConversation = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    return ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Add a user message to a conversation.
 */
export const addUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    inputMode: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("receipt")),
    ),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    // Verify ownership
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      inputMode: args.inputMode ?? "text",
      createdAt: Date.now(),
    });

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });

    return messageId;
  },
});

/**
 * Add an assistant response to a conversation.
 * Called by the AI action after generating a response.
 */
export const addAssistantMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    intentType: v.optional(
      v.union(
        v.literal("educate"),
        v.literal("analyze"),
        v.literal("recommend"),
        v.literal("act"),
      ),
    ),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    // Verify ownership
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "assistant",
      content: args.content,
      intentType: args.intentType,
      createdAt: Date.now(),
    });

    // Update conversation timestamp and auto-title from first exchange
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (!conv.title) {
      // Use first 50 chars of the first user message as title
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

/**
 * Delete a conversation and all its messages.
 */
export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.conversationId);
  },
});
