import { test, expect, describe } from "vitest";
import { readFile } from "fs/promises";
import {
  Clipper,
  Clipper64,
  ClipType,
  FillRule,
  Paths64,
  Point64,
  PointInPolygonResult,
  PolyPath64,
  PolyTree64,
} from "../../src/clipper2lib";
import { TestCases } from "../Common/testCases";
import { pointInPolygon } from "../../src/Clipper";

const polyPath64ContainsChildren = (polypath: PolyPath64): boolean => {
  for (const child of polypath) {
    let outsideCnt = 0;

    for (const pt of (child as PolyPath64).polygon!) {
      const result = Clipper.pointInPolygon(pt, (child as PolyPath64).polygon!);

      if (result === PointInPolygonResult.IsInside) {
        outsideCnt--;
      } else if (result === PointInPolygonResult.IsOutside) {
        outsideCnt++;
      }

      if (outsideCnt > 1) {
        return false;
      } else if (outsideCnt < -1) {
        break;
      }
    }

    if (child.length > 0 && !polyPath64ContainsChildren(child as PolyPath64)) {
      return false;
    }
  }
  return true;
};

const checkPolytreeFullyContainsChildren = (polytree: PolyTree64): boolean => {
  for (const child of polytree) {
    if (child.length > 0 && !polyPath64ContainsChildren(child as PolyPath64)) {
      return false;
    }
  }
  return true;
};

const polyPathContainsPoint = (pp: PolyPath64, pt: Point64): number => {
  let counter = 0;
  if (pp.polygon!.length > 0) {
    if (pointInPolygon(pt, pp.polygon!) !== PointInPolygonResult.IsOutside) {
      if (pp.getIsHole()) {
        counter--;
      } else {
        counter++;
      }
    }
  }

  for (const child of pp) {
    counter += polyPathContainsPoint(child as PolyPath64, pt);
  }

  return counter;
};

const polytreeContainsPoint = (pp: PolyPath64, pt: Point64) => {
  let counter = 0;
  for (const child of pp) {
    counter += polyPathContainsPoint(child as PolyPath64, pt);
  }

  expect(counter).greaterThanOrEqual(0);

  return counter !== 0;
};

const getPolyPathArea = (pp: PolyPath64): number => {
  let resultArea = Clipper.area(pp.polygon!);
  for (const child of pp) {
    resultArea += getPolyPathArea(child as PolyPath64);
  }

  return resultArea;
};

const getPolytreeArea = (pp: PolyPath64): number => {
  let resultArea = 0;

  for (const child of pp) {
    resultArea += getPolyPathArea(child as PolyPath64);
  }

  return resultArea;
};

