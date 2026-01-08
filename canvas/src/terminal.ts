import { spawn, spawnSync } from "child_process";

export type MultiplexerType = "tmux" | "zellij" | "none";

export interface TerminalEnvironment {
  inTmux: boolean;
  inZellij: boolean;
  multiplexer: MultiplexerType;
  summary: string;
}

export function detectTerminal(): TerminalEnvironment {
  const inTmux = !!process.env.TMUX;
  const inZellij = !!process.env.ZELLIJ || !!process.env.ZELLIJ_SESSION_NAME;

  let multiplexer: MultiplexerType = "none";
  let summary = "no multiplexer";

  if (inTmux) {
    multiplexer = "tmux";
    summary = "tmux";
  } else if (inZellij) {
    multiplexer = "zellij";
    summary = "zellij";
  }

  return { inTmux, inZellij, multiplexer, summary };
}

export interface SpawnResult {
  method: string;
  pid?: number;
}

export interface SpawnOptions {
  socketPath?: string;
  scenario?: string;
}

export async function spawnCanvas(
  kind: string,
  id: string,
  configJson?: string,
  options?: SpawnOptions
): Promise<SpawnResult> {
  const env = detectTerminal();

  if (env.multiplexer === "none") {
    throw new Error(
      "Canvas requires a terminal multiplexer (tmux or zellij). " +
        "Please run inside a tmux or zellij session."
    );
  }

  // Get the directory of this script (skill directory)
  const scriptDir = import.meta.dir.replace("/src", "");
  const runScript = `${scriptDir}/run-canvas.sh`;

  // Auto-generate socket path for IPC if not provided
  const socketPath = options?.socketPath || `/tmp/canvas-${id}.sock`;

  // Build the command to run
  let command = `${runScript} show ${kind} --id ${id}`;
  if (configJson) {
    // Write config to a temp file to avoid shell escaping issues
    const configFile = `/tmp/canvas-config-${id}.json`;
    await Bun.write(configFile, configJson);
    command += ` --config "$(cat ${configFile})"`;
  }
  command += ` --socket ${socketPath}`;
  if (options?.scenario) {
    command += ` --scenario ${options.scenario}`;
  }

  let result: boolean;

  if (env.multiplexer === "tmux") {
    result = await spawnTmux(command);
  } else {
    result = await spawnZellij(command);
  }

  if (result) {
    return { method: env.multiplexer };
  }

  throw new Error(`Failed to spawn ${env.multiplexer} pane`);
}

// File to track the canvas pane ID (tmux)
const TMUX_PANE_FILE = "/tmp/claude-canvas-pane-id";
// File to track canvas pane existence (zellij) - stores timestamp
const ZELLIJ_PANE_FILE = "/tmp/claude-canvas-zellij-pane";

async function getCanvasPaneId(): Promise<string | null> {
  try {
    const file = Bun.file(TMUX_PANE_FILE);
    if (await file.exists()) {
      const paneId = (await file.text()).trim();
      // Verify the pane still exists by checking if tmux can find it
      const result = spawnSync("tmux", ["display-message", "-t", paneId, "-p", "#{pane_id}"]);
      const output = result.stdout?.toString().trim();
      // Pane exists only if command succeeds AND returns the same pane ID
      if (result.status === 0 && output === paneId) {
        return paneId;
      }
      // Stale pane reference - clean up the file
      await Bun.write(TMUX_PANE_FILE, "");
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveCanvasPaneId(paneId: string): Promise<void> {
  await Bun.write(TMUX_PANE_FILE, paneId);
}

async function createNewPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Use split-window -h for vertical split (side by side)
    // -p 67 gives canvas 2/3 width (1:2 ratio, Claude:Canvas)
    // -P -F prints the new pane ID so we can save it
    const args = ["split-window", "-h", "-p", "67", "-P", "-F", "#{pane_id}", command];
    const proc = spawn("tmux", args);
    let paneId = "";
    proc.stdout?.on("data", (data) => {
      paneId += data.toString();
    });
    proc.on("close", async (code) => {
      if (code === 0 && paneId.trim()) {
        await saveCanvasPaneId(paneId.trim());
      }
      resolve(code === 0);
    });
    proc.on("error", () => resolve(false));
  });
}

