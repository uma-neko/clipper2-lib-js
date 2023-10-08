import { test, expect, describe } from "vitest";
import {
  Clipper,
  ClipperOffset,
  EndType,
  JoinType,
  Paths64,
} from "../../src/clipper2lib";

describe(
  "Offsets orientation test",
  async () => {
    test("1. ", async () => {
      const input = Clipper.makePath64([0, 0, 0, 5, 5, 5, 5, 0]);

      const co = new ClipperOffset();

      co.addPath(input, JoinType.Round, EndType.Polygon);

      const outputs: Paths64 = new Paths64();

      co.execute(1, outputs);

      expect(outputs.length).toBe(1);
      expect(Clipper.isPositive(input)).eq(Clipper.isPositive(outputs[0]));
    });
  },
  { timeout: 100 },
);
