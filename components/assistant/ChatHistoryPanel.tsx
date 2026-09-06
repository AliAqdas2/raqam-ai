"use client";

import * as React from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/hooks/useAssistant";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ChatHistoryPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewChat: () => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

// ─── Date grouping helpers ───────────────────────────────────────────────────────

type DateGroup = "today" | "yesterday" | "earlier";

function getDateGroup(timestamp: number): DateGroup {
  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const yesterdayStart = todayStart - 86_400_000;

  if (timestamp >= todayStart) return "today";
  if (timestamp >= yesterdayStart) return "yesterday";
  return "earlier";
}

function groupConversations(conversations: Conversation[]): {
  today: Conversation[];
  yesterday: Conversation[];
  earlier: Conversation[];
} {
  const groups = {
    today: [] as Conversation[],
    yesterday: [] as Conversation[],
    earlier: [] as Conversation[],
  };
  for (const c of conversations) {
    groups[getDateGroup(c.updatedAt)].push(c);
  }
  return groups;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ChatHistoryPanel({
  conversations,
  currentConversationId,
  onNewChat,
  onSwitch,
  onDelete,
  disabled,
}: ChatHistoryPanelProps) {
  const { t } = useLanguage();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const groups = React.useMemo(
    () => groupConversations(conversations),
    [conversations],
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const sectionLabels: Record<DateGroup, string> = {
    today: t("assistant.today"),
    yesterday: t("assistant.yesterday"),
    earlier: t("assistant.earlier"),
  };

  const sectionOrder: DateGroup[] = ["today", "yesterday", "earlier"];
  const hasAny = conversations.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header + New Chat button */}
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <span className="text-[13px] font-medium text-[#6B7A70]">
          {t("assistant.chatHistory")}
        </span>
        <button
          onClick={onNewChat}
          disabled={disabled}
          className="flex items-center justify-center gap-2 rounded-[10px] border border-[#E7E2D6] bg-[#F7F4EC] px-3.5 py-[11px] text-[14px] text-[#0F5132] transition-colors hover:bg-[#EDEAE0] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("assistant.newChat")}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
        {!hasAny && (
          <p className="px-3 py-8 text-center text-[13px] text-[#8A9690]">
            {t("assistant.noChats")}
          </p>
        )}

        {sectionOrder.map((group) => {
          const items = groups[group];
          if (items.length === 0) return null;

          return (
            <div key={group} className="flex flex-col gap-0.5">
              <span className="px-3 py-2 text-[12px] font-medium text-[#8A9690]">
                {sectionLabels[group]}
              </span>
              {items.map((conv) => {
                const isActive = conv.id === currentConversationId;
                const isDeleting = conv.id === deletingId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => onSwitch(conv.id)}
                    disabled={disabled || isDeleting}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-[10px] px-3 py-[10px] text-[14px] transition-colors",
                      isActive
                        ? "bg-[#E6EFE9] text-[#0F5132] font-medium"
                        : "text-[#4C5A52] hover:bg-[#F1EEE4]",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span className="min-w-0 flex-1 truncate text-start">
                      {conv.title || t("assistant.untitled")}
                    </span>
                    <span
                      onClick={(e) => handleDelete(e, conv.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleDelete(
                            e as unknown as React.MouseEvent,
                            conv.id,
                          );
                        }
                      }}
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-md transition-all",
                        "opacity-0 group-hover:opacity-100 hover:!bg-[#F6E6E4] hover:!text-[#B3261E]",
                        isDeleting && "animate-pulse opacity-100",
                      )}
                      title={t("assistant.deleteChat")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
