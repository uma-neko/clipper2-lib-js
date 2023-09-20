import { test, expect, describe } from "vitest";
import { readFile } from "fs/promises";
import {
  Clipper,
  Clipper64,
  ClipType,
  FillRule,
  Paths64,
} from "../../src/clipper2lib";
import { TestCases } from "../Common/testCases";

describe(
  "Polygons test",
  async () => {
    const testCases = JSON.parse(
      (await readFile("./test/resource/polygons.json")).toString(),
    ) as TestCases;

    for (const testCase of testCases) {
      test(testCase.caption, async () => {
        const clipper = new Clipper64();
        const solution = new Paths64();

        if (testCase.subjects?.type === "64") {
          for (const path of testCase.subjects.paths) {
            const subject = Clipper.makePath64(path);
            clipper.addSubject(subject);
          }
        }

        if (testCase.clips?.type === "64") {
          for (const path of testCase.clips.paths) {
            const subject = Clipper.makePath64(path);
            clipper.addClip(subject);
          }
        }

        clipper.execute(
          ClipType[testCase.clipType],
          FillRule[testCase.fillRule],
          solution,
        );
        const mesuredCount = solution.length;
        const mesuredArea = Clipper.area(solution);
        const solutionArea = testCase.solutionArea;
        const solutionCount = testCase.solutionCount;
        const toleranceCountDiff = testCase.toleranceCountDiff;
        const toleranceAreaRatio = testCase.toleranceAreaRatio;
        const countDiff = Math.abs(solutionCount - mesuredCount);
        const areaDiff = Math.abs(solutionArea - mesuredArea);
        const areaRatio = solutionArea <= 0 ? 0 : areaDiff / solutionArea;
        expect(
          countDiff,
          `count:{mesured:${mesuredCount}, solution:${solutionCount}}`,
        ).toBeLessThanOrEqual(toleranceCountDiff);
        expect(
          areaRatio,
          `area:{mesured:${mesuredArea}, solution:${solutionArea}}`,
        ).toBeLessThanOrEqual(toleranceAreaRatio);
      });
    }
  },
  { timeout: 10 },
);
