import { isNotNullish } from "../CommonUtils";
import { Point64 } from "./Point64";
import { PointD } from "./PointD";

export const isScalablePath = (obj: unknown): obj is IScalablePath =>
  isNotNullish(obj) &&
  "asScaledPathD" in obj &&
  typeof obj.asScaledPathD === "function" &&
  "asScaledPath64" in obj &&
  typeof obj.asScaledPath64 === "function";

export interface IScalablePath {
  asScaledPathD(scale: number): IterableIterator<PointD>;
  asScaledPath64(scale: number): IterableIterator<Point64>;
}
