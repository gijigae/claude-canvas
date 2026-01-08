// Simple Markdown renderer for lesson reasoning pane

import React from "react";
import { Box, Text } from "ink";

interface Props {
  content: string;
  scrollOffset: number;
  visibleLines: number;
}

type LineType = "h1" | "h2" | "h3" | "h4" | "bullet" | "numbered" | "code" | "blockquote" | "hr" | "text" | "blank";

interface ParsedLine {
  type: LineType;
  content: string;
  prefix?: string;
}

function parseLine(line: string): ParsedLine {
  const trimmed = line.trim();

  if (trimmed === "") {
    return { type: "blank", content: "" };
  }

  // Headings
  if (trimmed.startsWith("#### ")) {
    return { type: "h4", content: trimmed.slice(5) };
  }
  if (trimmed.startsWith("### ")) {
    return { type: "h3", content: trimmed.slice(4) };
  }
  if (trimmed.startsWith("## ")) {
    return { type: "h2", content: trimmed.slice(3) };
  }
  if (trimmed.startsWith("# ")) {
    return { type: "h1", content: trimmed.slice(2) };
  }

  // Horizontal rule
  if (/^[-*_]{3,}$/.test(trimmed)) {
    return { type: "hr", content: "" };
  }

  // Blockquote
  if (trimmed.startsWith("> ")) {
    return { type: "blockquote", content: trimmed.slice(2) };
  }

  // Bullet list
  if (/^[-*+]\s/.test(trimmed)) {
    return { type: "bullet", content: trimmed.slice(2), prefix: "•" };
  }

  // Numbered list
  const numMatch = trimmed.match(/^(\d+)\.\s/);
  if (numMatch) {
    return { type: "numbered", content: trimmed.slice(numMatch[0].length), prefix: `${numMatch[1]}.` };
  }

  // Code block markers (we'll handle inline)
  if (trimmed.startsWith("```")) {
    return { type: "code", content: trimmed.slice(3) };
  }

  return { type: "text", content: line };
}

// Render inline formatting (bold, italic, code, links)
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\([^)]+\))/g;
  let lastEnd = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastEnd) {
      nodes.push(<Text key={key++}>{text.slice(lastEnd, match.index)}</Text>);
    }

    if (match[2] !== undefined) {
      // Bold **text**
      nodes.push(<Text key={key++} bold>{match[2]}</Text>);
    } else if (match[3] !== undefined) {
      // Italic *text*
      nodes.push(<Text key={key++} italic>{match[3]}</Text>);
    } else if (match[4] !== undefined) {
      // Code `text`
      nodes.push(<Text key={key++} color="cyan">{match[4]}</Text>);
    } else if (match[5] !== undefined) {
      // Link [text](url)
      nodes.push(<Text key={key++} color="blue" underline>{match[5]}</Text>);
    }

    lastEnd = match.index + match[0].length;
  }

  // Remaining text
  if (lastEnd < text.length) {
    nodes.push(<Text key={key++}>{text.slice(lastEnd)}</Text>);
  }

  if (nodes.length === 0) {
    nodes.push(<Text key={0}>{text}</Text>);
  }

  return nodes;
}

function renderLine(parsed: ParsedLine, idx: number): React.ReactNode {
  switch (parsed.type) {
    case "blank":
      return <Text key={idx}> </Text>;

    case "h1":
      return (
        <Text key={idx} bold color="magenta">
          # {parsed.content}
        </Text>
      );

    case "h2":
      return (
        <Text key={idx} bold color="yellow">
          ## {parsed.content}
        </Text>
      );

    case "h3":
      return (
        <Text key={idx} bold color="cyan">
          ### {parsed.content}
        </Text>
      );

    case "h4":
      return (
        <Text key={idx} bold color="green">
          #### {parsed.content}
        </Text>
      );

    case "hr":
      return <Text key={idx} color="gray">{"─".repeat(40)}</Text>;

    case "blockquote":
      return (
        <Text key={idx}>
          <Text color="gray">│ </Text>
          <Text italic color="gray">{renderInline(parsed.content)}</Text>
        </Text>
      );

    case "bullet":
      return (
        <Text key={idx}>
          <Text color="cyan">  • </Text>
          {renderInline(parsed.content)}
        </Text>
      );

    case "numbered":
      return (
        <Text key={idx}>
          <Text color="cyan">  {parsed.prefix} </Text>
          {renderInline(parsed.content)}
        </Text>
      );

    case "code":
      return (
        <Text key={idx} color="gray" dimColor>
          {parsed.content ? `\`\`\`${parsed.content}` : "```"}
        </Text>
      );

    case "text":
    default:
      return <Text key={idx} wrap="truncate">{renderInline(parsed.content)}</Text>;
  }
}

export function SimpleMarkdown({ content, scrollOffset, visibleLines }: Props) {
  const lines = content.split("\n");
  const visible = lines.slice(scrollOffset, scrollOffset + visibleLines);
  const parsed = visible.map(parseLine);

  return (
    <Box flexDirection="column">
      {parsed.map((line, idx) => renderLine(line, scrollOffset + idx))}
    </Box>
  );
}
