import { test, expect, describe } from "vitest";
import { Clipper, FillRule, Paths64 } from "../../src/clipper2lib";

describe(
  "Orientation test",
  async () => {
    test("1. ", async () => {
      const subjects = new Paths64();
      subjects.push(Clipper.makePath64([0, 0, 0, 100, 100, 100, 100, 0]));
      subjects.push(Clipper.makePath64([10, 10, 10, 110, 110, 110, 110, 10]));

      expect(Clipper.isPositive(subjects[0])).toBe(false);
      expect(Clipper.isPositive(subjects[1])).toBe(false);

      const clips = new Paths64();

      clips.push(Clipper.makePath64([50, 50, 50, 150, 150, 150, 150, 50]));

      expect(Clipper.isPositive(clips[0]));

      const solution = Clipper.union(subjects, clips, FillRule.Negative);
      expect(solution.length).toBe(1);
      expect(solution[0].length).eq(12);
    });
  },
  { timeout: 100 },
);
