const STORAGE_KEY = "camino-ingles-progress-v1";

export type StageNote = {
  stageId: string;
  text: string;
  updatedAt: string;
};

export type ProgressState = {
  currentStageId: string | null;
  completedStageIds: string[];
  notes: StageNote[];
};

const defaultState: ProgressState = {
  currentStageId: "stage-1",
  completedStageIds: [],
  notes: [],
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadProgress(): ProgressState {
  if (!canUseStorage()) return { ...defaultState, notes: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, notes: [] };
    const parsed = JSON.parse(raw) as ProgressState;
    return {
      currentStageId: parsed.currentStageId ?? defaultState.currentStageId,
      completedStageIds: Array.isArray(parsed.completedStageIds)
        ? parsed.completedStageIds
        : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return { ...defaultState, notes: [] };
  }
}

export function saveProgress(state: ProgressState) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setCurrentStage(stageId: string): ProgressState {
  const state = loadProgress();
  const next = { ...state, currentStageId: stageId };
  saveProgress(next);
  return next;
}

export function toggleStageComplete(stageId: string): ProgressState {
  const state = loadProgress();
  const exists = state.completedStageIds.includes(stageId);
  const completedStageIds = exists
    ? state.completedStageIds.filter((id) => id !== stageId)
    : [...state.completedStageIds, stageId];
  const next = { ...state, completedStageIds };
  saveProgress(next);
  return next;
}

export function upsertNote(stageId: string, text: string): ProgressState {
  const state = loadProgress();
  const others = state.notes.filter((n) => n.stageId !== stageId);
  const notes =
    text.trim().length === 0
      ? others
      : [
          ...others,
          { stageId, text: text.trim(), updatedAt: new Date().toISOString() },
        ];
  const next = { ...state, notes };
  saveProgress(next);
  return next;
}

export function getNoteForStage(state: ProgressState, stageId: string) {
  return state.notes.find((n) => n.stageId === stageId)?.text ?? "";
}
