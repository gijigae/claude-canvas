import type { ScenarioDefinition } from "../types";
import type { LessonConfig } from "../../canvases/lesson/types";

export const lessonDisplayScenario: ScenarioDefinition<LessonConfig, void> = {
  name: "display",
  description: "View-only lesson overview",
  canvasKind: "lesson",
  interactionMode: "view-only",
  closeOn: "escape",
  defaultConfig: {
    projectPath: "",
  },
};
