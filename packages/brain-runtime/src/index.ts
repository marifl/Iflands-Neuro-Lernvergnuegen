export * from "./coords";
export * from "./cameraPresets";
export * from "./cameraSession";

export function createRuntimeMarker(hostName: string): string {
  return `runtime:${hostName}`;
}
