import { ClipType, FillRule } from "../../src/clipper2lib";

export type TestCases = {
  caption: string;
  clipType: keyof typeof ClipType;
  fillRule: keyof typeof FillRule;
  solutionArea: number;
  toleranceAreaRatio: number;
  solutionCount: number;
  toleranceCountDiff: number;
  subjects:
    | {
        type: "64";
        paths: number[][];
      }
    | {
        type: "d";
        paths: string[][];
      };
  subjects_open:
    | {
        type: "64";
        paths: number[][];
      }
    | {
        type: "d";
        paths: string[][];
      };
  clips:
    | {
        type: "64";
        paths: number[][];
      }
    | {
        type: "d";
        paths: string[][];
      };
}[];
