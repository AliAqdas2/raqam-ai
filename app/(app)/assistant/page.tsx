"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Phone,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useAssistant } from "@/hooks/useAssistant";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useVoicePrefs } from "@/hooks/useVoicePrefs";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import type { VoiceErrorCode } from "@/hooks/useVoiceInput";
import type { TranscriptProvider } from "@/lib/ai/transcription";
import { useLanguage } from "@/components/LanguageProvider";
import { ErrorState } from "@/components/shared/DataStates";
import { ConfirmationCard } from "@/components/assistant/ConfirmationCard";
import { ChatHistoryPanel } from "@/components/assistant/ChatHistoryPanel";
import { ChatHistorySheet } from "@/components/assistant/ChatHistorySheet";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { ChatEmptyState } from "@/components/assistant/ChatEmptyState";
import { ChatMessage } from "@/components/assistant/ChatMessage";
import { ThinkingBubble } from "@/components/assistant/ThinkingBubble";
import { VoiceRecorder } from "@/components/assistant/VoiceRecorder";
import { VoiceCallOverlay } from "@/components/assistant/VoiceCallOverlay";
import { ReceiptUploadDialog } from "@/components/receipt/ReceiptUploadDialog";
import type { ReceiptExtractedData } from "@/components/receipt/ReceiptUploadDialog";

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center lg:h-screen">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F5132] border-t-transparent" />
        </div>
      }
    >
      <AssistantPageInner />
    </Suspense>
  );
}

