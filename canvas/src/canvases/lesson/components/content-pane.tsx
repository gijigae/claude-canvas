import React from "react";
import { Box, Text } from "ink";
import { LESSON_COLORS } from "../types";

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
  const visibleContent = lines.slice(
    scrollOffset,
    scrollOffset + visibleLines
  );

  const color = getPaneColor(type);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + visibleLines < lines.length;

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
        {visibleContent.map((line, i) => (
          <Text key={`${type}-line-${scrollOffset + i}`} color={LESSON_COLORS.dim} wrap="truncate">
            {line || " "}
          </Text>
        ))}
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
