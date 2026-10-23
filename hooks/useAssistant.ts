"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

import type { ActionType } from "@/lib/ai/action-schemas";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";
export type IntentType =
  | "educate"
  | "analyze"
  | "recommend"
  | "act"
  /** Blocked by the input relevance guardrail (lib/ai/guardrail.ts). */
  | "offTopic";
export type InputMode = "text" | "voice" | "receipt";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  inputMode?: InputMode;
  intentType?: IntentType;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Hook return type ────────────────────────────────────────────────────────────

/** What the AI pipeline returned for one message (see lib/ai/orchestrator.ts). */
export interface AssistantReply {
  content: string;
  intentType: IntentType;
  /** True when the reply proposed an action awaiting confirmation. */
  proposedAction: boolean;
}

export interface SendMessageOptions {
  /** Start a fresh conversation for this message (e.g. a dashboard query). */
  newConversation?: boolean;
}

export interface PendingActionData {
  id: string;
  actionType: ActionType;
  parameters: string;
  userFacingMessage: string;
  status: "pending" | "confirmed" | "rejected" | "executed" | "failed";
  resultMessage?: string;
}

export interface UseAssistantReturn {
  conversations: Conversation[];
  messages: ChatMessage[];
  pendingActions: PendingActionData[];
  currentConversationId: string | null;
  loading: boolean;
  sending: boolean;
  error: Error | null;
  /** Resolves with the assistant reply, or null if sending failed. */
  sendMessage: (
    content: string,
    mode?: InputMode,
    options?: SendMessageOptions,
  ) => Promise<AssistantReply | null>;
  startNewConversation: () => Promise<void>;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  confirmAction: (actionId: string) => Promise<void>;
  rejectAction: (actionId: string) => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useAssistant(): UseAssistantReturn {
  // Reactive queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawConversations = useQuery((api as any).conversations.list, {}) as
    | Array<{
        _id: string;
        title?: string;
        createdAt: number;
        updatedAt: number;
      }>
    | undefined;

  const [currentConversationId, setCurrentConversationId] = React.useState<
    string | null
  >(null);

  // Derive effective conversation ID: explicit selection, or first available
  const effectiveConversationId = React.useMemo(() => {
    if (currentConversationId) return currentConversationId;
    if (rawConversations && rawConversations.length > 0) {
      return rawConversations[0]._id;
    }
    return null;
  }, [currentConversationId, rawConversations]);

  // Query messages for the current conversation
  const rawMessages = useQuery(
    effectiveConversationId
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).conversations.getMessages
      : "skip",
    effectiveConversationId
      ? { conversationId: effectiveConversationId as never }
      : "skip",
  ) as
    | Array<{
        _id: string;
        role: MessageRole;
        content: string;
        inputMode?: InputMode;
        intentType?: IntentType;
        createdAt: number;
      }>
    | undefined;

