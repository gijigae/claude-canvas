export type ConceptStatus = "pending" | "passing" | "failing";

export interface Concept {
  id: string;
  number: number;
  name: string;
  testPath: string;
  modelPath: string;
  reasoningPath: string;
  testContent?: string;
  modelContent?: string;
  reasoningContent?: string;
  status: ConceptStatus;
}

export interface LessonConfig {
  projectPath: string;
  title?: string;
  selectedConceptId?: string;
}

export interface TestResult {
  conceptId: string;
  passed: boolean;
  output: string;
  duration: number;
  timestamp: string;
}

export interface LessonResult {
  action: "run-test" | "navigate" | "quit";
  conceptId?: string;
  testOutput?: string;
}

export const LESSON_COLORS = {
  passing: "green",
  failing: "red",
  pending: "gray",
  header: "magenta",
  selected: "white",
  dim: "gray",
} as const;
