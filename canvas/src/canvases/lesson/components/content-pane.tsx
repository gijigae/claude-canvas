import React, { useMemo } from "react";
import { Box, Text } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";
import { marked } from "marked";
// @ts-ignore - types don't match latest version
import { markedTerminal } from "marked-terminal";
import { LESSON_COLORS } from "../types";

// Configure marked with terminal renderer once
// @ts-ignore - types package is outdated
marked.use(markedTerminal({
  showSectionPrefix: false,
}));

export type PaneType = "test" | "model" | "reasoning";

interface Props {
  type: PaneType;
  title: string;
  content: string;
  focused: boolean;
  scrollOffset: number;
  maxHeight: number;
}

function getPaneColor(type: PaneType): string {
  switch (type) {
    case "test":
      return "cyan";
    case "model":
      return "yellow";
    case "reasoning":
      return "green";
  }
}

export function ContentPane({
  type,
  title,
  content,
  focused,
  scrollOffset,
  maxHeight,
}: Props) {
  const lines = content.split("\n");
  const visibleLines = maxHeight - 2; // Account for header and border
  const color = getPaneColor(type);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + visibleLines < lines.length;

  // Render markdown content with marked-terminal
  const renderedMarkdown = useMemo(() => {
    if (type !== "reasoning") return null;
    let result = marked.parse(content) as string;
    // Post-process: marked-terminal doesn't render bold/italic in lists
    // Convert **text** to bold ANSI and *text* to italic ANSI
    result = result.replace(/\*\*([^*]+)\*\*/g, "\x1b[1m$1\x1b[22m");
    result = result.replace(/\*([^*]+)\*/g, "\x1b[3m$1\x1b[23m");
    return result;
  }, [content, type]);

  // Render content based on pane type
  const renderContent = () => {
    if (type === "reasoning" && renderedMarkdown) {
      // Split rendered markdown into lines and show visible portion
      const mdLines = renderedMarkdown.split("\n");
      const visibleMdLines = mdLines.slice(scrollOffset, scrollOffset + visibleLines);
      return (
        <Box flexDirection="column">
          {visibleMdLines.map((line, i) => (
            <Text key={i}>{line || " "}</Text>
          ))}
        </Box>
      );
    }
    // TEST and MODEL use TypeScript highlighting
    const visibleContent = lines
      .slice(scrollOffset, scrollOffset + visibleLines)
      .join("\n");
    return <SyntaxHighlight code={visibleContent} language="typescript" />;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle={focused ? "bold" : "single"}
      borderColor={focused ? color : LESSON_COLORS.dim}
      paddingX={1}
    >
      <Box>
        <Text bold color={color}>
          {type.toUpperCase()}:{" "}
        </Text>
        <Text color={LESSON_COLORS.dim}>{title}</Text>
        {lines.length > visibleLines && (
          <Text color={LESSON_COLORS.dim}>
            {" "}
            [{scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, lines.length)}/{lines.length}]
          </Text>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {renderContent()}
      </Box>

      {(canScrollUp || canScrollDown) && (
        <Box justifyContent="flex-end">
          <Text color={LESSON_COLORS.dim}>
            {canScrollUp ? "\u2191" : " "}
            {canScrollDown ? "\u2193" : " "}
          </Text>
        </Box>
      )}
    </Box>
  );
}
