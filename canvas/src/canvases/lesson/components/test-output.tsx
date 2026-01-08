import React from "react";
import { Box, Text } from "ink";
import { LESSON_COLORS } from "../types";

interface Props {
  output: string;
  passed: boolean | null;
  onClose: () => void;
}

export function TestOutput({ output, passed }: Props) {
  const lines = output.split("\n");
  const maxLines = 20;
  const visibleLines = lines.slice(-maxLines);

  return (
    <Box
      flexDirection="column"
      borderStyle="bold"
      borderColor={
        passed === null
          ? LESSON_COLORS.dim
          : passed
            ? LESSON_COLORS.passing
            : LESSON_COLORS.failing
      }
      paddingX={1}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color={LESSON_COLORS.header}>
          Test Output
        </Text>
        {passed !== null && (
          <Text
            color={passed ? LESSON_COLORS.passing : LESSON_COLORS.failing}
            bold
          >
            {" "}
            [{passed ? "PASSED" : "FAILED"}]
          </Text>
        )}
        <Text color={LESSON_COLORS.dim}> (press any key to close)</Text>
      </Box>

      <Box flexDirection="column">
        {visibleLines.map((line, i) => (
          <Text key={`output-${i}`} wrap="truncate">
            {line || " "}
          </Text>
        ))}
      </Box>

      {lines.length > maxLines && (
        <Box marginTop={1}>
          <Text color={LESSON_COLORS.dim}>
            ... ({lines.length - maxLines} lines hidden)
          </Text>
        </Box>
      )}
    </Box>
  );
}
