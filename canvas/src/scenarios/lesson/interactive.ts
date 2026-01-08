import type { ScenarioDefinition } from "../types";
import type { LessonConfig, LessonResult } from "../../canvases/lesson/types";

export const lessonInteractiveScenario: ScenarioDefinition<
  LessonConfig,
  LessonResult
> = {
  name: "interactive",
  description: "Interactive lesson with test running and navigation",
  canvasKind: "lesson",
  interactionMode: "selection",
  closeOn: "command",
  defaultConfig: {
    projectPath: "",
  },
};
