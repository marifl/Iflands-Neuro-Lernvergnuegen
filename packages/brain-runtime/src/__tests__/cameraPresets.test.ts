import { describe, expect, it } from "vitest";
import {
  getPreset,
  listPresets,
  normalizePresetId,
  normalizePresetIds,
} from "../cameraPresets";

describe("camera presets", () => {
  it("exposes canonical namespaced preset ids", () => {
    const presets = listPresets();
    expect(presets.length).toBeGreaterThanOrEqual(8);
    expect(presets).toContain("shot:lateral-left");
    expect(presets).toContain("focus:pfc-hero");
    expect(presets).toContain("review:cranial-top");
    expect(presets).not.toContain("lateral-left-45");
  });

  it("normalizes legacy aliases to canonical ids", () => {
    expect(normalizePresetId("lateral-left-45")).toBe("shot:lateral-left");
    expect(normalizePresetId("hero-pfc")).toBe("focus:pfc-hero");
  });

  it("deduplicates normalized preset ids", () => {
    expect(normalizePresetIds(["shot:anterior", "anterior", "shot:anterior"])).toEqual(["shot:anterior"]);
  });

  it("legacy lateral-left alias still looks at origin from the left", () => {
    const p = getPreset("lateral-left-45");
    expect(p.position[0]).toBeLessThan(0);
    expect(p.target[0]).toBe(0);
  });

  it("unknown preset throws", () => {
    expect(() => normalizePresetId("nope" as never)).toThrow();
  });
});
