import { describe, expect, it } from "vitest";
import { createDemoHouse } from "@/engine/demo-house";
import { validateModel } from "@/engine/operations";
import { validateBuildingContinuity } from "@/engine/architecture-checks";

describe("Coherent demo house", () => {
  it("has valid openings and non-overlapping rooms", () => {
    expect(() => validateModel(createDemoHouse())).not.toThrow();
    expect(() => validateBuildingContinuity(createDemoHouse())).not.toThrow();
  });
  it("rejects floating floors and disconnected room layouts", () => {
    const floating = createDemoHouse();
    const upper = floating.levels["level-1"];
    if (upper) upper.elevation = 5;
    expect(() => validateBuildingContinuity(floating)).toThrow("float");
    const disconnected = createDemoHouse();
    const living = disconnected.rooms["room-living"];
    if (living) living.x = -15;
    expect(() => validateBuildingContinuity(disconnected)).toThrow("disconnected");
  });
  it("has connected rooms with shared walls and supported upper floors", () => {
    const model = createDemoHouse();
    const ground = Object.values(model.rooms).filter((r) => r.levelId === "level-0");
    for (const room of Object.values(model.rooms)) {
      expect(room.wallIds.some((id) => (model.walls[id]?.roomIds.length ?? 0) === 2)).toBe(true);
      if (room.levelId === "level-1") expect(ground.some((r) => r.x === room.x && r.z === room.z && r.width === room.width && r.length === room.length)).toBe(true);
    }
  });
});