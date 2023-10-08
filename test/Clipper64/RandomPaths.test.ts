import { test, expect, describe } from "vitest";
import {
  Clipper,
  Clipper64,
  ClipType,
  FillRule,
  Path64TypedArray,
  Paths64,
  PolyTree64,
} from "../../src/clipper2lib";

const generateRandomInt = (minValue: number, maxValue: number) => {
  if (minValue === maxValue) {
    return minValue;
  }

  const diff =
    maxValue - minValue > 0 ? maxValue - minValue + 1 : maxValue - minValue - 1;

  return minValue + Math.trunc(diff * Math.random());
};

const generateRandomPaths = (minPathCount: number, maxComplexity: number) => {
  const pathCount = generateRandomInt(minPathCount, maxComplexity);

  const result = new Paths64();

  for (let index = 0; index < pathCount; index++) {
    const minPointCount = 0;
    const pathLength = generateRandomInt(
      minPointCount,
      minPointCount > maxComplexity ? minPointCount : maxComplexity,
    );

    const path = new Path64TypedArray(pathLength);

    let prevX = 0n;
    let prevY = 0n;

    for (let pt = 0; pt < pathLength; pt++) {
      if (result.length === 0) {
        prevX = BigInt(generateRandomInt(-maxComplexity, maxComplexity * 2));
        prevY = BigInt(generateRandomInt(-maxComplexity, maxComplexity * 2));
      } else {
        prevX += BigInt(generateRandomInt(-5, 5));
        prevY += BigInt(generateRandomInt(-5, 5));
      }
      path.pushDecomposed(prevX, prevY);
    }
    result.push(path);
  }

  return result;
};

describe(
  "Random paths test",
  async () => {
    test("1. ", async () => {
      for (let i = 0; i < 750; i++) {
        const maxComplexity = Math.ceil(i === 0 ? 1 : i / 10);

        const clipper = new Clipper64();
        const clipperPolytree = new Clipper64();
        const subject = generateRandomPaths(1, maxComplexity);
        const subjectOpen = generateRandomPaths(0, maxComplexity);
        const clip = generateRandomPaths(0, maxComplexity);

        const ct: ClipType = generateRandomInt(0, 4) as ClipType;
        const fr: FillRule = generateRandomInt(0, 3) as FillRule;
        const solution = new Paths64();
        const solutionOpen = new Paths64();
        const solutionTree = new PolyTree64();
        const solutionTreeOpen = new Paths64();

        clipper.addSubject(subject);
        clipper.addOpenSubject(subjectOpen);
        clipper.addClip(clip);
        clipper.execute(ct, fr, solution, solutionOpen);

        const areaPaths = Clipper.area(solution);

        clipperPolytree.addSubject(subject);
        clipperPolytree.addOpenSubject(subjectOpen);
        clipperPolytree.addClip(clip);
        clipper.execute(ct, fr, solutionTree, solutionTreeOpen);
        const solutionPolytreePath = Clipper.polyTreeToPaths64(solutionTree);

        const areaPolytree = Clipper.area(solutionPolytreePath);

        expect(areaPaths).eq(areaPolytree);
      }
    });
  },
  { timeout: 1000 },
);
