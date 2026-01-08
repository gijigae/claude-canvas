import React from "react";
import { Box, Text } from "ink";
import type { Concept } from "../types";
import { LESSON_COLORS } from "../types";

interface Props {
  concept: Concept | null;
  testRunning: boolean;
  focusedPane: "list" | "test" | "model" | "reasoning";
}

export function StatusBar({ concept, testRunning, focusedPane }: Props) {
  return (
    <Box
      borderStyle="single"
      borderColor={LESSON_COLORS.dim}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={2}>
        <Text color="gray">[j/k]</Text>
        <Text>Navigate</Text>

        <Text color="gray">[Tab]</Text>
        <Text>Focus:{focusedPane}</Text>

        <Text color="gray">[Enter]</Text>
        <Text>{testRunning ? "Running..." : "Run test"}</Text>

        <Text color="gray">[p]</Text>
        <Text>PROMPT.md</Text>

        <Text color="gray">[q]</Text>
        <Text>Quit</Text>
      </Box>

      {concept && (
        <Box>
          <Text color={LESSON_COLORS.header}>
            {String(concept.number).padStart(3, "0")}: {concept.name}
          </Text>
          {concept.status !== "pending" && (
            <Text
              color={
                concept.status === "passing"
                  ? LESSON_COLORS.passing
                  : LESSON_COLORS.failing
              }
            >
              {" "}
              [{concept.status}]
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
