import { OutPt } from "./OutPt";
export type HorzSegment = {
    leftOp?: OutPt;
    rightOp?: OutPt;
    leftToRight: boolean;
};
export declare const HorzSegSorter: (hs1?: HorzSegment, hs2?: HorzSegment) => 0 | 1 | -1;
