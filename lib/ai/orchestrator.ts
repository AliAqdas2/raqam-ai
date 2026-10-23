// lib/ai/orchestrator.ts — Multi-agent orchestration using the OpenAI Agents SDK.
// Uses a triage agent with specialist handoffs, behind an input guardrail:
//   Relevance Guardrail ⟶ Triage → Education Agent | Analyze Agent | Action Agent
//
// Gemini is driven through the SDK's built-in provider: a real `openai` client
// pointed at Gemini's OpenAI-compatible endpoint, in chat-completions mode.
// This module is only imported from `convex/ai.ts` ("use node"), so the SDK and
// the `openai` package run in the Convex Node runtime with no shims.

import OpenAI from "openai";
import {
  Agent,
  InputGuardrailTripwireTriggered,
  Runner,
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled,
} from "@openai/agents";
import type { AgentInputItem, Model, RunContext } from "@openai/agents";
import { buildBasePrompt } from "./prompts/base";
import { LITERACY_PROMPT } from "./prompts/literacy";
import { buildAnalysisPrompt } from "./prompts/analysis";
import { ACTION_PROMPT } from "./prompts/action";
import {
  buildFinancialContext,
  formatContextForPrompt,
} from "./context-builder";
import {
  ActionExtraction,
  type ActionExtractionResult,
} from "./action-schemas";
import { GUARDRAIL_MODEL, PRIMARY_MODEL } from "./models";
import {
  buildGuardrailReply,
  createAgentClassifier,
  createRelevanceGuardrail,
  type GuardrailBlock,
  type GuardrailOutputInfo,
  type RelevanceClassifier,
} from "./guardrail";

// ─── Model provider configuration ───────────────────────────────────────────────

/** Primary model from centralized config. Swap in lib/ai/models.ts. */
const MODEL = PRIMARY_MODEL;

