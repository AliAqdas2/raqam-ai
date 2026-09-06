"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { ChatHistoryPanel } from "@/components/assistant/ChatHistoryPanel";
import type { Conversation } from "@/hooks/useAssistant";

interface ChatHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewChat: () => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

/**
 * Mobile bottom sheet wrapping ChatHistoryPanel — history is hidden on small screens.
 */
export function ChatHistorySheet({
  open,
  onOpenChange,
  conversations,
  currentConversationId,
  onNewChat,
  onSwitch,
  onDelete,
  disabled,
}: ChatHistorySheetProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal>
      <button
        type="button"
        aria-label={t("common.dismiss")}
        className="absolute inset-0 bg-[#14231B]/40"
        onClick={() => onOpenChange(false)}
      />
      <motion.div
        initial={reduceMotion ? false : { y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[20px] border border-[#E7E2D6] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#E7E2D6] px-4 py-3">
          <h2 className="font-reading text-[16px] font-bold text-[#14231B]">
            {t("assistant.historySheetTitle")}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-[#6B7A70] hover:bg-[#F1EEE4]"
            aria-label={t("common.dismiss")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <ChatHistoryPanel
            conversations={conversations}
            currentConversationId={currentConversationId}
            onNewChat={() => {
              onNewChat();
              onOpenChange(false);
            }}
            onSwitch={(id) => {
              onSwitch(id);
              onOpenChange(false);
            }}
            onDelete={onDelete}
            disabled={disabled}
          />
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
