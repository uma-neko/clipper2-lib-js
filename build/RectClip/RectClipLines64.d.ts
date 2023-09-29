import { OutPt2 } from "./OutPt2";
import { RectClip64 } from "./RectClip64";
import { Paths64 } from "../Core/Paths64";
import type { IPath64 } from "../Core/IPath64";
export declare class RectClipLines64 extends RectClip64 {
    execute(paths: Paths64): Paths64;
    getPath(op: OutPt2 | undefined): IPath64;
    executeInternal(path: IPath64): void;
}