async function reuseExistingPane(paneId: string, command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Send Ctrl+C to interrupt any running process
    const killProc = spawn("tmux", ["send-keys", "-t", paneId, "C-c"]);
    killProc.on("close", () => {
      // Wait for process to terminate before sending new command
      setTimeout(() => {
        // Clear the terminal and run the new command
        const args = ["send-keys", "-t", paneId, `clear && ${command}`, "Enter"];
        const proc = spawn("tmux", args);
        proc.on("close", (code) => resolve(code === 0));
        proc.on("error", () => resolve(false));
      }, 150);
    });
    killProc.on("error", () => resolve(false));
  });
}

async function spawnTmux(command: string): Promise<boolean> {
  // Check if we have an existing canvas pane to reuse
  const existingPaneId = await getCanvasPaneId();

  if (existingPaneId) {
    // Try to reuse existing pane
    const reused = await reuseExistingPane(existingPaneId, command);
    if (reused) {
      return true;
    }
    // Reuse failed (pane may have been closed) - clear stale reference and create new
    await Bun.write(TMUX_PANE_FILE, "");
  }

  // Create a new split pane
  return createNewPane(command);
}

// ============ Zellij Functions ============

async function getZellijCanvasPaneExists(): Promise<boolean> {
  try {
    const file = Bun.file(ZELLIJ_PANE_FILE);
    if (await file.exists()) {
      const timestamp = (await file.text()).trim();
      if (!timestamp) return false;
      const markerTime = parseInt(timestamp, 10);
      const now = Date.now();
      // Consider pane valid if marker is less than 24 hours old
      if (now - markerTime < 24 * 60 * 60 * 1000) {
        return true;
      }
    }
  } catch {
    // Ignore errors
  }
  return false;
}

async function saveZellijPaneMarker(): Promise<void> {
  await Bun.write(ZELLIJ_PANE_FILE, Date.now().toString());
}

async function clearZellijPaneMarker(): Promise<void> {
  await Bun.write(ZELLIJ_PANE_FILE, "");
}

async function createZellijPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Create pane to the right
    const args = [
      "action",
      "new-pane",
      "--direction",
      "right",
      "--",
      "sh",
      "-c",
      command,
    ];

    const proc = spawn("zellij", args);
    proc.on("close", async (code) => {
      if (code === 0) {
        await saveZellijPaneMarker();
        // Return focus to the original pane (left)
        const focusProc = spawn("zellij", ["action", "move-focus", "left"]);
        focusProc.on("close", () => resolve(true));
        focusProc.on("error", () => resolve(true)); // Still succeeded in creating pane
      } else {
        resolve(false);
      }
    });
    proc.on("error", () => resolve(false));
  });
}

async function reuseZellijPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Move focus to canvas pane (right)
    const focusProc = spawn("zellij", ["action", "move-focus", "right"]);

    focusProc.on("close", (focusCode) => {
      if (focusCode !== 0) {
        resolve(false);
        return;
      }

      // Send Ctrl+C (byte 3) to interrupt
      const ctrlCProc = spawn("zellij", ["action", "write", "3"]);

      ctrlCProc.on("close", () => {
        setTimeout(() => {
          // Clear screen and run new command
          const clearAndRun = `clear && ${command}`;
          const writeProc = spawn("zellij", ["action", "write-chars", clearAndRun]);

          writeProc.on("close", () => {
            // Send Enter key (byte 13)
            const enterProc = spawn("zellij", ["action", "write", "13"]);

            enterProc.on("close", () => {
              // Return focus to original pane
              const returnFocusProc = spawn("zellij", ["action", "move-focus", "left"]);
              returnFocusProc.on("close", () => resolve(true));
              returnFocusProc.on("error", () => resolve(true));
            });
            enterProc.on("error", () => resolve(false));
          });
          writeProc.on("error", () => resolve(false));
        }, 150); // Same delay as tmux implementation
      });
      ctrlCProc.on("error", () => resolve(false));
    });
    focusProc.on("error", () => resolve(false));
  });
}

async function spawnZellij(command: string): Promise<boolean> {
  // Check if we have an existing canvas pane
  const paneExists = await getZellijCanvasPaneExists();

  if (paneExists) {
    // Try to reuse existing pane
    const reused = await reuseZellijPane(command);
    if (reused) {
      return true;
    }
    // Reuse failed - clear marker and create new
    await clearZellijPaneMarker();
  }

  // Create a new split pane
  return createZellijPane(command);
}