describe(
  "Polytree holes test",
  async () => {
    const polytreeHoleOwner = JSON.parse(
      (await readFile("./test/resource/PolytreeHoleOwner.json")).toString(),
    ) as TestCases;

    for (const testCase of polytreeHoleOwner) {
      test(testCase.caption, async () => {
        const clipper = new Clipper64();
        const solution = new PolyTree64();
        const solution_open = new Paths64();

        if (testCase.subjects?.type === "64") {
          for (const path of testCase.subjects.paths) {
            const subject = Clipper.makePath64(path);
            clipper.addSubject(subject);
          }
        }

        if (testCase.clips?.type === "64") {
          for (const path of testCase.clips.paths) {
            const clip = Clipper.makePath64(path);
            clipper.addClip(clip);
          }
        }

        clipper.execute(
          ClipType[testCase.clipType],
          FillRule[testCase.fillRule],
          solution,
          solution_open,
        );

        expect(checkPolytreeFullyContainsChildren(solution)).toBe(true);
      });
    }

    const polytreeHoleOwner2 = JSON.parse(
      (await readFile("./test/resource/PolytreeHoleOwner2.json")).toString(),
    ) as TestCases;

    for (const testCase of polytreeHoleOwner2) {
      test(testCase.caption, async () => {
        const clipper = new Clipper64();
        const subject = new Paths64();

        if (testCase.subjects?.type === "64") {
          for (const path of testCase.subjects.paths) {
            subject.directPush(Clipper.makePath64(path));
          }
        }

        const pointOfInterestOutside = Clipper.makePath64([
          21887, 10420, 21726, 10825, 21662, 10845, 21617, 10890,
        ]);

        for (const ptOutside of pointOfInterestOutside) {
          let outsideSubjectCount = 0;

          for (const path of subject) {
            if (
              Clipper.pointInPolygon(ptOutside, path) !==
              PointInPolygonResult.IsOutside
            ) {
              outsideSubjectCount++;
            }
          }

          expect(outsideSubjectCount).toBe(0);
        }

        const pointOfInterestInside = Clipper.makePath64([
          21887, 10430, 21843, 10520, 21810, 10686, 21900, 10461,
        ]);

        for (const ptInside of pointOfInterestInside) {
          let insideSubjectCount = 0;

          for (const path of subject) {
            if (
              Clipper.pointInPolygon(ptInside, path) !==
              PointInPolygonResult.IsOutside
            ) {
              insideSubjectCount++;
            }
          }

          expect(insideSubjectCount).toBe(1);
        }

        const solutionTree = new PolyTree64();
        const solution_open = new Paths64();

        clipper.addSubject(subject);

        clipper.execute(
          ClipType[testCase.clipType],
          FillRule[testCase.fillRule],
          solutionTree,
          solution_open,
        );

        const solutionPaths = Clipper.polyTreeToPaths64(solutionTree);

        expect(solutionPaths.length).not.toBe(0);

        const subjectArea = -Clipper.area(subject);
        const solutionTreeArea = getPolytreeArea(solutionTree);
        const solutionPathsArea = Clipper.area(solutionPaths);

        expect(solutionPathsArea).lessThan(subjectArea);

        expect(solutionPathsArea).greaterThan(subjectArea * 0.92);

        expect(solutionTreeArea).toBeCloseTo(solutionPathsArea, 0.0001);

        expect(checkPolytreeFullyContainsChildren(solutionTree)).toBe(true);

        for (const ptOutside of pointOfInterestOutside) {
          expect(polytreeContainsPoint(solutionTree, ptOutside)).toBe(false);
        }

        for (const ptInside of pointOfInterestInside) {
          expect(polytreeContainsPoint(solutionTree, ptInside)).toBe(true);
        }
      });
    }

    test("3. ", async () => {
      const clipper = new Clipper64();
      const subject = new Paths64();
      const clip = new Paths64();
      const solution = new PolyTree64();

      subject.push(
        Clipper.makePath64([
          1072, 501, 1072, 501, 1072, 539, 1072, 539, 1072, 539, 870, 539, 870,
          539, 870, 539, 870, 520, 894, 520, 898, 524, 911, 524, 915, 520, 915,
          520, 936, 520, 940, 524, 953, 524, 957, 520, 957, 520, 978, 520, 983,
          524, 995, 524, 1000, 520, 1021, 520, 1025, 524, 1038, 524, 1042, 520,
          1038, 516, 1025, 516, 1021, 520, 1000, 520, 995, 516, 983, 516, 978,
          520, 957, 520, 953, 516, 940, 516, 936, 520, 915, 520, 911, 516, 898,
          516, 894, 520, 870, 520, 870, 516, 870, 501, 870, 501, 870, 501, 1072,
          501,
        ]),
      );
      clip.push(Clipper.makePath64([870, 501, 971, 501, 971, 539, 870, 539]));
      clipper.addSubject(subject);
      clipper.addClip(clip);
      clipper.execute(ClipType.Intersection, FillRule.NonZero, solution);
      expect(solution.length).toBe(1);
      expect(solution.child(0).length).toBe(2);
    });

    test("4. ", async () => {
      const clipper = new Clipper64();
      const subject = new Paths64();
      const solution = new PolyTree64();

      subject.push(
        Clipper.makePath64([
          50, 500, 50, 300, 100, 300, 100, 350, 150, 350, 150, 250, 200, 250,
          200, 450, 350, 450, 350, 200, 400, 200, 400, 225, 450, 225, 450, 175,
          400, 175, 400, 200, 350, 200, 350, 175, 200, 175, 200, 250, 150, 250,
          150, 200, 100, 200, 100, 300, 50, 300, 50, 125, 500, 125, 500, 500,
        ]),
      );
      subject.push(
        Clipper.makePath64([250, 425, 250, 375, 300, 375, 300, 425]),
      );
      clipper.addSubject(subject);
      clipper.execute(ClipType.Union, FillRule.NonZero, solution);
      expect(solution.length).toBe(1);
      expect(solution.child(0).length).toBe(3);
    });

    test("5. ", async () => {
      const clipper = new Clipper64();
      const subject = new Paths64();
      const clip = new Paths64();
      const solution = new PolyTree64();

      subject.push(Clipper.makePath64([0, 30, 400, 30, 400, 100, 0, 100]));
      clip.push(Clipper.makePath64([20, 30, 30, 30, 30, 150, 20, 150]));
      clip.push(
        Clipper.makePath64([
          200, 0, 300, 0, 300, 30, 280, 30, 280, 20, 220, 20, 220, 30, 200, 30,
        ]),
      );
      clip.push(Clipper.makePath64([200, 50, 300, 50, 300, 80, 200, 80]));
      clipper.addSubject(subject);
      clipper.addClip(clip);
      clipper.execute(ClipType.Xor, FillRule.NonZero, solution);
      expect(solution.length).toBe(3);
      expect(solution.child(2).length).toBe(2);
    });

    test("6. ", async () => {
      const clipper = new Clipper64();
      const subject = new Paths64();
      const clip = new Paths64();
      const solution = new PolyTree64();

      subject.push(Clipper.makePath64([150, 50, 200, 50, 200, 100, 150, 100]));
      subject.push(
        Clipper.makePath64([125, 100, 150, 100, 150, 150, 125, 150]),
      );
      subject.push(Clipper.makePath64([225, 50, 300, 50, 300, 80, 225, 80]));
      subject.push(
        Clipper.makePath64([
          225, 100, 300, 100, 300, 150, 275, 150, 275, 175, 260, 175, 260, 250,
          235, 250, 235, 300, 275, 300, 275, 275, 300, 275, 300, 350, 225, 350,
        ]),
      );
      subject.push(
        Clipper.makePath64([300, 150, 350, 150, 350, 175, 300, 175]),
      );
      clip.push(Clipper.makePath64([0, 0, 400, 0, 400, 50, 0, 50]));
      clip.push(Clipper.makePath64([0, 100, 400, 100, 400, 150, 0, 150]));
      clip.push(Clipper.makePath64([260, 175, 325, 175, 325, 275, 260, 275]));
      clipper.addSubject(subject);
      clipper.addClip(clip);
      clipper.execute(ClipType.Xor, FillRule.NonZero, solution);
      expect(solution.length).toBe(3);
      expect(solution.child(2).length).toBe(1);
    });

    test("7. ", async () => {
      const clipper = new Clipper64();
      const subject = new Paths64();
      const solution = new PolyTree64();

      subject.push(
        Clipper.makePath64([
          0, 0, 100000, 0, 100000, 100000, 200000, 100000, 200000, 0, 300000, 0,
          300000, 200000, 0, 200000,
        ]),
      );
      subject.push(
        Clipper.makePath64([0, 0, 0, -100000, 250000, -100000, 250000, 0]),
      );
      clipper.addSubject(subject);
      clipper.execute(ClipType.Union, FillRule.NonZero, solution);
      expect(solution.length).toBe(1);
      expect(solution.child(0).length).toBe(1);
    });
  },
  { timeout: 1000 },
);