setTracingDisabled(true);
setOpenAIAPI("chat_completions");
setDefaultOpenAIClient(
  new OpenAI({
    // The client throws at construction without a key. orchestrate() reports a
    // missing key explicitly, so a placeholder here keeps the module importable
    // (offline unit tests inject their own model).
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "unset",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  }),
);

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface OrchestratorInput {
  userMessage: string;
  preferredLanguage: "ur" | "en";
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export type OrchestratorIntent =
  | "educate"
  | "analyze"
  | "recommend"
  | "act"
  | "offTopic";

export interface OrchestratorResult {
  content: string;
  intentType: OrchestratorIntent;
  /** Extracted action data when intent = "act" and a valid JSON block was found */
  pendingAction?: {
    actionType: ActionExtractionResult["action"];
    parameters: string;
    userFacingMessage: string;
  };
  /** Set when the input guardrail blocked the message before triage. */
  guardrail?: GuardrailBlock;
  error?: string;
}

/**
 * Injection points for tests. Production passes nothing: agents use the
 * Gemini-backed default provider with the models from lib/ai/models.ts.
 */
export interface OrchestratorDeps {
  /** Model for triage + specialists (name or Model instance). */
  model?: string | Model;
  /** Replaces the agent-backed relevance classifier. */
  classifier?: RelevanceClassifier;
}

/**
 * Shared context passed to every agent via the SDK run context.
 * Agents access this through `runContext.context` in their dynamic instructions.
 */
interface AgentContext {
  preferredLanguage: "ur" | "en";
  financialContext: string | null;
}

// ─── Agent factory ──────────────────────────────────────────────────────────────

/**
 * Build the multi-agent system for a given run context.
 *
 * Architecture:
 *   [input guardrail: Relevance Guardrail Agent]
 *   triageAgent  →  educationAgent  (financial literacy questions)
 *                →  analyzeAgent     (data-grounded analysis & recommendations)
 *                →  actionAgent      (transaction extraction — Phase 9)
 */
function buildAgents(
  model: string | Model,
  classify: RelevanceClassifier,
): Agent<AgentContext> {
  // ── Specialist agents ────────────────────────────────────────────────────

  const educationAgent = new Agent<AgentContext>({
    name: "Education Agent",
    handoffDescription:
      "Handles financial literacy questions — e.g., what is inflation, how compound interest works, committee savings.",
    instructions: (ctx: RunContext<AgentContext>) => {
      const base = buildBasePrompt(ctx.context.preferredLanguage);
      return `${base}\n\n${LITERACY_PROMPT}`;
    },
    model,
  });

  const analyzeAgent = new Agent<AgentContext>({
    name: "Analyze Agent",
    handoffDescription:
      'Handles questions about the user\'s own financial data, personalized advice, projections, anomaly analysis, affordability questions, and what-if scenarios — spending analysis, savings rate, budget recommendations, end-of-month projections, goal timelines, "can I afford X?" questions.',
    instructions: (ctx: RunContext<AgentContext>) => {
      const base = buildBasePrompt(ctx.context.preferredLanguage);
      const { financialContext } = ctx.context;

      if (financialContext) {
        return `${base}\n\n${buildAnalysisPrompt(financialContext)}`;
      }

      return `${base}\n\nNote: Financial data is not available yet. Tell the user their data may not be loaded and suggest they add some transactions first.`;
    },
    model,
  });

  const actionAgent = new Agent<AgentContext>({
    name: "Action Agent",
    handoffDescription:
      "Handles requests to create, edit, or delete financial records — adding transactions, creating budgets, deleting transactions, creating savings goals.",
    instructions: (ctx: RunContext<AgentContext>) => {
      const base = buildBasePrompt(ctx.context.preferredLanguage);
      // Inject current date into the action prompt template
      const today = new Date().toISOString().split("T")[0];
      const actionPrompt = ACTION_PROMPT.replace("{{CURRENT_DATE}}", today);
      return `${base}\n\n${actionPrompt}`;
    },
    model,
  });

  // ── Triage agent — routes to the appropriate specialist ──────────────────

  const triageAgent = new Agent<AgentContext>({
    name: "Triage Agent",
    instructions: (ctx: RunContext<AgentContext>) => {
      const langNote =
        ctx.context.preferredLanguage === "ur"
          ? `The user speaks Urdu. Classify Urdu and Roman Urdu messages carefully.
Roman Urdu = Urdu words typed in English letters. It is VERY common. Examples:
- "kitna kharch hua?" → analyze
- "inflation kya hai?" → educate
- "committee kya hoti hai?" → educate
- "500 ka petrol add karo" → act
- "mujhe budget banana hai" → act
- "is mahine ka analysis dikhao" → analyze
- "meri savings kitni hai?" → analyze
- "kharcha delete karo" → act
- "savings goal banaye" → act
- "mahine ke end tak kitna bachega?" → analyze
- "kya main 15000 ka phone afford kar sakta hoon?" → analyze
- "kahan se bachat ho sakti hai?" → analyze
- "koi unusual spending hai?" → analyze
- "is saal tak goal pura hoga?" → analyze

Most Latin-script messages from Urdu-preference users are Roman Urdu, not English.`
          : "The user speaks English.";

      return `You are an intent router for a Pakistani financial assistant app called Raqam-AI.

Classify the user's message and route to the correct specialist agent:

- **Education Agent**: Financial literacy questions (e.g., "inflation kya hai?", "what is compound interest?", "committee kya hoti hai?")
- **Analyze Agent**: Questions about the user's OWN financial data, personalized advice, projections, and affordability (e.g., "is mahine kitna kharch hua?", "where do I spend most?", "how can I save more?", "budget suggestions", "mahine ke end tak kitna bachega?", "can I afford Rs. 15,000 phone?", "kahan se bachat ho sakti hai?", "any unusual spending?", "goal kab tak pura hoga?")
- **Action Agent**: Requests to create, edit, or delete a financial record (e.g., "500 ka petrol add karo", "delete yesterday's transaction", "create a budget")

${langNote}

Route to the correct agent based on the user's intent.`;
    },
    handoffs: [educationAgent, analyzeAgent, actionAgent],
    // Input guardrail: the Relevance Guardrail Agent screens every message
    // before triage runs (blocking — see lib/ai/guardrail.ts).
    inputGuardrails: [createRelevanceGuardrail(classify)],
    model,
  });

  return triageAgent;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract a JSON action block from the AI response text.
 * The Action Agent wraps proposed actions in ```json ... ``` code fences.
 * Returns the parsed action data and the remaining clean text, or null if
 * no valid JSON block is found (e.g. the AI asked a clarification question).
 */
function extractActionFromContent(content: string): {
  pendingAction: NonNullable<OrchestratorResult["pendingAction"]>;
  cleanContent: string;
} | null {
  // Match ```json ... ``` or ``` ... ``` blocks
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
  const match = content.match(jsonBlockRegex);
  if (!match) return null;

  try {
    const raw = JSON.parse(match[1]);
    const parsed = ActionExtraction.safeParse(raw);
    if (!parsed.success) {
      console.warn("Action extraction validation failed:", parsed.error.issues);
      return null;
    }

    // Strip the JSON block from the content — the userFacingMessage replaces it
    const cleanContent = content.replace(match[0], "").trim();

    return {
      pendingAction: {
        actionType: parsed.data.action,
        parameters: JSON.stringify(parsed.data.params),
        userFacingMessage: raw.userFacingMessage ?? "",
      },
      cleanContent,
    };
  } catch {
    console.warn("Failed to parse JSON action block from AI response");
    return null;
  }
}

/**
 * Convert our stored conversation history into the SDK's AgentInputItem format.
 */
function toAgentInput(
  history: Array<{ role: "user" | "assistant"; content: string }>,
): AgentInputItem[] {
  // The SDK's assistant role requires a `status` field, but our stored
  // messages don't carry one. Cast is safe at runtime — the SDK accepts
  // simple { role, content } objects for Chat Completions.
  return history.map((msg) => ({
    role: msg.role,
    content: msg.content,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];
}

/**
 * Map the final agent name back to our intent type enum.
 */
function agentNameToIntent(
  name: string,
): "educate" | "analyze" | "recommend" | "act" {
  if (name.includes("Education")) return "educate";
  if (name.includes("Analyze")) return "analyze";
  if (name.includes("Action")) return "act";
  return "educate";
}

// ─── Main orchestrator ──────────────────────────────────────────────────────────

/**
 * Main entry point for the AI pipeline.
 * Called from a Convex action with the action context and API reference.
 *
 * Flow:
 *   1. Configure Gemini via OpenAI-compatible endpoint
 *   2. Convert conversation history to SDK format
 *   3. Build financial context from Convex
 *   4. Create multi-agent system (triage → specialists)
 *   5. Run the agent pipeline
 *   6. Map the result back to our response format
 */
export async function orchestrate(
  input: OrchestratorInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionCtx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRef: any,
  deps: OrchestratorDeps = {},
): Promise<OrchestratorResult> {
  try {
    // 1. Gemini is configured at module load via setDefaultOpenAIClient(). Guard
    //    against a missing key here so the failure is explicit. Injected test
    //    models don't need it.
    if (!deps.model && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY not set. Set it in Convex deployment environment variables.",
      );
    }

    // 2. Convert conversation history to the SDK's input format
    const history = toAgentInput(input.conversationHistory.slice(-10));

    // 3. Build financial context (available to specialist agents via run context)
    let financialContextStr: string | null = null;
    try {
      const ctx = await buildFinancialContext(actionCtx, apiRef);
      financialContextStr = formatContextForPrompt(ctx);
    } catch {
      // Financial data may not exist yet — specialists handle this gracefully
    }

    // 4. Build the agent system
    const agentContext: AgentContext = {
      preferredLanguage: input.preferredLanguage,
      financialContext: financialContextStr,
    };
    const triageAgent = buildAgents(
      deps.model ?? MODEL,
      deps.classifier ?? createAgentClassifier(deps.model ?? GUARDRAIL_MODEL),
    );

    // 5. Run the multi-agent pipeline. The Runner uses the default provider,
    //    which is the Gemini-backed OpenAI client configured at module load.
    const runner = new Runner({ tracingDisabled: true });
    const result = await runner.run(
      triageAgent,
      [...history, { role: "user" as const, content: input.userMessage }],
      {
        context: agentContext,
        maxTurns: 5,
      },
    );

    // 6. Determine which specialist handled the response
    const intentType = result.lastAgent
      ? agentNameToIntent(result.lastAgent.name)
      : "educate";

    let content = result.finalOutput ?? "";
    let pendingAction: OrchestratorResult["pendingAction"];

    // 7. For "act" intent, extract the JSON action block from the response
    if (intentType === "act") {
      const extracted = extractActionFromContent(content);
      if (extracted) {
        pendingAction = extracted.pendingAction;
        // Replace the raw content with the user-facing message from the action
        if (extracted.cleanContent) {
          content = extracted.cleanContent;
        } else {
          content = extracted.pendingAction.userFacingMessage;
        }
      }
      // If no JSON block found, content stays as-is (clarification question)
    }

    return {
      content,
      intentType,
      pendingAction,
    };
  } catch (err) {
    // Input guardrail tripped — the message never reached triage. Reply with a
    // deterministic redirect in the user's language.
    if (err instanceof InputGuardrailTripwireTriggered) {
      const info = err.result.output.outputInfo as GuardrailOutputInfo;
      const category = info?.verdict?.category ?? "off_topic";
      return {
        content: buildGuardrailReply(category, input.preferredLanguage),
        intentType: "offTopic",
        guardrail: { category, reason: info?.verdict?.reason ?? "" },
      };
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI orchestration error:", err);

    // Return a user-friendly error message in the user's language
    const errorContent =
      input.preferredLanguage === "ur"
        ? "معذرت، معاون میں کوئی مسئلہ آ گیا۔ براہ کرم دوبارہ کوشش کریں۔"
        : "Sorry, the assistant encountered an issue. Please try again.";

    return {
      content: errorContent,
      intentType: "educate",
      error: message,
    };
  }
}