function AssistantPageInner() {
  const searchParams = useSearchParams();
  const {
    conversations,
    messages,
    pendingActions,
    currentConversationId,
    loading,
    sending,
    error,
    sendMessage,
    startNewConversation,
    switchConversation,
    deleteConversation,
    confirmAction,
    rejectAction,
  } = useAssistant();
  const { t, language } = useLanguage();
  const voice = useVoiceInput();
  const tts = useTextToSpeech();
  const { prefs, setPrefs } = useVoicePrefs();
  const call = useVoiceCall({ language, t, sendMessage, pendingActions });
  const [callOpen, setCallOpen] = React.useState(
    () => searchParams.get("call") === "1",
  );

  const [input, setInput] = React.useState(
    () => searchParams.get("draft") ?? "",
  );
  const [voiceProvider, setVoiceProvider] =
    React.useState<TranscriptProvider | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [historySheetOpen, setHistorySheetOpen] = React.useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // When the last message was sent (ms), until its reply has been seen.
  const awaitingReplySince = React.useRef<number | null>(null);

  // A question asked from the dashboard (?q=) is sent straight away in a new
  // chat. The ref guards against a double send under React StrictMode.
  const initialQuery = React.useRef(searchParams.get("q"));
  const autoSentRef = React.useRef(false);
  React.useEffect(() => {
    const q = initialQuery.current?.trim();
    if (!q || autoSentRef.current) return;
    autoSentRef.current = true;
    awaitingReplySince.current = Date.now();
    void sendMessage(q, "text", { newConversation: true });
  }, [sendMessage]);

  // Drop one-shot params (?draft= ?q= ?call=) from the URL (no React setState).
  React.useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ["draft", "q", "call"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) window.history.replaceState({}, "", url.pathname + url.search);
  }, []);

  // ── Read replies aloud (auto-read preference) ──
  // Only replies to messages sent from this screen after the toggle is on;
  // the voice call speaks its own replies.
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  React.useEffect(() => {
    const since = awaitingReplySince.current;
    if (!lastAssistant || since === null || callOpen) return;
    if (lastAssistant.createdAt < since) return;
    awaitingReplySince.current = null;
    if (prefs.autoSpeak) {
      void tts.speak(lastAssistant.content, {
        id: lastAssistant.id,
        preferredLanguage: language,
      });
    }
  }, [lastAssistant, prefs.autoSpeak, callOpen, tts, language]);

  const toggleSpeak = (id: string, content: string) => {
    if (tts.activeId === id) tts.stop();
    else void tts.speak(content, { id, preferredLanguage: language });
  };

  const openCall = () => {
    tts.stop();
    setCallOpen(true);
    void call.start(); // inside the click — unlocks audio playback
  };

  // ── Autoscroll to the newest message ──
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending, pendingActions.length]);

  // ── Send ──
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const mode = voiceProvider ? "voice" : "text";
    setInput("");
    setVoiceProvider(null);
    awaitingReplySince.current = Date.now();
    await sendMessage(text, mode);
  };

  const handleSuggestion = (text: string) => {
    if (sending) return;
    awaitingReplySince.current = Date.now();
    sendMessage(text, "text");
  };

  // ── Voice: toggle record; on stop, drop the transcript into the composer ──
  const handleMic = async () => {
    if (voice.isListening) {
      voice.stopListening();
      const result = await voice.waitForResult();
      if (result.transcript) {
        setInput(result.transcript);
        setVoiceProvider(result.provider);
      } else {
        setVoiceProvider(null);
      }
    } else {
      setInput("");
      setVoiceProvider(null);
      voice.startListening();
    }
  };

  const handleClearVoiceDraft = () => {
    setInput("");
    setVoiceProvider(null);
    voice.reset();
  };

  const handleSendReceipt = async (data: ReceiptExtractedData) => {
    const parts: string[] = [];
    if (data.merchant)
      parts.push(`${t("assistant.receiptMsgMerchant")}: ${data.merchant}`);
    if (data.amount)
      parts.push(`${t("assistant.receiptMsgAmount")}: Rs. ${data.amount}`);
    if (data.date)
      parts.push(`${t("assistant.receiptMsgDate")}: ${data.date}`);
    if (data.description)
      parts.push(`${t("assistant.receiptMsgItems")}: ${data.description}`);
    if (data.categorySuggestion)
      parts.push(
        `${t("assistant.receiptMsgCategory")}: ${data.categorySuggestion}`,
      );

    const message = `${t("assistant.receiptMsgIntro")}\n${parts.join("\n")}\n\n${t("assistant.receiptMsgAsk")}`;
    await sendMessage(message, "receipt");
  };

  const voiceErrorText = (code: VoiceErrorCode | null): string | null => {
    switch (code) {
      case "mic-denied":
        return t("voice.micDenied");
      case "no-speech":
        return t("voice.noSpeech");
      case "not-supported":
        return t("voice.notSupported");
      case "timeout":
      case "transcribe-failed":
        return t("voice.transcribeFailed");
      default:
        return null;
    }
  };

  const voiceBusy = voice.isListening || voice.processing;
  const errorText = voiceErrorText(voice.error);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-row lg:h-screen">
      {/* ── Chat history sidebar ── */}
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-s border-border bg-card transition-[width] duration-200 ease-in-out md:flex ${
          sidebarOpen ? "w-[264px]" : "w-0 border-s-0"
        }`}
      >
        <div className="min-w-[264px]">
          <ChatHistoryPanel
            conversations={conversations}
            currentConversationId={currentConversationId}
            onNewChat={startNewConversation}
            onSwitch={switchConversation}
            onDelete={deleteConversation}
            disabled={sending}
          />
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden h-11 w-11 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-primary md:grid"
            aria-label={t("assistant.chatHistory")}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setHistorySheetOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-secondary px-3 text-[13px] font-medium text-primary md:hidden"
          >
            <History className="h-4 w-4" aria-hidden />
            {t("assistant.historySheetTitle")}
          </button>
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-primary pb-1 font-[var(--font-nastaliq)] text-[17px] text-[#E8B931]">
            ر
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[16px] font-bold">
              {t("assistant.title")}
            </span>
            <span className="truncate text-[12.5px] text-muted-foreground">
              {t("assistant.subtitle")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (prefs.autoSpeak) tts.stop();
              setPrefs({ autoSpeak: !prefs.autoSpeak });
            }}
            aria-pressed={prefs.autoSpeak}
            title={t("tts.autoSpeakHint")}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[13px] transition-colors ${
              prefs.autoSpeak
                ? "bg-accent font-medium text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-primary"
            }`}
          >
            {prefs.autoSpeak ? (
              <Volume2 className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <VolumeX className="h-[18px] w-[18px]" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {prefs.autoSpeak ? t("tts.autoSpeakOn") : t("tts.autoSpeakOff")}
            </span>
          </button>
          <button
            type="button"
            onClick={openCall}
            disabled={!voice.supported || sending}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-medium text-primary-foreground shadow-[0_6px_18px_-8px_rgba(15,81,50,0.8)] transition-colors hover:bg-[#14231B] disabled:opacity-50"
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span>{t("call.cta")}</span>
          </button>
        </header>

        {/* Messages */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-8">
          {loading && (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {error && <ErrorState />}

          {!loading && !error && messages.length === 0 && (
            <ChatEmptyState
              onSelect={handleSuggestion}
              highlightText={input.trim() || undefined}
            />
          )}

          {!loading &&
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                speech={
                  msg.role === "assistant" && !msg.id.startsWith("optimistic-")
                    ? {
                        status: tts.activeId === msg.id ? tts.status : "idle",
                        onToggle: () => toggleSpeak(msg.id, msg.content),
                      }
                    : undefined
                }
              />
            ))}

          {sending && <ThinkingBubble />}

          {!loading &&
            pendingActions.map((action) => (
              <ConfirmationCard
                key={action.id}
                action={action}
                onConfirm={confirmAction}
                onReject={rejectAction}
                disabled={sending}
              />
            ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice error bar */}
        {errorText && !voiceBusy && (
          <div
            className="flex items-center gap-2 border-t border-border bg-[#F6E6E4] px-6 py-2.5 text-[13px] text-[#8A2E26] sm:px-8"
            role="alert"
          >
            <span className="min-w-0 flex-1">{errorText}</span>
            <button
              onClick={() => voice.reset()}
              className="shrink-0 underline hover:no-underline"
            >
              {t("common.dismiss")}
            </button>
          </div>
        )}

        {/* Footer: recorder OR composer — never both */}
        {voiceBusy ? (
          <VoiceRecorder
            mode={voice.isListening ? "recording" : "processing"}
            interimText={voice.interimTranscript}
            onStop={handleMic}
          />
        ) : (
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onMic={handleMic}
            onReceipt={() => setReceiptDialogOpen(true)}
            onClearVoiceDraft={handleClearVoiceDraft}
            sending={sending}
            voiceSupported={voice.supported}
            voiceBusy={voiceBusy}
            voiceProvider={voiceProvider}
          />
        )}

        <ReceiptUploadDialog
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          onSendReceipt={handleSendReceipt}
          sending={sending}
        />

        <VoiceCallOverlay
          open={callOpen}
          call={call}
          pendingActions={pendingActions}
          onConfirm={confirmAction}
          onReject={rejectAction}
          onClose={() => setCallOpen(false)}
        />

        <ChatHistorySheet
          open={historySheetOpen}
          onOpenChange={setHistorySheetOpen}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onNewChat={startNewConversation}
          onSwitch={switchConversation}
          onDelete={deleteConversation}
          disabled={sending}
        />
      </div>
    </div>
  );
}
