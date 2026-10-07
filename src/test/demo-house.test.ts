import { describe, expect, it } from "vitest";
import { createDemoHouse } from "@/engine/demo-house";
import { validateModel } from "@/engine/operations";

describe("Coherent demo house", () => {
  it("has valid openings and non-overlapping rooms", () => {
    expect(() => validateModel(createDemoHouse())).not.toThrow();
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