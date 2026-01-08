---
name: lesson
description: |
  Browse learning content from ralph-learning-engine projects.
  Three-pane view showing tests, domain models, and reasoning docs.
---

# Lesson Canvas

Interactive browser for structured learning projects created by ralph-learning-engine.

## Example Prompts

- "Show me the lesson canvas for learn-safety-culture"
- "Browse the concepts in ~/Documents/learn-safety-culture"
- "Run the test for concept 003"

## Quick Start

```bash
cd ${CLAUDE_PLUGIN_ROOT}

# Show lesson canvas
bun run src/cli.ts show lesson --config '{"projectPath":"/path/to/learning-project"}'

# Spawn in tmux split
bun run src/cli.ts spawn lesson --config '{"projectPath":"/path/to/learning-project"}'
```

## Configuration

```typescript
interface LessonConfig {
  projectPath: string;      // Path to learning project root
  title?: string;           // Custom title (defaults to directory name)
  selectedConceptId?: string; // Pre-select a concept by ID
}
```

## Scenarios

| Scenario | Purpose |
|----------|---------|
| `display` | View-only lesson overview |
| `interactive` | Full interaction with test running (default) |

## Auto-Discovery

The canvas scans the project for:

1. **Tests**: `tests/**/NNN-*.test.ts`
2. **Models**: `src/*.ts` (matched by slug)
3. **Reasoning**: `docs/reasoning/NNN-*.md`
4. **PROMPT.md**: Learning roadmap (shown with `p` key)

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Learning: Safety Culture                                     │
├───────────────┬─────────────────────────────────────────────┤
│ Concepts      │ TEST: 001-organizational-accident.test.ts   │
│ ───────────   │                                             │
│ ● 001 Org Acc │─────────────────────────────────────────────│
│   002 Defense │ MODEL: organizational-accident.ts           │
│   003 Swiss   │                                             │
│               │─────────────────────────────────────────────│
│               │ REASONING: 001-organizational-accident.md   │
├───────────────┴─────────────────────────────────────────────┤
│ [j/k] Navigate  [Enter] Run test  [p] PROMPT.md  [q] Quit   │
└─────────────────────────────────────────────────────────────┘
```

## Controls

| Key | Action |
|-----|--------|
| `j`/`k` or arrows | Navigate concept list |
| `Tab` | Cycle focus between panes |
| `Enter` | Run test for selected concept |
| `p` | Toggle PROMPT.md overlay |
| `q`/`Esc` | Quit |

## Status Indicators

| Symbol | Meaning |
|--------|---------|
| `○` | Pending (not yet tested) |
| `✓` | Passing (test succeeded) |
| `✗` | Failing (test failed) |
