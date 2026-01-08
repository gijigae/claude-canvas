import { useState, useCallback } from "react";
import type { TestResult } from "../types";

export interface UseTestRunnerOptions {
  projectPath: string;
  onComplete?: (result: TestResult) => void;
}

export interface UseTestRunnerResult {
  running: boolean;
  output: string;
  runTest: (conceptId: string, testPath: string) => Promise<TestResult>;
  clearOutput: () => void;
}

export function useTestRunner(
  options: UseTestRunnerOptions
): UseTestRunnerResult {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");

  const runTest = useCallback(
    async (conceptId: string, testPath: string): Promise<TestResult> => {
      setRunning(true);
      setOutput("");

      const startTime = Date.now();

      const proc = Bun.spawn(["bun", "test", testPath], {
        cwd: options.projectPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      await proc.exited;

      const result: TestResult = {
        conceptId,
        passed: proc.exitCode === 0,
        output: stdout + (stderr ? `\n${stderr}` : ""),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };

      setOutput(result.output);
      setRunning(false);
      options.onComplete?.(result);

      return result;
    },
    [options.projectPath, options.onComplete]
  );

  const clearOutput = useCallback(() => {
    setOutput("");
  }, []);

  return { running, output, runTest, clearOutput };
}
