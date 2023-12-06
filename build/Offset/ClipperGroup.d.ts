import { EndType, JoinType } from "./OffsetEnums";
import { Paths64 } from "../Core/Paths64";
import { Rect64 } from "../Core/Rect64";
export declare class ClipperGroup {
    inPaths: Paths64;
    boundsList: Rect64[];
    isHoleList: boolean[];
    joinType: JoinType;
    endType: EndType;
    pathsReversed: boolean;
    lowestPathIdx: number;
    constructor(paths: Paths64, joinType: JoinType, endType?: EndType);
}
