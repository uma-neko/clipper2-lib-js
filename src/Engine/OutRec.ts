import { Active } from "./Active";
import { OutPt } from "./OutPt";
import { PolyPathBase } from "./PolyPathBase";
import { Rect64 } from "../Core/Rect64";
import { Path64Base } from "../Core/Path64Base";

export type OutRec = {
  idx: number;
  owner?: OutRec;
  frontEdge?: Active;
  backEdge?: Active;
  pts?: OutPt;
  polypath?: PolyPathBase;
  bounds: Rect64;
  path: Path64Base;
  isOpen: boolean;
  splits?: number[];
  recursiveSplit?: OutRec;
};
