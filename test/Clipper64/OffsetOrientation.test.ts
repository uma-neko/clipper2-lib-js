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
      const sub = new Paths64();
      sub.push(Clipper.makePath64([0, 0, 0, 5, 5, 5, 5, 0]));

      const sol = Clipper.inflatePaths(sub, 1, JoinType.Round, EndType.Polygon);

      expect(sol.length).toBe(1);
      expect(Clipper.isPositive(sub[0])).eq(Clipper.isPositive(sol[0]));
    });

    test("2. ", async () => {
      const sub = new Paths64();
      sub.push(Clipper.makePath64([20, 220, 280, 220, 280, 280, 20, 280]));
      sub.push(Clipper.makePath64([0, 200, 0, 300, 300, 300, 300, 200]));

      const co = new ClipperOffset();
      co.reverseSolution = true;

      co.addPaths(sub, JoinType.Round, EndType.Polygon);

      const sol: Paths64 = new Paths64();

      co.execute(1, sol);

      expect(sol.length).toBe(2);
      expect(Clipper.isPositive(sub[1])).eq(!Clipper.isPositive(sol[0]));
    });
  },
  { timeout: 100 },
);
