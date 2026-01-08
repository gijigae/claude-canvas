import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import { useIPC } from "../calendar/hooks/use-ipc";
import { useConcepts } from "./hooks/use-concepts";
import { useTestRunner } from "./hooks/use-test-runner";
import { ConceptList } from "./components/concept-list";
import { ContentPane, type PaneType } from "./components/content-pane";
import { StatusBar } from "./components/status-bar";
import { TestOutput } from "./components/test-output";
import type { LessonConfig, LessonResult, Concept } from "./types";
import { LESSON_COLORS } from "./types";
import { basename } from "path";

interface Props {
  id: string;
  config?: LessonConfig;
  socketPath?: string;
  scenario?: string;
}

type FocusArea = "list" | "content";
type ContentTab = "test" | "model" | "reasoning";

export function LessonCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "interactive",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Config (can be updated via IPC)
  const [config, setConfig] = useState<LessonConfig | undefined>(initialConfig);

  // UI state
  const [focusArea, setFocusArea] = useState<FocusArea>("list");
  const [activeTab, setActiveTab] = useState<ContentTab>("test");
  const [scrollOffsets, setScrollOffsets] = useState({
    test: 0,
    model: 0,
    reasoning: 0,
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [showTestOutput, setShowTestOutput] = useState(false);
  const [lastTestPassed, setLastTestPassed] = useState<boolean | null>(null);

  // IPC connection
  const ipc = useIPC({
    socketPath,
    scenario,
    onClose: () => exit(),
    onUpdate: (newConfig) => {
      setConfig(newConfig as LessonConfig);
    },
  });

  // Concept discovery and management
  const {
    concepts,
    selectedIndex,
    setSelectedIndex,
    selectedConcept,
    loading,
    error,
    promptContent,
  } = useConcepts({
    projectPath: config?.projectPath || "",
    selectedConceptId: config?.selectedConceptId,
  });

  // Mutable concepts for updating status
  const [conceptStatuses, setConceptStatuses] = useState<
    Record<string, Concept["status"]>
  >({});

  // Test runner
  const { running, output, runTest, clearOutput } = useTestRunner({
    projectPath: config?.projectPath || "",
    onComplete: (result) => {
      setConceptStatuses((prev) => ({
        ...prev,
        [result.conceptId]: result.passed ? "passing" : "failing",
      }));
      setLastTestPassed(result.passed);
      setShowTestOutput(true);
    },
  });

  // Listen for terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 120,
        height: stdout?.rows || 40,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Get concept with updated status
  const getConceptWithStatus = useCallback(
    (concept: Concept): Concept => ({
      ...concept,
      status: conceptStatuses[concept.id] || concept.status,
    }),
    [conceptStatuses]
  );

  // Toggle focus between list and content
  const toggleFocus = useCallback(() => {
    setFocusArea((prev) => (prev === "list" ? "content" : "list"));
  }, []);

  // Cycle through tabs
  const cycleTab = useCallback(() => {
    const order: ContentTab[] = ["test", "model", "reasoning"];
    const currentIndex = order.indexOf(activeTab);
    setActiveTab(order[(currentIndex + 1) % order.length]!);
  }, [activeTab]);

  // Handle scrolling in content panes
  const scroll = useCallback(
    (direction: "up" | "down") => {
      if (focusArea === "list") return;

      const delta = direction === "up" ? -3 : 3;

      setScrollOffsets((prev) => ({
        ...prev,
        [activeTab]: Math.max(0, prev[activeTab] + delta),
      }));
    },
    [focusArea, activeTab]
  );

  // Keyboard controls
  useInput((input, key) => {
    // Handle test output modal
    if (showTestOutput) {
      setShowTestOutput(false);
      clearOutput();
      return;
    }

    // Handle PROMPT.md overlay
    if (showPrompt) {
      if (input === "p" || key.escape) {
        setShowPrompt(false);
      }
      return;
    }

    // Quit
    if (input === "q" || key.escape) {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    // Toggle PROMPT.md
    if (input === "p") {
      setShowPrompt(true);
      return;
    }

    // Tab to toggle focus between list and content
    if (key.tab) {
      toggleFocus();
      return;
    }

    // 1/2/3 or h/l to switch tabs
    if (input === "1") {
      setActiveTab("test");
      return;
    }
    if (input === "2") {
      setActiveTab("model");
      return;
    }
    if (input === "3") {
      setActiveTab("reasoning");
      return;
    }
    if (input === "h" || key.leftArrow) {
      const order: ContentTab[] = ["test", "model", "reasoning"];
      const idx = order.indexOf(activeTab);
      setActiveTab(order[(idx - 1 + order.length) % order.length]!);
      return;
    }
    if (input === "l" || key.rightArrow) {
      cycleTab();
      return;
    }

    // Run test
    if (key.return && selectedConcept && !running) {
      runTest(selectedConcept.id, selectedConcept.testPath);
      return;
    }

    // Navigation
    if (focusArea === "list") {
      if (input === "j" || key.downArrow) {
        setSelectedIndex(Math.min(concepts.length - 1, selectedIndex + 1));
        // Reset scroll offsets when changing concept
        setScrollOffsets({ test: 0, model: 0, reasoning: 0 });
      } else if (input === "k" || key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
        setScrollOffsets({ test: 0, model: 0, reasoning: 0 });
      }
    } else {
      // Scroll content panes
      if (input === "j" || key.downArrow) {
        scroll("down");
      } else if (input === "k" || key.upArrow) {
        scroll("up");
      }
    }
  });

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 2;
  const tabBarHeight = 1;
  const statusBarHeight = 3;
  const contentHeight = termHeight - headerHeight - tabBarHeight - statusBarHeight;

  const leftPanelWidth = Math.max(20, Math.floor(termWidth * 0.2));
  const rightPanelWidth = termWidth - leftPanelWidth - 2;

  // Loading state
  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={LESSON_COLORS.header}>Loading concepts...</Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={LESSON_COLORS.failing}>Error: {error}</Text>
      </Box>
    );
  }

  // No config
  if (!config) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={LESSON_COLORS.failing}>No config provided</Text>
      </Box>
    );
  }

  const conceptsWithStatus = concepts.map(getConceptWithStatus);
  const currentConcept = selectedConcept
    ? getConceptWithStatus(selectedConcept)
    : null;

  // PROMPT.md overlay
  if (showPrompt && promptContent) {
    const lines = promptContent.split("\n").slice(0, termHeight - 4);
    return (
      <Box
        flexDirection="column"
        borderStyle="bold"
        borderColor={LESSON_COLORS.header}
        padding={1}
        width={termWidth}
        height={termHeight}
      >
        <Box marginBottom={1}>
          <Text bold color={LESSON_COLORS.header}>
            PROMPT.md
          </Text>
          <Text color={LESSON_COLORS.dim}> (press p or Esc to close)</Text>
        </Box>
        <Box flexDirection="column">
          {lines.map((line, i) => (
            <Text key={i} wrap="truncate">
              {line || " "}
            </Text>
          ))}
        </Box>
      </Box>
    );
  }

  // Test output overlay
  if (showTestOutput && output) {
    return (
      <Box
        flexDirection="column"
        width={termWidth}
        height={termHeight}
        padding={1}
      >
        <TestOutput
          output={output}
          passed={lastTestPassed}
          onClose={() => {
            setShowTestOutput(false);
            clearOutput();
          }}
        />
      </Box>
    );
  }

  // Get current tab content and title
  const getTabContent = () => {
    if (!currentConcept) return { title: "No concept selected", content: "" };
    switch (activeTab) {
      case "test":
        return { title: basename(currentConcept.testPath), content: currentConcept.testContent || "" };
      case "model":
        return { title: basename(currentConcept.modelPath), content: currentConcept.modelContent || "" };
      case "reasoning":
        return { title: basename(currentConcept.reasoningPath), content: currentConcept.reasoningContent || "" };
    }
  };

  const tabContent = getTabContent();

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        borderStyle="single"
        borderColor={LESSON_COLORS.header}
        paddingX={1}
      >
        <Text bold color={LESSON_COLORS.header}>
          {config.title || `Learning: ${basename(config.projectPath)}`}
        </Text>
        {running && (
          <Text color={LESSON_COLORS.pending}> [Running test...]</Text>
        )}
      </Box>

      {/* Main content */}
      <Box flexDirection="row" height={contentHeight + tabBarHeight}>
        {/* Left panel - Concept list */}
        <Box
          flexDirection="column"
          width={leftPanelWidth}
          borderStyle="single"
          borderColor={
            focusArea === "list" ? LESSON_COLORS.header : LESSON_COLORS.dim
          }
          paddingX={1}
        >
          <ConceptList
            concepts={conceptsWithStatus}
            selectedIndex={selectedIndex}
            focused={focusArea === "list"}
            maxHeight={contentHeight + tabBarHeight - 2}
          />
        </Box>

        {/* Right panel - Tab bar + Content pane */}
        <Box flexDirection="column" width={rightPanelWidth}>
          {/* Tab bar */}
          <Box paddingX={1} gap={2}>
            {(["test", "model", "reasoning"] as const).map((tab, idx) => (
              <Text
                key={tab}
                bold={activeTab === tab}
                color={activeTab === tab ? (tab === "test" ? "cyan" : tab === "model" ? "yellow" : "green") : LESSON_COLORS.dim}
                inverse={activeTab === tab}
              >
                {" "}{idx + 1}:{tab.toUpperCase()}{" "}
              </Text>
            ))}
            <Text color={LESSON_COLORS.dim}> (h/l or 1/2/3)</Text>
          </Box>

          {/* Single content pane */}
          <ContentPane
            type={activeTab}
            title={tabContent.title}
            content={tabContent.content}
            focused={focusArea === "content"}
            scrollOffset={scrollOffsets[activeTab]}
            maxHeight={contentHeight}
          />
        </Box>
      </Box>

      {/* Status bar */}
      <StatusBar
        concept={currentConcept}
        testRunning={running}
        focusedPane={focusArea === "list" ? "list" : activeTab}
      />
    </Box>
  );
}
