import { test, expect, describe } from "vitest";
import {
  Clipper,
  Clipper64,
  ClipType,
  FillRule,
  Paths64,
  PolyTree64,
} from "../../src/clipper2lib";

describe(
  "Polytree union test",
  async () => {
    test("1. ", async () => {
      const clipper = new Clipper64();
      const subject = new Paths64();
      const solution = new PolyTree64();
      const solutionOpen = new Paths64();

      subject.push(Clipper.makePath64([0, 0, 0, 5, 5, 5, 5, 0]));
      subject.push(Clipper.makePath64([1, 1, 1, 6, 6, 6, 6, 1]));
      clipper.addSubject(subject);

      if (Clipper.isPositive(subject[0])) {
        clipper.execute(
          ClipType.Union,
          FillRule.Positive,
          solution,
          solutionOpen,
        );
      } else {
        clipper.reverseSolution = true;
        clipper.execute(
          ClipType.Union,
          FillRule.Negative,
          solution,
          solutionOpen,
        );
      }

      expect(solutionOpen.length).toBe(0);
      expect.soft(solution.length).toBe(1);
      expect(solution.child(0).polygon!.length).toBe(8);
      expect(Clipper.isPositive(subject[0])).toBe(
        Clipper.isPositive(solution.child(0).polygon!),
      );
    });
  },
  { timeout: 1000 },
);
