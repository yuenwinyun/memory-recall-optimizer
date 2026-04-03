import { describe, expect, it, vi } from "vitest";

let pluginEntry: Record<string, unknown> | null = null;

vi.mock("../api.js", () => ({
  definePluginEntry(entry: Record<string, unknown>) {
    pluginEntry = entry;
    return entry;
  },
}));

import plugin from "../index.js";

const buildApi = (pluginConfig: Record<string, unknown>) => {
  const handlers: Record<string, (event: any) => Promise<any> | any> = {};

  return {
    api: {
      pluginConfig,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      on(name: string, handler: (event: any) => Promise<any> | any) {
        handlers[name] = handler;
      },
    },
    handlers,
  };
};

describe("memory recall optimizer e2e", () => {
  it("builds complete memory flow for a matching prompt and memory tool call", async () => {
    pluginEntry = null;
    const { api, handlers } = buildApi({});

    expect(typeof plugin.register).toBe("function");
    plugin.register(api as never);

    expect(pluginEntry).not.toBeNull();
    expect(handlers.before_prompt_build).toBeInstanceOf(Function);
    expect(handlers.before_tool_call).toBeInstanceOf(Function);
    expect(handlers.after_tool_call).toBeInstanceOf(Function);

    const beforePrompt = await handlers.before_prompt_build?.({
      prompt: "Can you remember the previous decision we made about API scope?",
    });
    expect(beforePrompt).toBeTruthy();
    expect(beforePrompt.prependContext).toContain("<memory-recall-hint>");

    const beforeTool = handlers.before_tool_call?.({
      toolName: "memory_search",
      params: { maxResults: 3, minScore: 0.1 },
    });
    expect(beforeTool).toEqual({
      params: {
        maxResults: 10,
        minScore: 0.2,
      },
    });

    await handlers.after_tool_call?.({
      toolName: "memory_search",
      runId: "run-1",
      result: {
        results: [{}, {}],
        disabled: false,
      },
    });

    const callMessage = api.logger.info.mock.calls[0]?.[0] ?? "";
    expect(callMessage).toContain("tool=memory_search");
    expect(callMessage).toContain("runId=run-1");
    expect(callMessage).toContain("hits=2");
    expect(callMessage).toContain("disabled=false");
  });

  it("skips registration when disabled", () => {
    pluginEntry = null;
    const { api, handlers } = buildApi({ enabled: false });
    plugin.register(api as never);

    expect(pluginEntry).not.toBeNull();
    expect(Object.keys(handlers)).toHaveLength(0);
    expect(api.logger.warn).toHaveBeenCalledWith(
      "memory-recall-optimizer: plugin disabled in config",
    );
  });
});
