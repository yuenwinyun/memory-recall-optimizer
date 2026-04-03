import { describe, expect, it } from "vitest";

import {
  countResults,
  isDisabled,
  parseBoolean,
  parseNumber,
  readConfig,
  shouldApplyMemoryGuard,
  toNumber,
} from "../../index";

describe("memory recall config", () => {
  it("parses booleans from numbers and strings", () => {
    expect(parseBoolean(true, false)).toBe(true);
    expect(parseBoolean("true", false)).toBe(true);
    expect(parseBoolean("1", false)).toBe(true);
    expect(parseBoolean("false", true)).toBe(false);
    expect(parseBoolean("0", true)).toBe(false);
    expect(parseBoolean(undefined, true)).toBe(true);
  });

  it("parses and clamps numeric values", () => {
    expect(parseNumber("7", 1)).toBe(7);
    expect(parseNumber("bad", 9)).toBe(9);
    expect(readConfig({ maxResults: 100, minScore: -1 }).maxResults).toBe(25);
    expect(readConfig({ maxResults: 1, minPromptLengthForGuard: 200 }).minPromptLengthForGuard).toBe(
      120,
    );
  });

  it("parses numbers from events", () => {
    expect(toNumber("42")).toBe(42);
    expect(toNumber(undefined)).toBeUndefined();
  });

  it("matches memory prompts for guard injection", () => {
    expect(
      shouldApplyMemoryGuard("Can you remember what we decided last time?", {
        enabled: true,
        enforceMemorySearchTuning: true,
        prePromptGuard: true,
        maxResults: 10,
        minScore: 0.2,
        minPromptLengthForGuard: 10,
        logMemorySearchSummary: true,
      }),
    ).toBe(true);
    expect(
      shouldApplyMemoryGuard("hi", {
        enabled: true,
        enforceMemorySearchTuning: true,
        prePromptGuard: true,
        maxResults: 10,
        minScore: 0.2,
        minPromptLengthForGuard: 10,
        logMemorySearchSummary: true,
      }),
    ).toBe(false);
  });

  it("normalizes memory tool result metadata helpers", () => {
    expect(countResults({ results: [1, 2, 3] })).toBe(3);
    expect(countResults({})).toBeUndefined();
    expect(isDisabled({ disabled: true })).toBe(true);
    expect(isDisabled({ disabled: false })).toBe(false);
  });
});
