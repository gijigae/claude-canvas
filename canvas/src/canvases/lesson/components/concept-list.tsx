import React from "react";
import { Box, Text } from "ink";
import type { Concept } from "../types";
import { LESSON_COLORS } from "../types";

interface Props {
  concepts: Concept[];
  selectedIndex: number;
  focused: boolean;
  maxHeight: number;
}

function getStatusIndicator(status: Concept["status"]): {
  symbol: string;
  color: string;
} {
  switch (status) {
    case "passing":
      return { symbol: "\u2713", color: LESSON_COLORS.passing };
    case "failing":
      return { symbol: "\u2717", color: LESSON_COLORS.failing };
    default:
      return { symbol: "\u25cb", color: LESSON_COLORS.pending };
  }
}

export function ConceptList({
  concepts,
  selectedIndex,
  focused,
  maxHeight,
}: Props) {
  if (concepts.length === 0) {
    return (
      <Box>
        <Text color={LESSON_COLORS.dim}>No concepts found</Text>
      </Box>
    );
  }

  const itemHeight = 1;
  const visibleItems = Math.max(1, maxHeight - 2);

  let startIndex = 0;
  if (selectedIndex >= visibleItems) {
    startIndex = selectedIndex - visibleItems + 1;
  }

  const endIndex = Math.min(startIndex + visibleItems, concepts.length);
  const visibleConcepts = concepts.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={LESSON_COLORS.header}>
          Concepts
        </Text>
      </Box>

      {visibleConcepts.map((concept, i) => {
        const actualIndex = startIndex + i;
        const isSelected = actualIndex === selectedIndex;
        const { symbol, color } = getStatusIndicator(concept.status);

        const numStr = String(concept.number).padStart(3, "0");
        const shortName =
          concept.name.length > 12
            ? concept.name.slice(0, 11) + "\u2026"
            : concept.name;

        return (
          <Box key={concept.id}>
            <Text
              color={isSelected && focused ? LESSON_COLORS.selected : color}
              bold={isSelected}
              inverse={isSelected && focused}
            >
              {symbol} {numStr} {shortName}
            </Text>
          </Box>
        );
      })}

      {concepts.length > visibleItems && (
        <Box marginTop={1}>
          <Text color={LESSON_COLORS.dim}>
            {startIndex > 0 ? "^" : " "}[{selectedIndex + 1}/{concepts.length}]
            {endIndex < concepts.length ? "v" : " "}
          </Text>
        </Box>
      )}
    </Box>
  );
}
