import { useState, useEffect } from "react";
import { Glob } from "bun";
import { join, basename } from "path";
import type { Concept, ConceptStatus } from "../types";

export interface UseConceptsOptions {
  projectPath: string;
  selectedConceptId?: string;
}

export interface UseConceptsResult {
  concepts: Concept[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectedConcept: Concept | null;
  loading: boolean;
  error: string | null;
  promptContent: string | null;
}

function parseConceptName(filename: string): { number: number; name: string; slug: string } {
  // Parse "001-organizational-accident.test.ts" -> { number: 1, name: "Organizational Accident", slug: "organizational-accident" }
  // Also handles ranges like "014-019-recurrent-patterns.test.ts"
  const rangeMatch = filename.match(/^(\d{3})-(\d{3})-(.+)\.test\.ts$/);
  if (rangeMatch) {
    const number = parseInt(rangeMatch[1], 10);
    const slug = rangeMatch[3];
    const name = slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return { number, name, slug };
  }

  const match = filename.match(/^(\d{3})-(.+)\.test\.ts$/);
  if (!match) {
    return { number: 0, name: filename, slug: filename };
  }
  const number = parseInt(match[1], 10);
  const slug = match[2];
  const name = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return { number, name, slug };
}

async function discoverConcepts(projectPath: string): Promise<Concept[]> {
  const concepts: Concept[] = [];
  const glob = new Glob("**/[0-9][0-9][0-9]-*.test.ts");

  const testsDir = join(projectPath, "tests");

  for await (const testFile of glob.scan({ cwd: testsDir, absolute: false })) {
    const filename = basename(testFile);
    const { number, name, slug } = parseConceptName(filename);
    const id = filename.replace(".test.ts", "");

    // Model files use just the slug (e.g., "recurrent-patterns.ts")
    const modelPath = join(projectPath, "src", `${slug}.ts`);
    // Reasoning files use the full id with number prefix
    const reasoningPath = join(projectPath, "docs", "reasoning", `${id}.md`);

    concepts.push({
      id,
      number,
      name,
      testPath: join(testsDir, testFile),
      modelPath,
      reasoningPath,
      status: "pending" as ConceptStatus,
    });
  }

  return concepts.sort((a, b) => a.number - b.number);
}

async function loadConceptContent(concept: Concept): Promise<Concept> {
  const [testContent, modelContent, reasoningContent] = await Promise.all([
    Bun.file(concept.testPath)
      .text()
      .catch(() => "// File not found"),
    Bun.file(concept.modelPath)
      .text()
      .catch(() => "// File not found"),
    Bun.file(concept.reasoningPath)
      .text()
      .catch(() => "# File not found"),
  ]);

  return {
    ...concept,
    testContent,
    modelContent,
    reasoningContent,
  };
}

async function loadPromptContent(projectPath: string): Promise<string | null> {
  try {
    return await Bun.file(join(projectPath, "PROMPT.md")).text();
  } catch {
    return null;
  }
}

export function useConcepts(options: UseConceptsOptions): UseConceptsResult {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState<string | null>(null);

  // Discover concepts on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const discovered = await discoverConcepts(options.projectPath);
        setConcepts(discovered);

        // Set initial selection
        if (options.selectedConceptId) {
          const idx = discovered.findIndex(
            (c) => c.id === options.selectedConceptId
          );
          if (idx >= 0) setSelectedIndex(idx);
        }

        // Load PROMPT.md
        const prompt = await loadPromptContent(options.projectPath);
        setPromptContent(prompt);

        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load concepts");
        setLoading(false);
      }
    };
    load();
  }, [options.projectPath, options.selectedConceptId]);

  // Load content for selected concept
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  useEffect(() => {
    if (concepts.length === 0 || selectedIndex >= concepts.length) {
      setSelectedConcept(null);
      return;
    }

    const concept = concepts[selectedIndex];
    if (concept.testContent) {
      // Already loaded
      setSelectedConcept(concept);
      return;
    }

    loadConceptContent(concept).then((loaded) => {
      setConcepts((prev) =>
        prev.map((c) => (c.id === loaded.id ? loaded : c))
      );
      setSelectedConcept(loaded);
    });
  }, [concepts, selectedIndex]);

  return {
    concepts,
    selectedIndex,
    setSelectedIndex,
    selectedConcept,
    loading,
    error,
    promptContent,
  };
}
