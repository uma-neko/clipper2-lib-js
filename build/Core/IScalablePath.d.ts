import { IPath64 } from "./IPath64";
import { IPathD } from "./IPathD";
export declare const isScalablePath: (obj: unknown) => obj is IScalablePath;
export interface IScalablePath {
    asScaledPathD(scale: number): IPathD;
    asScaledPath64(scale: number): IPath64;
}
