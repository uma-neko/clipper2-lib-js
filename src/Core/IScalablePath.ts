import { isNotNullish } from "../CommonUtils";
import { Path64Base } from "./Path64Base";
import { PathDBase } from "./PathDBase";

export const isScalablePath = (obj: unknown): obj is IScalablePath =>
  isNotNullish(obj) &&
  "asScaledPathD" in obj &&
  typeof obj.asScaledPathD === "function" &&
  "asScaledPath64" in obj &&
  typeof obj.asScaledPath64 === "function";

export interface IScalablePath {
  asScaledPathD(scale: number): PathDBase;
  asScaledPath64(scale: number): Path64Base;
}