  // Query pending actions for the current conversation (reactive)
  const rawPendingActions = useQuery(
    effectiveConversationId
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).pendingActions.listForConversation
      : "skip",
    effectiveConversationId
      ? { conversationId: effectiveConversationId as never }
      : "skip",
  ) as
    | Array<{
        _id: string;
        actionType: ActionType;
        parameters: string;
        userFacingMessage: string;
        status: "pending" | "confirmed" | "rejected" | "executed" | "failed";
        resultMessage?: string;
        createdAt: number;
      }>
    | undefined;

  // Mutations and actions
  const createConversation = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).conversations.createConversation,
  );
  const deleteConversationMutation = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).conversations.deleteConversation,
  );
  const sendMessageAction = useAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).ai.sendMessage,
  );
  const confirmActionMutation = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).pendingActions.confirmAction,
  );
  const rejectActionMutation = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).pendingActions.rejectAction,
  );

  // State
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  // Optimistic messages — shown immediately while the server round-trip completes
  const [optimisticMessages, setOptimisticMessages] = React.useState<
    ChatMessage[]
  >([]);

  // Transform data
  const conversations: Conversation[] = React.useMemo(() => {
    if (!rawConversations) return [];
    return rawConversations.map((c) => ({
      id: c._id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }, [rawConversations]);

  const messages: ChatMessage[] = React.useMemo(() => {
    const serverMessages = rawMessages
      ? rawMessages.map((m) => ({
          id: m._id,
          role: m.role,
          content: m.content,
          inputMode: m.inputMode,
          intentType: m.intentType,
          createdAt: m.createdAt,
        }))
      : [];

    if (optimisticMessages.length === 0) return serverMessages;

    // Merge: keep optimistic messages that haven't been confirmed by the server yet.
    // A server message "confirms" an optimistic one if it has the same role + content.
    const serverContents = new Set(
      serverMessages.map((m) => `${m.role}:${m.content}`),
    );
    const pendingOptimistic = optimisticMessages.filter(
      (o) => !serverContents.has(`${o.role}:${o.content}`),
    );

    // Clear optimistic messages if all have been confirmed
    if (pendingOptimistic.length !== optimisticMessages.length) {
      // Defer state update to avoid updating during render
      queueMicrotask(() => setOptimisticMessages(pendingOptimistic));
    }

    return [...serverMessages, ...pendingOptimistic];
  }, [rawMessages, optimisticMessages]);

  const pendingActions: PendingActionData[] = React.useMemo(() => {
    if (!rawPendingActions) return [];
    return rawPendingActions.map((a) => ({
      id: a._id,
      actionType: a.actionType,
      parameters: a.parameters,
      userFacingMessage: a.userFacingMessage,
      status: a.status,
      resultMessage: a.resultMessage,
    }));
  }, [rawPendingActions]);

  // Send message
  const sendMessage = React.useCallback(
    async (
      content: string,
      mode?: InputMode,
      options: SendMessageOptions = {},
    ): Promise<AssistantReply | null> => {
      if (!content.trim()) return null;

      // Show the user's message immediately (optimistic update)
      const optimisticMsg: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content,
        inputMode: mode ?? "text",
        createdAt: Date.now(),
      };
      setOptimisticMessages((prev) => [...prev, optimisticMsg]);

      setSending(true);
      setError(null);

      try {
        let convId = options.newConversation ? null : effectiveConversationId;

        // Create conversation if needed
        if (!convId) {
          convId = (await createConversation({})) as string;
          setCurrentConversationId(convId);
        }

        // Call the AI action
        const result = await sendMessageAction({
          conversationId: convId as never,
          content,
          inputMode: mode ?? "text",
        });
        // Soft failures come back as a friendly in-chat message with the real
        // error attached — surface it to the console for debugging.
        if (result?.error) console.warn("[assistant]", result.error);
        return {
          content: result?.content ?? "",
          intentType: result?.intentType ?? "educate",
          proposedAction: Boolean(result?.pendingAction?.userFacingMessage),
        };
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to send message"),
        );
        // Remove the optimistic message on failure
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMsg.id),
        );
        return null;
      } finally {
        setSending(false);
      }
    },
    [effectiveConversationId, createConversation, sendMessageAction],
  );

  // Start new conversation
  const startNewConversation = React.useCallback(async (): Promise<void> => {
    setOptimisticMessages([]);
    const convId = (await createConversation({})) as string;
    setCurrentConversationId(convId);
  }, [createConversation]);

  // Switch conversation
  const switchConversation = React.useCallback((id: string): void => {
    setOptimisticMessages([]);
    setCurrentConversationId(id);
  }, []);

  // Confirm action.
  // confirmAction resolves { success: false, error } when the executor fails
  // (it no longer throws — see convex/pendingActions.ts). Re-throw here so the
  // ConfirmationCard's catch resets its confirming state and the failed
  // pendingAction row (status "failed") renders its error.
  const confirmAction = React.useCallback(
    async (actionId: string): Promise<void> => {
      try {
        const result = await confirmActionMutation({
          actionId: actionId as never,
        });
        if (result && result.success === false) {
          throw new Error(result.error ?? "Action failed");
        }
      } catch (err) {
        console.error("Failed to confirm action:", err);
        throw err;
      }
    },
    [confirmActionMutation],
  );

  // Reject action
  const rejectAction = React.useCallback(
    async (actionId: string): Promise<void> => {
      try {
        await rejectActionMutation({ actionId: actionId as never });
      } catch (err) {
        console.error("Failed to reject action:", err);
        throw err;
      }
    },
    [rejectActionMutation],
  );

  // Delete conversation
  const deleteConversation = React.useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteConversationMutation({ conversationId: id as never });
        // If the deleted conversation was the current one, clear selection
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
      } catch (err) {
        console.error("Failed to delete conversation:", err);
        throw err;
      }
    },
    [deleteConversationMutation, currentConversationId],
  );

  return {
    conversations,
    messages,
    pendingActions,
    currentConversationId: effectiveConversationId,
    loading: rawConversations === undefined,
    sending,
    error,
    sendMessage,
    startNewConversation,
    switchConversation,
    deleteConversation,
    confirmAction,
    rejectAction,
  };
}
