import { test, expect, describe } from "vitest";
import { Clipper, Point64, IPath64 } from "../../src/clipper2lib";

const distanceSqr = (pt1: Point64, pt2: Point64) => {
  return (pt1.x - pt2.x) * (pt1.x - pt2.x) + (pt1.y - pt2.y) * (pt1.y - pt2.y);
};

const distance = (pt1: Point64, pt2: Point64) => {
  return Math.sqrt(Number(distanceSqr(pt1, pt2)));
};

const length = (path: IPath64, isClosedPath = false) => {
  let result = 0;
  if (path.length < 2) {
    return 0;
  }

  for (let i = 0; i < path.length - 1; i++) {
    result += distance(path.getClone(i), path.getClone(i + 1));
  }

  if (isClosedPath) {
    result += distance(path.getClone(path.length - 1), path.getClone(0));
  }

  return result;
};

describe(
  "SimplifyPath test",
  async () => {
    test("1. ", async () => {
      const path = Clipper.makePath64([
        0, 0, 1, 1, 0, 20, 0, 21, 1, 40, 0, 41, 0, 60, 0, 61, 0, 80, 1, 81, 0,
        100,
      ]);
      const sol = Clipper.simplifyPath(path, 2, false);

      expect(length(sol)).eq(100);
      expect(sol.length).eq(2);
    });
  },
  { timeout: 10 },
);
