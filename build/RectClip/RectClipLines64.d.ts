import { OutPt2 } from "./OutPt2";
import { RectClip64 } from "./RectClip64";
import { Path64 } from "../Core/Path64";
import { Paths64 } from "../Core/Paths64";
export declare class RectClipLines64 extends RectClip64 {
    execute(paths: Paths64): Paths64;
    getPath(op: OutPt2 | undefined): Path64;
    executeInternal(path: Path64): void;
}
