import { isNotNullish } from "../CommonUtils";
import { IPath64 } from "./IPath64";
import { IPathD } from "./IPathD";

export const isScalablePath = (obj: unknown): obj is IScalablePath =>
  isNotNullish(obj) &&
  "asScaledPathD" in obj &&
  typeof obj.asScaledPathD === "function" &&
  "asScaledPath64" in obj &&
  typeof obj.asScaledPath64 === "function";

export interface IScalablePath {
  asScaledPathD(scale: number): IPathD;
  asScaledPath64(scale: number): IPath64;
}
