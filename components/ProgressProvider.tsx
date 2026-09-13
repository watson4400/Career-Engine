"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getNoteForStage,
  loadProgress,
  setCurrentStage,
  toggleStageComplete,
  upsertNote,
  type ProgressState,
} from "@/lib/progress";

type ProgressContextValue = {
  ready: boolean;
  state: ProgressState;
  isComplete: (stageId: string) => boolean;
  setCurrent: (stageId: string) => void;
  toggleComplete: (stageId: string) => void;
  saveNote: (stageId: string, text: string) => void;
  noteFor: (stageId: string) => string;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const emptyState: ProgressState = {
  currentStageId: "stage-1",
  completedStageIds: [],
  notes: [],
};

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() =>
    typeof window === "undefined" ? emptyState : loadProgress(),
  );
  const [ready] = useState(() => typeof window !== "undefined");

  const isComplete = useCallback(
    (stageId: string) => state.completedStageIds.includes(stageId),
    [state.completedStageIds],
  );

  const setCurrent = useCallback((stageId: string) => {
    setState(setCurrentStage(stageId));
  }, []);

  const toggleComplete = useCallback((stageId: string) => {
    setState(toggleStageComplete(stageId));
  }, []);

  const saveNote = useCallback((stageId: string, text: string) => {
    setState(upsertNote(stageId, text));
  }, []);

  const noteFor = useCallback(
    (stageId: string) => getNoteForStage(state, stageId),
    [state],
  );

  const value = useMemo(
    () => ({
      ready,
      state,
      isComplete,
      setCurrent,
      toggleComplete,
      saveNote,
      noteFor,
    }),
    [ready, state, isComplete, setCurrent, toggleComplete, saveNote, noteFor],
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used within ProgressProvider");
  }
  return ctx;
}
