import { definePluginEntry } from "./api.js";
import type { OpenClawPluginApi } from "./api.js";

const DEFAULTS = {
  enabled: true,
  enforceMemorySearchTuning: true,
  prePromptGuard: true,
  maxResults: 10,
  minScore: 0.2,
  minPromptLengthForGuard: 18,
  logMemorySearchSummary: true,
} as const;

const MEMORY_HINT =
  "When this turn asks about prior facts, user preferences, past decisions, or previously discussed topics, " +
  "always run memory_search first, then answer from those results.";

const MEMORY_KEYWORDS = [
  "remember",
  "recall",
  "previous",
  "prior",
  "before",
  "earlier",
  "history",
  "i asked",
  "上次",
  "之前",
  "之前提到",
  "上次说",
  "记住",
  "回想",
  "曾经",
  "我让你",
  "之前的",
];

export type PluginConfig = {
  enabled: boolean;
  enforceMemorySearchTuning: boolean;
  prePromptGuard: boolean;
  maxResults: number;
  minScore: number;
  minPromptLengthForGuard: number;
  logMemorySearchSummary: boolean;
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return fallback;
}

export function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function readConfig(raw: unknown): PluginConfig {
  const cfg = isObject(raw) ? raw : {};
  return {
    enabled: parseBoolean(cfg.enabled, DEFAULTS.enabled),
    enforceMemorySearchTuning: parseBoolean(
      cfg.enforceMemorySearchTuning,
      DEFAULTS.enforceMemorySearchTuning,
    ),
    prePromptGuard: parseBoolean(cfg.prePromptGuard, DEFAULTS.prePromptGuard),
    maxResults: Math.max(3, Math.min(25, parseNumber(cfg.maxResults, DEFAULTS.maxResults))),
    minScore: Math.max(0, Math.min(1, parseNumber(cfg.minScore, DEFAULTS.minScore))),
    minPromptLengthForGuard: Math.max(
      8,
      Math.min(120, parseNumber(cfg.minPromptLengthForGuard, DEFAULTS.minPromptLengthForGuard)),
    ),
    logMemorySearchSummary: parseBoolean(cfg.logMemorySearchSummary, DEFAULTS.logMemorySearchSummary),
  };
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function shouldApplyMemoryGuard(prompt: string, cfg: PluginConfig): boolean {
  const cleaned = prompt.trim().toLowerCase();
  if (cleaned.length < cfg.minPromptLengthForGuard) return false;
  return MEMORY_KEYWORDS.some((keyword) => cleaned.includes(keyword));
}

export function countResults(result: unknown): number | undefined {
  if (!isObject(result)) return undefined;
  const raw = (result as { results?: unknown[] }).results;
  return Array.isArray(raw) ? raw.length : undefined;
}

export function isDisabled(result: unknown): boolean {
  if (!isObject(result)) return false;
  return result.disabled === true;
}

export default definePluginEntry({
  id: "memory-recall-optimizer",
  name: "Memory Recall Optimizer",
  description:
    "Hook-only plugin that reinforces memory_search behavior for better recall consistency.",
  register(api: OpenClawPluginApi) {
    const cfg = readConfig(api.pluginConfig);
    if (!cfg.enabled) {
      api.logger.warn("memory-recall-optimizer: plugin disabled in config");
      return;
    }

    api.on("before_prompt_build", async (event) => {
      if (!cfg.prePromptGuard) return;
      if (!shouldApplyMemoryGuard(event.prompt, cfg)) return;
      return {
        prependContext: `<memory-recall-hint>${MEMORY_HINT}</memory-recall-hint>`,
      };
    });

    api.on("before_tool_call", (event) => {
      if (event.toolName !== "memory_search") return;
      const params = isObject(event.params) ? { ...event.params } : {};
      let updated = false;

      const currentMax = toNumber(params.maxResults);
      if (typeof currentMax !== "number" || currentMax < cfg.maxResults) {
        params.maxResults = cfg.maxResults;
        updated = true;
      }

      if (!cfg.enforceMemorySearchTuning) {
        return updated ? { params } : undefined;
      }

      const currentMinScore = toNumber(params.minScore);
      if (typeof currentMinScore !== "number" || currentMinScore < cfg.minScore) {
        params.minScore = cfg.minScore;
        updated = true;
      }

      return updated ? { params } : undefined;
    });

    api.on("after_tool_call", async (event) => {
      if (event.toolName !== "memory_search" || !cfg.logMemorySearchSummary) return;

      const hits = countResults(event.result);
      const disabled = isDisabled(event.result);
      const status = [
        `tool=memory_search`,
        `runId=${event.runId ?? "-"}`,
        `hits=${hits ?? "n/a"}`,
        `disabled=${disabled}`,
      ];
      api.logger.info(`memory-recall-optimizer: ${status.join(", ")}`);
    });
  },
});
