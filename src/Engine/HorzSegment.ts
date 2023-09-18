import { OutPt } from "./OutPt";

export type HorzSegment = {
  leftOp?: OutPt;
  rightOp?: OutPt;
  leftToRight: boolean;
};

export const HorzSegSorter = (hs1?: HorzSegment, hs2?: HorzSegment) => {
  if (hs1 === undefined || hs2 === undefined) {
    return 0;
  } else if (hs1.rightOp === undefined) {
    return hs2.rightOp === undefined ? 0 : 1;
  } else if (hs2.rightOp === undefined) {
    return -1;
  } else {
    return hs1.leftOp!.pt.x === hs2.leftOp!.pt.x
      ? 0
      : hs1.leftOp!.pt.x > hs2.leftOp!.pt.x
      ? 1
      : -1;
  }
};
