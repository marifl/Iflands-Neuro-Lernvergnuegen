import { describe, expect, it } from "vitest";
import {
  CameraApiError,
  CameraSessionController,
  resolveAvailablePresetIds,
} from "../cameraSession";

describe("camera session controller", () => {
  it("returns canonical fallback presets when no figure-specific list exists", () => {
    const available = resolveAvailablePresetIds(undefined, "shot:lateral-left");
    expect(available).toContain("shot:lateral-left");
    expect(available).toContain("focus:pfc-hero");
    expect(available).not.toContain("lateral-left-45");
  });

  it("rejects goTo before a figure is hydrated", () => {
    const session = new CameraSessionController();
    expect(() => session.goTo("shot:anterior")).toThrowError(CameraApiError);
    expect(() => session.goTo("shot:anterior")).toThrowError(/not ready/);
  });

  it("hydrates a figure with canonical active and available preset ids", () => {
    const session = new CameraSessionController();
    const snapshot = session.hydrateFigure({
      figureId: "s04-scene",
      presetId: "hero-pfc",
      availablePresetIds: ["anterior", "hero-pfc"],
    });
    expect(snapshot.figureId).toBe("s04-scene");
    expect(snapshot.activePresetId).toBe("focus:pfc-hero");
    expect(snapshot.availablePresetIds).toEqual(["focus:pfc-hero", "shot:anterior"]);
  });

  it("rejects presets outside the available set", () => {
    const session = new CameraSessionController();
    session.hydrateFigure({
      figureId: "s04-scene",
      presetId: "hero-pfc",
      availablePresetIds: ["hero-pfc"],
    });
    expect(() => session.goTo("shot:anterior")).toThrowError(CameraApiError);
    expect(() => session.goTo("shot:anterior")).toThrowError(/not available/);
  });

  it("supersedes a pending transition when a new goTo arrives", async () => {
    const session = new CameraSessionController();
    session.hydrateFigure({
      figureId: "s04-scene",
      presetId: "hero-pfc",
      availablePresetIds: ["hero-pfc", "anterior", "posterior"],
    });

    const first = session.goTo("anterior");
    const second = session.goTo("posterior");

    await expect(first.promise).rejects.toMatchObject({ code: "superseded" });
    expect(second.requestId).not.toBeNull();
    expect(session.getSnapshot().activePresetId).toBe("shot:posterior");
    expect(session.getSnapshot().pendingTransitionId).toBe(second.requestId);
  });

  it("resolves and clears pending state on transition completion", async () => {
    const session = new CameraSessionController();
    session.hydrateFigure({
      figureId: "s04-scene",
      presetId: "hero-pfc",
      availablePresetIds: ["hero-pfc", "anterior"],
    });

    const next = session.goTo("anterior");
    expect(session.getSnapshot().pendingTransitionId).toBe(next.requestId);

    session.complete(next.requestId!);
    await expect(next.promise).resolves.toBeUndefined();
    expect(session.getSnapshot().pendingTransitionId).toBeNull();
    expect(session.getSnapshot().activePresetId).toBe("shot:anterior");
  });

  it("resolves immediately for an already-active preset when no transition is pending", async () => {
    const session = new CameraSessionController();
    session.hydrateFigure({
      figureId: "s-atlas-explore",
      presetId: "lateral-left-45",
      availablePresetIds: ["lateral-left-45"],
    });

    const result = session.goTo("shot:lateral-left");
    expect(result.requestId).toBeNull();
    await expect(result.promise).resolves.toBeUndefined();
    expect(result.snapshot.activePresetId).toBe("shot:lateral-left");
  });
});
