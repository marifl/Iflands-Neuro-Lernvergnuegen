import { listPresets, normalizePresetId, normalizePresetIds } from "./cameraPresets";

export type CameraApiErrorCode =
  | "scene-not-ready"
  | "unknown-preset"
  | "preset-not-available"
  | "superseded";

export class CameraApiError extends Error {
  readonly code: CameraApiErrorCode;

  constructor(code: CameraApiErrorCode, message: string) {
    super(message);
    this.name = "CameraApiError";
    this.code = code;
  }
}

export interface CameraSessionSnapshot {
  figureId: string | null;
  activePresetId: string | null;
  availablePresetIds: string[];
  pendingTransitionId: string | null;
}

export interface CameraGoToResult {
  requestId: string | null;
  presetId: string;
  promise: Promise<void>;
  snapshot: CameraSessionSnapshot;
}

interface PendingTransition {
  requestId: string;
  presetId: string;
  resolve: () => void;
  reject: (error: CameraApiError) => void;
}

let requestSeq = 0;

function apiError(code: CameraApiErrorCode, message: string): CameraApiError {
  return new CameraApiError(code, message);
}

function resolveKnownPresetId(id: string): string {
  try {
    return normalizePresetId(id);
  } catch {
    throw apiError("unknown-preset", `unknown camera preset: ${id}`);
  }
}

export function resolveAvailablePresetIds(
  availablePresetIds?: string[],
  activePresetId?: string,
): string[] {
  const normalized = availablePresetIds?.length
    ? normalizePresetIds(availablePresetIds)
    : listPresets();
  return [...new Set(activePresetId ? [activePresetId, ...normalized] : normalized)];
}

export class CameraSessionController {
  private snapshot: CameraSessionSnapshot = {
    figureId: null,
    activePresetId: null,
    availablePresetIds: [],
    pendingTransitionId: null,
  };

  private pending: PendingTransition | null = null;

  getSnapshot(): CameraSessionSnapshot {
    return {
      ...this.snapshot,
      availablePresetIds: [...this.snapshot.availablePresetIds],
    };
  }

  beginFigureLoad(): CameraSessionSnapshot {
    this.rejectPending("superseded", "camera transition superseded by figure change");
    this.snapshot = {
      figureId: null,
      activePresetId: null,
      availablePresetIds: [],
      pendingTransitionId: null,
    };
    return this.getSnapshot();
  }

  hydrateFigure(opts: {
    figureId: string;
    presetId: string;
    availablePresetIds?: string[];
  }): CameraSessionSnapshot {
    const activePresetId = resolveKnownPresetId(opts.presetId);
    const availablePresetIds = resolveAvailablePresetIds(opts.availablePresetIds, activePresetId);
    this.rejectPending("superseded", `camera transition superseded by figure '${opts.figureId}'`);
    this.snapshot = {
      figureId: opts.figureId,
      activePresetId,
      availablePresetIds,
      pendingTransitionId: null,
    };
    return this.getSnapshot();
  }

  goTo(requestedPresetId: string): CameraGoToResult {
    if (!this.snapshot.figureId || !this.snapshot.activePresetId) {
      throw apiError("scene-not-ready", "camera scene is not ready");
    }

    const presetId = resolveKnownPresetId(requestedPresetId);
    if (!this.snapshot.availablePresetIds.includes(presetId)) {
      throw apiError("preset-not-available", `preset '${presetId}' is not available for this figure`);
    }

    if (presetId === this.snapshot.activePresetId && !this.pending) {
      return {
        requestId: null,
        presetId,
        promise: Promise.resolve(),
        snapshot: this.getSnapshot(),
      };
    }

    this.rejectPending("superseded", `camera transition superseded by '${presetId}'`);

    const requestId = `cam-${++requestSeq}`;
    let resolve!: () => void;
    let reject!: (error: CameraApiError) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej as (error: CameraApiError) => void;
    });

    this.pending = { requestId, presetId, resolve, reject };
    this.snapshot = {
      ...this.snapshot,
      activePresetId: presetId,
      pendingTransitionId: requestId,
    };

    return {
      requestId,
      presetId,
      promise,
      snapshot: this.getSnapshot(),
    };
  }

  complete(requestId: string): CameraSessionSnapshot {
    if (!this.pending || this.pending.requestId !== requestId) {
      return this.getSnapshot();
    }
    this.pending.resolve();
    this.pending = null;
    this.snapshot = {
      ...this.snapshot,
      pendingTransitionId: null,
    };
    return this.getSnapshot();
  }

  dispose(): CameraSessionSnapshot {
    this.rejectPending("superseded", "camera scene unmounted");
    this.snapshot = {
      figureId: null,
      activePresetId: null,
      availablePresetIds: [],
      pendingTransitionId: null,
    };
    return this.getSnapshot();
  }

  private rejectPending(code: CameraApiErrorCode, message: string) {
    if (!this.pending) return;
    this.pending.reject(apiError(code, message));
    this.pending = null;
    this.snapshot = {
      ...this.snapshot,
      pendingTransitionId: null,
    };
  }
}
