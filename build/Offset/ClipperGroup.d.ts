import { EndType, JoinType } from "./OffsetEnums";
import { Paths64 } from "../Core/Paths64";
import type { IPath64 } from "../Core/IPath64";
export declare class ClipperGroup {
    inPaths: Paths64;
    outPath: IPath64;
    outPaths: Paths64;
    joinType: JoinType;
    endType: EndType;
    pathsReversed: boolean;
    constructor(paths: Paths64, joinType: JoinType, endType?: EndType);
}
