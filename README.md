# OpenClaw Memory Recall Optimizer

A lightweight OpenClaw hook plugin that improves memory recall consistency by shaping `memory_search` behavior and adding recall diagnostics.

## What it does

- Normalizes `memory_search` parameters before execution (`maxResults`, `minScore`).
- Adds a short recall guard prompt on memory-oriented turns.
- Logs per-call summaries for observability (`runId`, `hits`, `disabled`, `fallback`).

## Install

### From npm (public)

```bash
openclaw plugins install @openclaw/memory-recall-optimizer
openclaw plugins enable memory-recall-optimizer
```

### Local development install

```bash
openclaw plugins install ./memory-recall-optimizer
openclaw plugins enable memory-recall-optimizer
```

> Restart the gateway/app after install when needed.

## Configuration

- `plugins.entries.memory-recall-optimizer.config.enabled` (default: `true`)
- `plugins.entries.memory-recall-optimizer.config.enforceMemorySearchTuning` (default: `true`)
- `plugins.entries.memory-recall-optimizer.config.maxResults` (default: `10`, 1..25)
- `plugins.entries.memory-recall-optimizer.config.minScore` (default: `0.2`, 0..1)
- `plugins.entries.memory-recall-optimizer.config.minPromptLengthForGuard` (default: `18`, 8..120)
- `plugins.entries.memory-recall-optimizer.config.logMemorySearchSummary` (default: `true`)

## Validate

```bash
openclaw plugins list | rg memory-recall-optimizer
openclaw plugins inspect memory-recall-optimizer
openclaw memory status --deep
```

Then run a memory-oriented turn. With logs enabled, you should see:

`memory-recall-optimizer: tool=memory_search ...`

## License

MIT
