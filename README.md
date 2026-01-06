# Claude Canvas

A TUI toolkit that gives Claude Code its own display. Claude Canvas spawns interactive terminal interfaces in separate panes, allowing Claude to present rich visualizations for emails, calendars, flight bookings, and more.

## Why Claude Canvas?

Many people are using Claude Code for tasks beyond coding — as a personal agent to help with emails, scheduling, and business tasks. But working with complex information in a conversation can be limiting:

- **Drafting emails** — hard to see the full email structure (From, To, CC, BCC, Subject, Body) in a chat
- **Scheduling meetings** — comparing mutual availability across multiple calendars is confusing in text
- **Booking flights** — too much information (airlines, times, prices, seat maps) to present clearly

Claude Canvas solves this by giving Claude a dedicated display where it can render interactive UIs that embrace the terminal.

## Demo

https://github.com/user-attachments/assets/demo.mp4

## Features

- **Document Canvas** — Preview and edit emails and documents with markdown rendering
- **Calendar Canvas** — View calendars and pick meeting times with mouse-clickable time slots
- **Flight Canvas** — Compare flight options with seat map visualization
- **Kanban Canvas** — Display and manage tasks in a board view
- **IPC Communication** — Real-time bidirectional communication between Claude and the canvas
- **Tmux Integration** — Canvases spawn in split panes and are reused across sessions

## Installation

```bash
git clone https://github.com/your-username/claude-canvas.git
cd claude-canvas
bun install
```

### Requirements

- [Bun](https://bun.sh) runtime
- [tmux](https://github.com/tmux/tmux) for spawning canvas panes
- A terminal with mouse support (e.g., iTerm2, Kitty, WezTerm)

## Usage

### As a Claude Code Skill

Copy the project to your Claude Code skills directory:

```bash
cp -r claude-canvas ~/.claude/skills/
```

Claude will automatically use the canvas when appropriate for tasks like:
- "Draft an email to my co-founder Mark..."
- "Find a time when both Emily and I are available..."
- "Book a flight to Denver this week..."

### CLI Commands

```bash
# Show a canvas in the current terminal
bun run src/cli.ts show calendar
bun run src/cli.ts show document --config '{"content": "# Hello\n\nWorld"}'

# Spawn a canvas in a new tmux split
bun run src/cli.ts spawn calendar --scenario meeting-picker
bun run src/cli.ts spawn flight --scenario booking

# Check terminal environment
bun run src/cli.ts env
```

### Programmatic API

```typescript
import { pickMeetingTime, editDocument } from "./src/api";

// Spawn a meeting picker and wait for selection
const result = await pickMeetingTime({
  calendars: [
    { name: "Alice", color: "blue", events: [...] },
    { name: "Bob", color: "green", events: [...] },
  ],
  slotGranularity: 30,
});

if (result.success && result.data) {
  console.log(`Selected: ${result.data.startTime} - ${result.data.endTime}`);
}

// Spawn a document editor
const docResult = await editDocument({
  content: "# My Email\n\nDear Mark...",
  title: "Email Draft",
});
```

## Canvas Types

### Document Canvas

Perfect for emails and document drafts. Shows From/To/CC/BCC/Subject headers for emails, renders markdown, and supports text selection.

```bash
bun run src/cli.ts spawn document --scenario email-preview --config '{
  "content": "Looking forward to seeing you!",
  "email": {
    "from": "me@example.com",
    "to": ["mark@example.com"],
    "subject": "Bay Area Visit"
  }
}'
```

### Calendar Canvas

Visualize multiple calendars overlaid with different colors. Click on free time slots to select meeting times.

```bash
bun run src/cli.ts spawn calendar --scenario meeting-picker --config '{
  "calendars": [
    {"name": "David", "color": "blue", "events": [...]},
    {"name": "Emily", "color": "green", "events": [...]}
  ]
}'
```

**Controls:**
- **Mouse click** — Select a free time slot
- `←/→` — Navigate weeks
- `t` — Jump to today
- `Enter` — Confirm selection
- `q` or `Esc` — Cancel

### Flight Canvas

Cyberpunk-themed flight comparison with interactive seat selection.

```bash
bun run src/cli.ts spawn flight --scenario booking --config '{
  "flights": [
    {
      "airline": "United Airlines",
      "flightNumber": "UA 123",
      "origin": {"code": "SFO", "city": "San Francisco"},
      "destination": {"code": "DEN", "city": "Denver"},
      "departureTime": "2026-01-08T12:55:00",
      "price": 34500,
      "seatmap": {...}
    }
  ]
}'
```

**Controls:**
- `↑/↓` — Navigate between flights
- `Tab` — Switch between flight list and seat map
- `Space` — Select seat
- `Enter` — Confirm booking

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│    Claude Code      │◄───────►│   claude-canvas     │
│    (controller)     │   IPC   │   (Bun/TypeScript)  │
└─────────────────────┘  socket └──────────┬──────────┘
        │                                  │
        │ spawn                            ▼
        │                           ┌──────────────┐
        └──────────────────────────►│ Scenario UI  │
                                    │ (Ink/React)  │
                                    └──────────────┘
```

Claude Code spawns canvas processes via tmux. The canvas renders using [Ink](https://github.com/vadimdemedes/ink) (React for the terminal) and communicates selections back to Claude via Unix domain sockets.

## Tech Stack

- **Bun** — JavaScript runtime and bundler
- **TypeScript** — Type-safe development
- **Ink** — React-based TUI rendering
- **Commander** — CLI argument parsing

## License

MIT License - see [LICENSE](LICENSE) for details.
