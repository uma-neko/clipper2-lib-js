import { Active } from "./Active";
import { OutPt } from "./OutPt";
import { PolyPathBase } from "./PolyPathBase";
import { Rect64 } from "../Core/Rect64";
import { IPath64 } from "../Core/IPath64";
export type OutRec = {
    idx: number;
    owner?: OutRec;
    frontEdge?: Active;
    backEdge?: Active;
    pts?: OutPt;
    polypath?: PolyPathBase;
    bounds: Rect64;
    path: IPath64;
    isOpen: boolean;
    splits?: number[];
    recursiveSplit?: OutRec;
};
