import { Active } from "./Active";
import { addPathsToVertexList } from "./ClipperEngine";
import { JoinWith, PointInPolygonResult, VertexFlags } from "./EngineEnums";
import { HorzJoin } from "./HorzJoin";
import { HorzSegSorter, HorzSegment } from "./HorzSegment";
import { IntersectNode, IntersectNodeSorter } from "./IntersectNode";
import { locMinSorter, LocalMinima } from "./LocalMinima";
import { OutPt } from "./OutPt";
import { OutRec } from "./OutRec";
import { PolyPathBase } from "./PolyPathBase";
import { Vertex } from "./Vertex";
import { perpendicDistFromLineSqrd } from "../Clipper";
import { ClipType, FillRule, PathType } from "../Core/CoreEnums";
import {
  crossProduct,
  dotProduct,
  getClosestPtOnSegment,
  getIntersectPoint,
  pointInPolygon,
  segsIntersect,
} from "../Core/InternalClipper";
import { Path64 } from "../Core/Path64";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
import { Rect64 } from "../Core/Rect64";

const isOdd = (val: number) => {
  return (val & 1) !== 0;
};

const isHotEdge = (ae: Active) => {
  return ae.outrec !== undefined;
};

const isOpen = (ae: Active) => {
  return ae.localMin.isOpen;
};

type IsOpenEnd = {
  (ae: Active): boolean;
  (v: Vertex): boolean;
};

const isOpenEnd: IsOpenEnd = (aeOrV: Active | Vertex) => {
  if ("localMin" in aeOrV) {
    return aeOrV.localMin.isOpen && isOpenEnd(aeOrV.vertexTop!);
  }
  return (
    (aeOrV.flags & (VertexFlags.OpenStart | VertexFlags.OpenEnd)) !==
    VertexFlags.None
  );
};

const getPrevHotEdge = (ae: Active) => {
  let prev = ae.prevInAEL;
  while (prev !== undefined && (isOpen(prev) || !isHotEdge(prev))) {
    prev = prev.prevInAEL;
  }
  return prev;
};

const isFront = (ae: Active) => {
  return ae === ae.outrec!.frontEdge;
};

const getDx = (pt1: Point64, pt2: Point64): number => {
  const dy = pt2.y - pt1.y;
  if (dy !== 0n) {
    return Number(pt2.x - pt1.x) / Number(dy);
  } else if (pt2.x > pt1.x) {
    return -Infinity;
  }
  return Infinity;
};

const topX = (ae: Active, currentY: bigint): bigint => {
  if (currentY === ae.top.y || ae.top.x === ae.bot.x) {
    return ae.top.x;
  } else if (currentY === ae.bot.y) {
    return ae.bot.x;
  }

  return ae.bot.x + BigInt(Math.round(ae.dx * Number(currentY - ae.bot.y)));
};

const isHorizontal = (ae: Active) => {
  return ae.top.y === ae.bot.y;
};

const isHeadingRightHorz = (ae: Active) => {
  return ae.dx === -Infinity;
};

const isHeadingLeftHorz = (ae: Active) => {
  return ae.dx === Infinity;
};

const getPolyType = (ae: Active) => {
  return ae.localMin.polytype;
};

const isSamePolyType = (ae1: Active, ae2: Active) => {
  return ae1.localMin.polytype === ae2.localMin.polytype;
};

const setDx = (ae: Active) => {
  ae.dx = getDx(ae.bot, ae.top);
};

const nextVertex = (ae: Active): Vertex => {
  return ae.windDx > 0 ? ae.vertexTop!.next! : ae.vertexTop!.prev!;
};

const prevPrevVertex = (ae: Active): Vertex => {
  return ae.windDx > 0 ? ae.vertexTop!.prev!.prev! : ae.vertexTop!.next!.next!;
};

type IsMaxima = {
  (vertex: Vertex): boolean;
  (ae: Active): boolean;
};

const isMaxima: IsMaxima = (vertexOrAe) => {
  if ("flags" in vertexOrAe) {
    return (vertexOrAe.flags & VertexFlags.LocalMax) !== VertexFlags.None;
  }
  return (
    (vertexOrAe.vertexTop!.flags & VertexFlags.LocalMax) !== VertexFlags.None
  );
};

const getMaximaPair = (ae: Active) => {
  let ae2 = ae.nextInAEL;
  while (ae2 !== undefined) {
    if (ae2.vertexTop === ae.vertexTop) {
      return ae2;
    }
    ae2 = ae2.nextInAEL;
  }
  return undefined;
};

const getCurrYMaximaVertex_Open = (ae: Active): Vertex | undefined => {
  let result = ae.vertexTop;
  if (ae.windDx > 0) {
    while (
      result!.next!.pt.y === result!.pt.y &&
      (result!.flags & (VertexFlags.OpenEnd | VertexFlags.LocalMax)) ===
        VertexFlags.None
    ) {
      result = result!.next;
    }
  } else {
    while (
      result!.prev!.pt.y === result!.pt.y &&
      (result!.flags & (VertexFlags.OpenEnd | VertexFlags.LocalMax)) ===
        VertexFlags.None
    ) {
      result = result!.prev;
    }
  }
  if (!isMaxima(result!)) {
    result = undefined;
  }
  return result;
};

const getCurrYMaximaVertex = (ae: Active) => {
  let result = ae.vertexTop;
  if (ae.windDx > 0) {
    while (result!.next!.pt.y === result!.pt.y) {
      result = result!.next;
    }
  } else {
    while (result!.prev!.pt.y === result!.pt.y) {
      result = result!.prev;
    }
  }
  if (!isMaxima(result!)) {
    result = undefined;
  }
  return result;
};

const setSides = (outrec: OutRec, startEdge: Active, endEdge: Active) => {
  outrec.frontEdge = startEdge;
  outrec.backEdge = endEdge;
};

const swapOutrecs = (ae1: Active, ae2: Active) => {
  const or1 = ae1.outrec;
  const or2 = ae2.outrec;
  if (or1 === or2) {
    const ae = or1!.frontEdge;
    or1!.frontEdge = or1!.backEdge;
    or1!.backEdge = ae;
    return;
  }

  if (or1 !== undefined) {
    if (ae1 === or1.frontEdge) {
      or1.frontEdge = ae2;
    } else {
      or1.backEdge = ae2;
    }
  }

  if (or2 !== undefined) {
    if (ae2 === or2.frontEdge) {
      or2.frontEdge = ae1;
    } else {
      or2.backEdge = ae1;
    }
  }

  ae1.outrec = or2;
  ae2.outrec = or1;
};

const setOwner = (outrec: OutRec, newOwner: OutRec) => {
  while (newOwner.owner !== undefined && newOwner.owner.pts !== undefined) {
    newOwner.owner = newOwner.owner.owner;
  }

  let tmp: OutRec | undefined = newOwner;

  while (tmp !== undefined && tmp !== outrec) {
    tmp = tmp.owner;
  }

  if (tmp !== undefined) {
    newOwner.owner = outrec.owner;
  }
  outrec.owner = newOwner;
};

const area = (op: OutPt): number => {
  let area = 0.0;
  let op2: OutPt = op;
  do {
    area += Number((op2.prev.pt.y + op2.pt.y) * (op2.prev.pt.x - op2.pt.x));
    op2 = op2.next!;
  } while (op2 !== op);
  return area * 0.5;
};

const areaTriangle = (pt1: Point64, pt2: Point64, pt3: Point64): number => {
  return (
    Number((pt3.y + pt1.y) * (pt3.x - pt1.x)) +
    Number((pt1.y + pt2.y) * (pt1.x - pt2.x)) +
    Number((pt2.y + pt3.y) * (pt2.x - pt3.x))
  );
};

const getRealOutRec = (outrec?: OutRec) => {
  while (outrec !== undefined && outrec.pts === undefined) {
    outrec = outrec.owner;
  }
  return outrec;
};

const isValidOwner = (outrec?: OutRec, testOwner?: OutRec): boolean => {
  while (testOwner !== undefined && testOwner !== outrec) {
    testOwner = testOwner.owner;
  }
  return testOwner !== undefined;
};

const uncoupleOutRec = (ae: Active): void => {
  const outrec = ae.outrec;
  if (outrec === undefined) {
    return;
  }

  outrec.frontEdge!.outrec = undefined;
  outrec.backEdge!.outrec = undefined;
  outrec.frontEdge = undefined;
  outrec.backEdge = undefined;
};

const outrecIsAscending = (hotEdge: Active) => {
  return hotEdge === hotEdge.outrec!.frontEdge;
};

const swapFrontBackSides = (outrec: OutRec) => {
  const ae2 = outrec.frontEdge!;
  outrec.frontEdge = outrec.backEdge;
  outrec.backEdge = ae2;
  outrec.pts = outrec.pts!.next;
};

const edgesAdjacentInAEL = (inode: IntersectNode) => {
  return (
    inode.edge1.nextInAEL === inode.edge2 ||
    inode.edge1.prevInAEL === inode.edge2
  );
};

const resetHorzDirection = (
  horz: Active,
  vertexMax: Vertex | undefined,
): { result: boolean; leftX: bigint; rightX: bigint } => {
  if (horz.bot.x === horz.top.x) {
    let ae = horz.nextInAEL;
    while (ae !== undefined && ae.vertexTop !== vertexMax) {
      ae = ae.nextInAEL;
    }

    return {
      leftX: horz.curX,
      rightX: horz.curX,
      result: ae !== undefined,
    };
  }

  if (horz.curX < horz.top.x) {
    return {
      leftX: horz.curX,
      rightX: horz.top.x,
      result: true,
    };
  }
  return {
    leftX: horz.top.x,
    rightX: horz.curX,
    result: false,
  };
};

const horzIsSpike = (horz: Active): boolean => {
  const nextPt = nextVertex(horz).pt;
  return horz.bot.x < horz.top.x !== horz.top.x < nextPt.x;
};

const trimHorz = (horzEdge: Active, preserveCollinear: boolean) => {
  let wasTrimmed = false;
  let pt = nextVertex(horzEdge).pt;

  while (pt.y === horzEdge.top.y) {
    if (
      preserveCollinear &&
      pt.x < horzEdge.top.x !== horzEdge.bot.x < horzEdge.top.x
    ) {
      break;
    }

    horzEdge.vertexTop = nextVertex(horzEdge);
    horzEdge.top = Point64.clone(pt);
    wasTrimmed = true;
    if (isMaxima(horzEdge)) {
      break;
    }
    pt = nextVertex(horzEdge).pt;
  }

  if (wasTrimmed) {
    setDx(horzEdge);
  }
};

const isJoined = (e: Active) => e.joinWith !== JoinWith.None;

const isValidAelOrder = (resident: Active, newcomer: Active): boolean => {
  if (newcomer.curX !== resident.curX) {
    return newcomer.curX > resident.curX;
  }

  const d = crossProduct(resident.top, newcomer.bot, newcomer.top);
  if (d !== 0) {
    return d < 0;
  }

  if (!isMaxima(resident) && resident.top.y > newcomer.top.y) {
    return (
      crossProduct(newcomer.bot, resident.top, nextVertex(resident).pt) <= 0
    );
  }

  if (!isMaxima(newcomer) && newcomer.top.y > resident.top.y) {
    return (
      crossProduct(newcomer.bot, newcomer.top, nextVertex(newcomer).pt) >= 0
    );
  }

  const y = newcomer.bot.y;
  const newcomerIsLeft = newcomer.isLeftBound;

  if (resident.bot.y !== y || resident.localMin.vertex.pt.y !== y) {
    return newcomer.isLeftBound;
  }

  if (resident.isLeftBound !== newcomerIsLeft) {
    return newcomerIsLeft;
  }

  if (
    crossProduct(prevPrevVertex(resident).pt, resident.bot, resident.top) === 0
  ) {
    return true;
  }

  return (
    crossProduct(
      prevPrevVertex(resident).pt,
      newcomer.bot,
      prevPrevVertex(newcomer).pt,
    ) >
      0 ===
    newcomerIsLeft
  );
};

const insertRightEdge = (ae: Active, ae2: Active) => {
  ae2.nextInAEL = ae.nextInAEL;
  if (ae.nextInAEL !== undefined) {
    ae.nextInAEL.prevInAEL = ae2;
  }

  ae2.prevInAEL = ae;
  ae.nextInAEL = ae2;
};

const joinOutrecPaths = (ae1: Active, ae2: Active) => {
  const p1Start = ae1.outrec!.pts!;
  const p2Start = ae2.outrec!.pts!;
  const p1End = p1Start.next!;
  const p2End = p2Start.next!;
  if (isFront(ae1)) {
    p2End.prev = p1Start;
    p1Start.next = p2End;
    p2Start.next = p1End;
    p1End.prev = p2Start;
    ae1.outrec!.pts = p2Start;
    ae1.outrec!.frontEdge = ae2.outrec!.frontEdge;
    if (ae1.outrec!.frontEdge !== undefined) {
      ae1.outrec!.frontEdge.outrec = ae1.outrec;
    }
  } else {
    p1End.prev = p2Start;
    p2Start.next = p1End;
    p1Start.next = p2End;
    p2End.prev = p1Start;

    ae1.outrec!.backEdge = ae2.outrec!.backEdge;
    if (ae1.outrec!.backEdge !== undefined) {
      ae1.outrec!.backEdge.outrec = ae1.outrec;
    }
  }

  ae2.outrec!.frontEdge = undefined;
  ae2.outrec!.backEdge = undefined;
  ae2.outrec!.pts = undefined;
  setOwner(ae2.outrec!, ae1.outrec!);

  if (isOpenEnd(ae1)) {
    ae2.outrec!.pts = ae1.outrec!.pts;
    ae1.outrec!.pts = undefined;
  }

  ae1.outrec = undefined;
  ae2.outrec = undefined;
};

const addOutPt = (ae: Active, pt: Point64): OutPt => {
  const outrec = ae.outrec!;
  const toFront = isFront(ae);
  const opFront = outrec.pts!;
  const opBack = opFront.next!;

  if (toFront && Point64.equals(pt, opFront.pt)) {
    return opFront;
  } else if (!toFront && Point64.equals(pt, opBack.pt)) {
    return opBack;
  }

  const newOp: OutPt = {
    pt: Point64.clone(pt),
    outrec: outrec,
    prev: opFront,
    next: opBack,
  } as OutPt;

  opBack.prev = newOp;
  opFront.next = newOp;
  if (toFront) {
    outrec.pts = newOp;
  }
  return newOp;
};

const findEdgeWithMatchingLocMin = (e: Active): Active | undefined => {
  let result: Active | undefined = e.nextInAEL;
  while (result !== undefined) {
    if (result.localMin.vertex === e.localMin.vertex) {
      return result;
    }
    if (!isHorizontal(result) && Point64.notEquals(e.bot, result.bot)) {
      break;
    }
    result = result.nextInAEL;
  }

  result = e.prevInAEL;

  while (result !== undefined) {
    if (result.localMin.vertex === e.localMin.vertex) {
      return result;
    }
    if (!isHorizontal(result) && Point64.notEquals(e.bot, result.bot)) {
      break;
    }
    result = result.prevInAEL;
  }
  return undefined;
};

const extractFromSEL = (ae: Active): Active | undefined => {
  const res = ae.nextInSEL;
  if (res !== undefined) {
    res.prevInSEL = ae.prevInSEL;
  }
  ae.prevInSEL!.nextInSEL = res;
  return res;
};

const insert1Before2InSEL = (ae1: Active, ae2: Active) => {
  ae1.prevInSEL = ae2.prevInSEL;
  if (ae1.prevInSEL !== undefined) {
    ae1.prevInSEL.nextInSEL = ae1;
  }
  ae1.nextInSEL = ae2;
  ae2.prevInSEL = ae1;
};

const fixOutRecPts = (outrec: OutRec) => {
  let op = outrec.pts!;
  do {
    op!.outrec = outrec;
    op = op.next!;
  } while (op !== outrec.pts);
};

const setHorzSegHeadingForward = (
  hs: HorzSegment,
  opP: OutPt,
  opN: OutPt,
): boolean => {
  if (opP.pt.x === opN.pt.x) {
    return false;
  }

  if (opP.pt.x < opN.pt.x) {
    hs.leftOp = opP;
    hs.rightOp = opN;
    hs.leftToRight = true;
  } else {
    hs.leftOp = opN;
    hs.rightOp = opP;
    hs.leftToRight = false;
  }

  return true;
};

const updateHorzSegment = (hs: HorzSegment): boolean => {
  const op = hs.leftOp!;
  const outrec = getRealOutRec(op.outrec);
  const outrecHasEdges = outrec!.frontEdge !== undefined;
  const curr_y = op.pt.y;
  let opP = op;
  let opN = op;

  if (outrecHasEdges) {
    const opA = outrec!.pts!;
    const opZ = opA.next!;
    while (opP !== opZ && opP.prev.pt.y === curr_y) {
      opP = opP.prev;
    }
    while (opN !== opA && opN.next!.pt.y === curr_y) {
      opN = opN.next!;
    }
  } else {
    while (opP.prev !== opN && opP.prev.pt.y === curr_y) {
      opP = opP.prev;
    }
    while (opN.next !== opP && opN.next!.pt.y === curr_y) {
      opN = opN.next!;
    }
  }

  const result =
    setHorzSegHeadingForward(hs, opP, opN) && hs.leftOp!.horz === undefined;

  if (result) {
    hs.leftOp!.horz = hs;
  } else {
    hs.rightOp = undefined;
  }

  return result;
};

const duplicateOp = (op: OutPt, insert_after: boolean): OutPt => {
  const result = {
    pt: Point64.clone(op.pt),
    outrec: op.outrec,
  } as OutPt;

  if (insert_after) {
    result.next = op.next;
    result.next!.prev = result;
    result.prev = op;
    op.next = result;
  } else {
    result.prev = op.prev;
    result.prev.next = result;
    result.next = op;
    op.prev = result;
  }

  return result;
};

const getCleanPath = (op: OutPt): Path64 => {
  const result: Path64 = new Path64();
  let op2 = op;

  while (
    op2.next !== op &&
    ((op2.pt.x === op2.next!.pt.x && op2.pt.x === op2.prev.pt.x) ||
      (op2.pt.y === op2.next!.pt.y && op2.pt.y === op2.prev.pt.y))
  ) {
    op2 = op2.next!;
  }

  result.push(Point64.clone(op2.pt));

  let prevOp = op2;
  op2 = op2.next!;

  while (op2 !== op) {
    if (
      (op2.pt.x !== op2.next!.pt.x || op2.pt.x !== prevOp.pt.x) &&
      (op2.pt.y !== op2.next!.pt.y || op2.pt.y !== prevOp.pt.y)
    ) {
      result.push(Point64.clone(op2.pt));
      prevOp = op2;
    }
    op2 = op2.next!;
  }

  return result;
};

const pointInOpPolygon = (pt: Point64, op: OutPt): PointInPolygonResult => {
  if (op === op.next || op.prev === op.next) {
    return PointInPolygonResult.IsOutside;
  }

  let op2 = op;

  do {
    if (op.pt.y !== pt.y) {
      break;
    }
    op = op.next!;
  } while (op !== op2);

  if (op.pt.y === pt.y) {
    return PointInPolygonResult.IsOutside;
  }

  let isAbove = op.pt.y < pt.y;
  const startingAbove = isAbove;
  let val = false;

  op2 = op.next!;

  while (op2 !== op) {
    if (isAbove) {
      while (op2 !== op && op2.pt.y < pt.y) {
        op2 = op2.next!;
      }
    } else {
      while (op2 !== op && op2.pt.y > pt.y) {
        op2 = op2.next!;
      }
    }

    if (op2 === op) {
      break;
    }

    if (op2.pt.y === pt.y) {
      if (
        op2.pt.x === pt.x ||
        (op2.pt.y === op2.prev.pt.y && pt.x < op2.prev.pt.x !== pt.x < op2.pt.x)
      ) {
        return PointInPolygonResult.IsOn;
      }

      op2 = op2.next!;
      if (op2 === op) {
        break;
      }
      continue;
    }

    if (op2.pt.x <= pt.x || op2.prev.pt.x <= pt.x) {
      if (op2.prev.pt.x < pt.x && op2.pt.x < pt.x) {
        val = !val;
      } else {
        const d = crossProduct(op2.prev.pt, op2.pt, pt);
        if (d === 0) {
          return PointInPolygonResult.IsOn;
        }
        if (d < 0 === isAbove) {
          val = !val;
        }
      }
    }

    isAbove = !isAbove;
    op2 = op2.next!;
  }

  if (isAbove !== startingAbove) {
    const d = crossProduct(op2.prev.pt, op2.pt, pt);
    if (d === 0) {
      return PointInPolygonResult.IsOn;
    }
    if (d < 0 === isAbove) {
      val = !val;
    }
  }

  if (val) {
    return PointInPolygonResult.IsInside;
  } else {
    return PointInPolygonResult.IsOutside;
  }
};

const path1InsidePath2 = (op1: OutPt, op2: OutPt): boolean => {
  let result: PointInPolygonResult;
  let outsize_cnt = 0;
  let op = op1;

  do {
    result = pointInOpPolygon(op.pt, op2);

    if (result === PointInPolygonResult.IsOutside) {
      outsize_cnt++;
    } else if (result === PointInPolygonResult.IsInside) {
      outsize_cnt--;
    }

    op = op.next!;
  } while (op !== op1 && Math.abs(outsize_cnt) < 2);

  if (Math.abs(outsize_cnt) > 1) {
    return outsize_cnt < 0;
  }

  const mp = getBounds(getCleanPath(op1)).midPoint();
  const path2 = getCleanPath(op2);

  return pointInPolygon(mp, path2) !== PointInPolygonResult.IsOutside;
};

const ptsReallyClose = (pt1: Point64, pt2: Point64): boolean =>
  Math.abs(Number(pt1.x - pt2.x)) < 2 && Math.abs(Number(pt1.y - pt2.y)) < 2;

const isVerySmallTriangle = (op: OutPt): boolean =>
  op.next!.next === op.prev &&
  (ptsReallyClose(op.prev.pt, op.next!.pt) ||
    ptsReallyClose(op.pt, op.next!.pt) ||
    ptsReallyClose(op.pt, op.prev.pt));
const isValidClosedPath = (op?: OutPt): boolean =>
  op !== undefined &&
  op.next !== op &&
  (op.next !== op.prev || !isVerySmallTriangle(op));

const disposeOutPt = (op: OutPt): OutPt | undefined => {
  const result = op.next === op ? undefined : op.next;
  op.prev.next = op.next;
  op.next!.prev = op.prev;
  return result;
};

const buildPath = (
  op: OutPt | undefined,
  reverse: boolean,
  isOpen: boolean,
  path: Path64,
): boolean => {
  if (op === undefined || op.next === op || (!isOpen && op.next === op.prev)) {
    return false;
  }

  path.length = 0;

  let lastPt: Point64;
  let op2: OutPt;

  if (reverse) {
    lastPt = Point64.clone(op.pt);
    op2 = op.prev;
  } else {
    op = op.next!;
    lastPt = Point64.clone(op.pt);
    op2 = op.next!;
  }
  path.push(lastPt);

  while (op2 !== op) {
    if (Point64.notEquals(op2.pt, lastPt)) {
      lastPt = Point64.clone(op2.pt);
      path.push(lastPt);
    }
    if (reverse) {
      op2 = op2.prev;
    } else {
      op2 = op2.next!;
    }
  }
  return !(path.length === 3 && isVerySmallTriangle(op2));
};

const getBounds = (path: Path64): Rect64 => {
  if (path.length === 0) {
    return new Rect64();
  }
  const result = new Rect64(false);
  for (const pt of path) {
    if (pt.x < result.left) {
      result.left = pt.x;
    }
    if (pt.x > result.right) {
      result.right = pt.x;
    }
    if (pt.y < result.top) {
      result.top = pt.y;
    }
    if (pt.y > result.bottom) {
      result.bottom = pt.y;
    }
  }

  return result;
};

export class ClipperBase {
  _cliptype: ClipType;
  _fillrule: FillRule;
  _actives?: Active;
  _sel?: Active;
  _minimaList: LocalMinima[];
  _intersectList: IntersectNode[];
  _vertexList: Vertex[];
  _outrecList: OutRec[];
  _scanlineList: bigint[];
  _horzSegList: HorzSegment[];
  _horzJoinList: HorzJoin[];
  _currentLocMin: number;
  _currentBotY: bigint;
  _isSortedMinimaList: boolean;
  _hasOpenPaths: boolean;
  _using_polytree: boolean;
  _succeeded: boolean;
  preserveCollinear: boolean;
  reverseSolution: boolean;

  constructor() {
    this._cliptype = ClipType.None;
    this._fillrule = FillRule.EvenOdd;
    this._minimaList = [];
    this._intersectList = [];
    this._vertexList = [];
    this._outrecList = [];
    this._scanlineList = [];
    this._horzSegList = [];
    this._horzJoinList = [];
    this._currentLocMin = 0;
    this._currentBotY = 0n;
    this._isSortedMinimaList = false;
    this._hasOpenPaths = false;
    this._using_polytree = false;
    this._succeeded = false;
    this.preserveCollinear = true;
    this.reverseSolution = false;
  }

  clearSolutionOnly() {
    while (this._actives !== undefined) {
      this.deleteFromAEL(this._actives);
    }
    this._scanlineList.length = 0;
    this.disposeIntersectNodes();
    this._outrecList.length = 0;
    this._horzSegList.length = 0;
    this._horzJoinList.length = 0;
  }

  clear() {
    this.clearSolutionOnly();
    this._minimaList.length = 0;
    this._vertexList.length = 0;
    this._currentLocMin = 0;
    this._isSortedMinimaList = false;
    this._hasOpenPaths = false;
  }

  reset() {
    if (!this._isSortedMinimaList) {
      this._minimaList.sort(locMinSorter);
      this._isSortedMinimaList = true;
    }

    for (let i = this._minimaList.length - 1; i >= 0; i--) {
      this._scanlineList.push(this._minimaList[i].vertex.pt.y);
    }

    this._currentBotY = 0n;
    this._currentLocMin = 0;
    this._actives = undefined;
    this._sel = undefined;
    this._succeeded = true;
  }

  insertScanLine(y: bigint) {
    if (this._scanlineList.find((value) => value === y) === undefined) {
      this._scanlineList.push(y);
      this._scanlineList.sort((a, b) => (a === b ? 0 : a > b ? 1 : -1));
    }
  }

  popScanline(): { result: boolean; y: bigint } {
    if (this._scanlineList.length < 1) {
      return { result: false, y: 0n };
    }

    const y = this._scanlineList.pop()!;
    while (
      this._scanlineList.length >= 1 &&
      y === this._scanlineList[this._scanlineList.length - 1]
    ) {
      this._scanlineList.pop();
    }
    return { result: true, y: y };
  }

  hasLocMinAtY(y: bigint): boolean {
    return (
      this._currentLocMin < this._minimaList.length &&
      this._minimaList[this._currentLocMin].vertex.pt.y === y
    );
  }

  popLocalMinima() {
    return this._minimaList[this._currentLocMin++];
  }

  addSubject(path: Iterable<Point64>) {
    this.addPath(path, PathType.Subject);
  }

  addOpenSubject(path: Iterable<Point64>) {
    this.addPath(path, PathType.Subject, true);
  }

  addClip(path: Iterable<Point64>) {
    this.addPath(path, PathType.Clip);
  }

  addPath(
    path: Iterable<Point64>,
    polytype: PathType,
    isOpen: boolean = false,
  ) {
    const tmp: Iterable<Iterable<Point64>> = [path];
    this.addPaths(tmp, polytype, isOpen);
  }

  addPaths(
    paths: Iterable<Iterable<Point64>>,
    polytype: PathType,
    isOpen: boolean = false,
  ) {
    if (isOpen) {
      this._hasOpenPaths = true;
    }
    this._isSortedMinimaList = false;

    addPathsToVertexList(
      paths,
      polytype,
      isOpen,
      this._minimaList,
      this._vertexList,
    );
  }

  // addReuseableData()

  isContributingClosed(ae: Active) {
    switch (this._fillrule) {
      case FillRule.Positive:
        if (ae.windCount !== 1) {
          return false;
        }
        break;
      case FillRule.Negative:
        if (ae.windCount !== -1) {
          return false;
        }
        break;
      case FillRule.NonZero:
        if (Math.abs(ae.windCount) !== 1) {
          return false;
        }
        break;
    }

    switch (this._cliptype) {
      case ClipType.Intersection:
        switch (this._fillrule) {
          case FillRule.Positive:
            return ae.windCount2 > 0;
          case FillRule.Negative:
            return ae.windCount2 < 0;
          default:
            return ae.windCount2 !== 0;
        }
      case ClipType.Union:
        switch (this._fillrule) {
          case FillRule.Positive:
            return ae.windCount2 <= 0;
          case FillRule.Negative:
            return ae.windCount2 >= 0;
          default:
            return ae.windCount2 === 0;
        }
      case ClipType.Difference: {
        let result: boolean;
        switch (this._fillrule) {
          case FillRule.Positive:
            result = ae.windCount2 <= 0;
            break;
          case FillRule.Negative:
            result = ae.windCount2 >= 0;
            break;
          default:
            result = ae.windCount2 === 0;
            break;
        }
        return getPolyType(ae) === PathType.Subject ? result : !result;
      }
      case ClipType.Xor:
        return true;
      default:
        return false;
    }
  }

  isContributingOpen(ae: Active) {
    let isInSubj: boolean = false;
    let isInClip: boolean = false;

    switch (this._fillrule) {
      case FillRule.Positive:
        isInSubj = ae.windCount > 0;
        isInClip = ae.windCount2 > 0;
        break;
      case FillRule.Negative:
        isInSubj = ae.windCount < 0;
        isInClip = ae.windCount2 < 0;
        break;
      default:
        isInSubj = ae.windCount !== 0;
        isInClip = ae.windCount2 !== 0;
        break;
    }

    switch (this._cliptype) {
      case ClipType.Intersection:
        return isInClip;
      case ClipType.Union:
        return !isInSubj && !isInClip;
      default:
        return !isInClip;
    }
  }

  setWindCountForClosedPathEdge(ae: Active) {
    let ae2 = ae.prevInAEL;
    const pt = getPolyType(ae);

    while (ae2 !== undefined && (getPolyType(ae2) !== pt || isOpen(ae2))) {
      ae2 = ae2.prevInAEL;
    }

    if (ae2 === undefined) {
      ae.windCount = ae.windDx;
      ae2 = this._actives;
    } else if (this._fillrule === FillRule.EvenOdd) {
      ae.windCount = ae.windDx;
      ae.windCount2 = ae2.windCount2;
      ae2 = ae2.nextInAEL;
    } else {
      if (ae2.windCount * ae2.windDx < 0) {
        if (Math.abs(ae2.windCount) > 1) {
          if (ae2.windDx * ae.windDx < 0) {
            ae.windCount = ae2.windCount;
          } else {
            ae.windCount = ae2.windCount + ae.windDx;
          }
        } else {
          ae.windCount = isOpen(ae) ? 1 : ae.windDx;
        }
      } else {
        if (ae2.windDx * ae.windDx < 0) {
          ae.windCount = ae2.windCount;
        } else {
          ae.windCount = ae2.windCount + ae.windDx;
        }
      }
      ae.windCount2 = ae2.windCount2;
      ae2 = ae2.nextInAEL;
    }

    if (this._fillrule === FillRule.EvenOdd) {
      while (ae2 !== ae) {
        if (getPolyType(ae2!) !== pt && !isOpen(ae2!)) {
          ae.windCount2 = ae.windCount2 === 0 ? 1 : 0;
        }
        ae2 = ae2!.nextInAEL;
      }
    } else {
      while (ae2 !== ae) {
        if (getPolyType(ae2!) !== pt && !isOpen(ae2!)) {
          ae.windCount2 += ae2!.windDx;
        }
        ae2 = ae2!.nextInAEL;
      }
    }
  }

  setWindCountForOpenPathEdge(ae: Active) {
    let ae2 = this._actives;

    if (this._fillrule === FillRule.EvenOdd) {
      let cnt1 = 0;
      let cnt2 = 0;
      while (ae2 !== ae) {
        if (getPolyType(ae2!) === PathType.Clip) {
          cnt2++;
        } else if (!isOpen(ae2!)) {
          cnt1++;
        }
        ae2 = ae2!.nextInAEL;
      }
      ae.windCount = isOdd(cnt1) ? 1 : 0;
      ae.windCount2 = isOdd(cnt2) ? 1 : 0;
    } else {
      while (ae2 !== ae) {
        if (getPolyType(ae2!) === PathType.Clip) {
          ae.windCount2 += ae2!.windDx;
        } else if (!isOpen(ae2!)) {
          ae.windCount += ae2!.windDx;
        }
        ae2 = ae2!.nextInAEL;
      }
    }
  }

  insertLeftEdge(ae: Active) {
    if (this._actives === undefined) {
      ae.prevInAEL = undefined;
      ae.nextInAEL = undefined;
      this._actives = ae;
    } else if (!isValidAelOrder(this._actives, ae)) {
      ae.prevInAEL = undefined;
      ae.nextInAEL = this._actives;
      this._actives.prevInAEL = ae;
      this._actives = ae;
    } else {
      let ae2: Active = this._actives;
      while (
        ae2.nextInAEL !== undefined &&
        isValidAelOrder(ae2.nextInAEL, ae)
      ) {
        ae2 = ae2.nextInAEL;
      }
      if (ae2.joinWith === JoinWith.Right) {
        ae2 = ae2.nextInAEL!;
      }
      ae.nextInAEL = ae2.nextInAEL;

      if (ae2.nextInAEL !== undefined) {
        ae2.nextInAEL.prevInAEL = ae;
      }

      ae.prevInAEL = ae2;
      ae2.nextInAEL = ae;
    }
  }

  insertLocalMinimaIntoAEL(boty: bigint) {
    let localMinima: LocalMinima;
    let leftBound: Active | undefined;
    let rightBound: Active | undefined;

    while (this.hasLocMinAtY(boty)) {
      localMinima = this.popLocalMinima();
      if (
        (localMinima.vertex.flags & VertexFlags.OpenStart) !==
        VertexFlags.None
      ) {
        leftBound = undefined;
      } else {
        leftBound = {
          bot: Point64.clone(localMinima.vertex.pt),
          curX: localMinima.vertex.pt.x,
          windDx: -1,
          vertexTop: localMinima.vertex.prev,
          top: Point64.clone(localMinima.vertex.prev!.pt),
          outrec: undefined,
          localMin: {
            vertex: localMinima.vertex,
            polytype: localMinima.polytype,
            isOpen: localMinima.isOpen,
          },

          isLeftBound: false,
          dx: 0,
          windCount: 0,
          windCount2: 0,
          joinWith: JoinWith.None,
        };
        setDx(leftBound);
      }

      if (
        (localMinima.vertex.flags & VertexFlags.OpenEnd) !==
        VertexFlags.None
      ) {
        rightBound = undefined;
      } else {
        rightBound = {
          bot: Point64.clone(localMinima.vertex.pt),
          curX: localMinima.vertex.pt.x,
          windDx: 1,
          vertexTop: localMinima.vertex.next,
          top: Point64.clone(localMinima.vertex.next!.pt),
          outrec: undefined,
          localMin: {
            vertex: localMinima.vertex,
            polytype: localMinima.polytype,
            isOpen: localMinima.isOpen,
          },

          isLeftBound: false,
          dx: 0,
          windCount: 0,
          windCount2: 0,
          joinWith: JoinWith.None,
        };
        setDx(rightBound);
      }

      if (leftBound !== undefined && rightBound !== undefined) {
        if (isHorizontal(leftBound)) {
          if (isHeadingRightHorz(leftBound)) {
            const tmp = rightBound;
            rightBound = leftBound;
            leftBound = tmp;
          }
        } else if (isHorizontal(rightBound)) {
          if (isHeadingLeftHorz(rightBound)) {
            const tmp = rightBound;
            rightBound = leftBound;
            leftBound = tmp;
          }
        } else if (leftBound.dx < rightBound.dx) {
          const tmp = rightBound;
          rightBound = leftBound;
          leftBound = tmp;
        }
      } else if (leftBound === undefined) {
        leftBound = rightBound;
        rightBound = undefined;
      }

      let contributing: boolean;
      leftBound!.isLeftBound = true;
      this.insertLeftEdge(leftBound!);

      if (isOpen(leftBound!)) {
        this.setWindCountForOpenPathEdge(leftBound!);
        contributing = this.isContributingOpen(leftBound!);
      } else {
        this.setWindCountForClosedPathEdge(leftBound!);
        contributing = this.isContributingClosed(leftBound!);
      }

      if (rightBound !== undefined) {
        rightBound.windCount = leftBound!.windCount;
        rightBound.windCount2 = leftBound!.windCount2;
        insertRightEdge(leftBound!, rightBound);

        if (contributing) {
          this.addLocalMinPoly(leftBound!, rightBound, leftBound!.bot, true);
          if (!isHorizontal(leftBound!)) {
            this.checkJoinLeft(leftBound!, leftBound!.bot);
          }
        }

        while (
          rightBound.nextInAEL !== undefined &&
          isValidAelOrder(rightBound.nextInAEL, rightBound)
        ) {
          this.intersectEdges(
            rightBound,
            rightBound.nextInAEL!,
            rightBound.bot,
          );
          this.swapPositionsInAEL(rightBound, rightBound.nextInAEL!);
        }

        if (isHorizontal(rightBound)) {
          this.pushHorz(rightBound);
        } else {
          this.checkJoinRight(rightBound, rightBound.bot);
          this.insertScanLine(rightBound.top.y);
        }
      } else if (contributing) {
        this.startOpenPath(leftBound!, leftBound!.bot);
      }

      if (isHorizontal(leftBound!)) {
        this.pushHorz(leftBound!);
      } else {
        this.insertScanLine(leftBound!.top.y);
      }
    }
  }

  pushHorz(ae: Active) {
    ae.nextInSEL = this._sel;
    this._sel = ae;
  }

  popHorz(): { result: boolean; value?: Active } {
    const ae = this._sel;
    if (this._sel === undefined) {
      return { result: false, value: ae };
    }
    this._sel = this._sel.nextInSEL;
    return { result: true, value: ae };
  }

  addLocalMinPoly(
    ae1: Active,
    ae2: Active,
    pt: Point64,
    isNew: boolean = false,
  ): OutPt {
    const outrec = this.newOutRec();
    ae1.outrec = outrec;
    ae2.outrec = outrec;

    if (isOpen(ae1)) {
      outrec.owner = undefined;
      outrec.isOpen = true;
      if (ae1.windDx > 0) {
        setSides(outrec, ae1, ae2);
      } else {
        setSides(outrec, ae2, ae1);
      }
    } else {
      outrec.isOpen = false;
      const prevHotEdge = getPrevHotEdge(ae1);
      if (prevHotEdge !== undefined) {
        if (this._using_polytree) {
          setOwner(outrec, prevHotEdge.outrec!);
        }
        outrec.owner = prevHotEdge.outrec;
        if (outrecIsAscending(prevHotEdge) === isNew) {
          setSides(outrec, ae2, ae1);
        } else {
          setSides(outrec, ae1, ae2);
        }
      } else {
        outrec.owner = undefined;
        if (isNew) {
          setSides(outrec, ae1, ae2);
        } else {
          setSides(outrec, ae2, ae1);
        }
      }
    }

    const op: OutPt = {
      pt: pt,
      outrec: outrec,
    } as OutPt;

    op.next = op;
    op.prev = op;
    outrec.pts = op;

    return op;
  }

  addLocalMaxPoly(ae1: Active, ae2: Active, pt: Point64): OutPt | undefined {
    if (isJoined(ae1)) {
      this.split(ae1, pt);
    }
    if (isJoined(ae2)) {
      this.split(ae2, pt);
    }

    if (isFront(ae1) === isFront(ae2)) {
      if (isOpenEnd(ae1)) {
        swapFrontBackSides(ae1.outrec!);
      } else if (isOpenEnd(ae2)) {
        swapFrontBackSides(ae2.outrec!);
      } else {
        this._succeeded = false;
        return undefined;
      }
    }

    const result = addOutPt(ae1, pt);
    if (ae1.outrec === ae2.outrec) {
      const outrec = ae1.outrec!;
      outrec.pts = result;

      if (this._using_polytree) {
        const e = getPrevHotEdge(ae1);
        if (e === undefined) {
          outrec.owner = undefined;
        } else {
          setOwner(outrec, e.outrec!);
        }
      }
      uncoupleOutRec(ae1);
    } else if (isOpen(ae1)) {
      if (ae1.windDx < 0) {
        joinOutrecPaths(ae1, ae2);
      } else {
        joinOutrecPaths(ae2, ae1);
      }
    } else if (ae1.outrec!.idx < ae2.outrec!.idx) {
      joinOutrecPaths(ae1, ae2);
    } else {
      joinOutrecPaths(ae2, ae1);
    }

    return result;
  }

  newOutRec(): OutRec {
    const result: OutRec = {
      idx: this._outrecList.length,
      bounds: new Rect64(),
      path: new Path64(),
      isOpen: false,
    };

    this._outrecList.push(result);
    return result;
  }

  startOpenPath(ae: Active, pt: Point64): OutPt {
    const outrec = this.newOutRec();
    outrec.isOpen = true;
    if (ae.windDx > 0) {
      outrec.frontEdge = ae;
      outrec.backEdge = undefined;
    } else {
      outrec.frontEdge = undefined;
      outrec.backEdge = ae;
    }

    ae.outrec = outrec;
    const op = { pt: Point64.clone(pt), outrec: outrec } as OutPt;
    op.next = op;
    op.prev = op;

    outrec.pts = op;

    return op;
  }

  updateEdgeIntoAEL(ae: Active) {
    ae.bot = Point64.clone(ae.top);
    ae.vertexTop = nextVertex(ae);
    ae.top = Point64.clone(ae.vertexTop!.pt);
    ae.curX = ae.bot.x;
    setDx(ae);

    if (isJoined(ae)) {
      this.split(ae, ae.bot);
    }

    if (isHorizontal(ae)) {
      return;
    }

    this.insertScanLine(ae.top.y);

    this.checkJoinLeft(ae, ae.bot);
    this.checkJoinRight(ae, ae.bot, true);
  }

  intersectEdges(ae1: Active, ae2: Active, pt: Point64): OutPt | undefined {
    let resultOp: OutPt | undefined;

    if (this._hasOpenPaths && (isOpen(ae1) || isOpen(ae2))) {
      if (isOpen(ae1) && isOpen(ae2)) {
        return undefined;
      }
      if (isOpen(ae2)) {
        const tmp = ae2;
        ae2 = ae1;
        ae1 = tmp;
      }
      if (isJoined(ae2)) {
        this.split(ae2, pt);
      }

      if (this._cliptype === ClipType.Union) {
        if (!isHotEdge(ae2)) {
          return undefined;
        }
      } else if (ae2.localMin.polytype === PathType.Subject) {
        return undefined;
      }

      switch (this._fillrule) {
        case FillRule.Positive:
          if (ae2.windCount !== 1) {
            return undefined;
          }
          break;
        case FillRule.Negative:
          if (ae2.windCount !== -1) {
            return undefined;
          }
          break;
        default:
          if (Math.abs(ae2.windCount) !== 1) {
            return undefined;
          }
          break;
      }

      if (isHotEdge(ae1)) {
        resultOp = addOutPt(ae1, pt);

        if (isFront(ae1)) {
          ae1.outrec!.frontEdge = undefined;
        } else {
          ae1.outrec!.backEdge = undefined;
        }
        ae1.outrec = undefined;
      } else if (
        Point64.equals(pt, ae1.localMin.vertex.pt) &&
        !isOpenEnd(ae1.localMin.vertex)
      ) {
        const ae3 = findEdgeWithMatchingLocMin(ae1);
        if (ae3 !== undefined && isHotEdge(ae3)) {
          ae1.outrec = ae3.outrec;
          if (ae1.windDx > 0) {
            setSides(ae3.outrec!, ae1, ae3);
          } else {
            setSides(ae3.outrec!, ae3, ae1);
          }
          return ae3.outrec!.pts;
        }
        resultOp = this.startOpenPath(ae1, pt);
      } else {
        resultOp = this.startOpenPath(ae1, pt);
      }
      return resultOp;
    }

    if (isJoined(ae1)) {
      this.split(ae1, pt);
    }
    if (isJoined(ae2)) {
      this.split(ae2, pt);
    }

    let oldE1WindCount: number;
    let oldE2WindCount: number;

    if (ae1.localMin.polytype === ae2.localMin.polytype) {
      if (this._fillrule === FillRule.EvenOdd) {
        oldE1WindCount = ae1.windCount;
        ae1.windCount = ae2.windCount;
        ae2.windCount = oldE1WindCount;
      } else {
        if (ae1.windCount + ae2.windDx === 0) {
          ae1.windCount = -ae1.windCount;
        } else {
          ae1.windCount += ae2.windDx;
        }

        if (ae2.windCount - ae1.windDx === 0) {
          ae2.windCount = -ae2.windCount;
        } else {
          ae2.windCount -= ae1.windDx;
        }
      }
    } else {
      if (this._fillrule !== FillRule.EvenOdd) {
        ae1.windCount2 += ae2.windDx;
      } else {
        ae1.windCount2 = ae1.windCount2 === 0 ? 1 : 0;
      }
      if (this._fillrule !== FillRule.EvenOdd) {
        ae2.windCount2 -= ae1.windDx;
      } else {
        ae2.windCount2 = ae2.windCount2 === 0 ? 1 : 0;
      }
    }

    switch (this._fillrule) {
      case FillRule.Positive:
        oldE1WindCount = ae1.windCount;
        oldE2WindCount = ae2.windCount;
        break;
      case FillRule.Negative:
        oldE1WindCount = -ae1.windCount;
        oldE2WindCount = -ae2.windCount;
        break;
      default:
        oldE1WindCount = Math.abs(ae1.windCount);
        oldE2WindCount = Math.abs(ae2.windCount);
        break;
    }

    const e1WindCountIs0or1 = oldE1WindCount === 0 || oldE1WindCount === 1;
    const e2WindCountIs0or1 = oldE2WindCount === 0 || oldE2WindCount === 1;

    if (
      (!isHotEdge(ae1) && !e1WindCountIs0or1) ||
      (!isHotEdge(ae2) && !e2WindCountIs0or1)
    ) {
      return undefined;
    }

    if (isHotEdge(ae1) && isHotEdge(ae2)) {
      if (
        (oldE1WindCount !== 0 && oldE1WindCount !== 1) ||
        (oldE2WindCount !== 0 && oldE2WindCount !== 1) ||
        (ae1.localMin.polytype !== ae2.localMin.polytype &&
          this._cliptype !== ClipType.Xor)
      ) {
        resultOp = this.addLocalMaxPoly(ae1, ae2, pt);
      } else if (isFront(ae1) || ae1.outrec === ae2.outrec) {
        resultOp = this.addLocalMaxPoly(ae1, ae2, pt);
        this.addLocalMinPoly(ae1, ae2, pt);
      } else {
        resultOp = addOutPt(ae1, pt);
        addOutPt(ae2, pt);
        swapOutrecs(ae1, ae2);
      }
    } else if (isHotEdge(ae1)) {
      resultOp = addOutPt(ae1, pt);
      swapOutrecs(ae1, ae2);
    } else if (isHotEdge(ae2)) {
      resultOp = addOutPt(ae2, pt);
      swapOutrecs(ae1, ae2);
    } else {
      let e1Wc2: number;
      let e2Wc2: number;
      switch (this._fillrule) {
        case FillRule.Positive:
          e1Wc2 = ae1.windCount2;
          e2Wc2 = ae2.windCount2;
          break;
        case FillRule.Negative:
          e1Wc2 = -ae1.windCount2;
          e2Wc2 = -ae2.windCount2;
          break;
        default:
          e1Wc2 = Math.abs(ae1.windCount2);
          e2Wc2 = Math.abs(ae2.windCount2);
          break;
      }

      if (!isSamePolyType(ae1, ae2)) {
        resultOp = this.addLocalMinPoly(ae1, ae2, pt);
      } else if (oldE1WindCount === 1 && oldE2WindCount === 1) {
        resultOp = undefined;

        switch (this._cliptype) {
          case ClipType.Union:
            if (e1Wc2 > 0 && e2Wc2 > 0) {
              return undefined;
            }
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
          case ClipType.Difference:
            if (
              (getPolyType(ae1) === PathType.Clip && e1Wc2 > 0 && e2Wc2 > 0) ||
              (getPolyType(ae1) === PathType.Subject &&
                e1Wc2 <= 0 &&
                e2Wc2 <= 0)
            ) {
              resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            }
            break;
          case ClipType.Xor:
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
          default:
            if (e1Wc2 <= 0 || e2Wc2 <= 0) {
              return undefined;
            }
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
        }
      }
    }

    return resultOp;
  }

  deleteFromAEL(ae: Active) {
    const prev = ae.prevInAEL;
    const next = ae.nextInAEL;

    if (prev === undefined && next === undefined && ae !== this._actives) {
      return;
    }

    if (prev !== undefined) {
      prev.nextInAEL = next;
    } else {
      this._actives = next;
    }

    if (next !== undefined) {
      next.prevInAEL = prev;
    }
  }

  adjustCurrXAndCopyToSEL(topY: bigint) {
    let ae = this._actives;
    this._sel = ae;
    while (ae !== undefined) {
      ae.prevInSEL = ae.prevInAEL;
      ae.nextInSEL = ae.nextInAEL;
      ae.jump = ae.nextInSEL;

      if (ae.joinWith === JoinWith.Left) {
        ae.curX = ae.prevInAEL!.curX;
      } else {
        ae.curX = topX(ae, topY);
      }
      ae = ae.nextInAEL;
    }
  }

  executeInternal(ct: ClipType, fillRule: FillRule) {
    if (ct === ClipType.None) {
      return;
    }
    this._fillrule = fillRule;
    this._cliptype = ct;
    this.reset();
    let y: bigint;
    if (!({ y } = this.popScanline()).result) {
      return;
    }

    while (this._succeeded) {
      this.insertLocalMinimaIntoAEL(y);
      let ae: Active | undefined;
      while (({ value: ae } = this.popHorz()).result) {
        this.doHorizontal(ae!);
      }

      if (this._horzSegList.length > 0) {
        this.convertHorzSegsToJoins();
        this._horzSegList.length = 0;
      }

      this._currentBotY = y;
      if (!({ y } = this.popScanline()).result) {
        break;
      }

      this.doIntersections(y);
      this.doTopOfScanbeam(y);

      while (({ value: ae } = this.popHorz()).result) {
        this.doHorizontal(ae!);
      }
    }

    if (this._succeeded) {
      this.processHorzJoins();
    }
  }

  doIntersections(topY: bigint) {
    if (this.buildIntersectList(topY)) {
      this.processIntersectList();
      this.disposeIntersectNodes();
    }
  }

  disposeIntersectNodes() {
    this._intersectList.length = 0;
  }

  addNewIntersectNode(ae1: Active, ae2: Active, topY: bigint) {
    let ip: Point64;
    
    if (!({ip} = getIntersectPoint(ae1.bot, ae1.top, ae2.bot, ae2.top)).result) {
      ip = { x: ae1.curX, y: topY };
    }

    if (ip.y > this._currentBotY || ip.y < topY) {
      const absDx1 = Math.abs(ae1.dx);
      const absDx2 = Math.abs(ae2.dx);
      if (absDx1 > 100 && absDx2 > 100) {
        if (absDx1 > absDx2) {
          ip = getClosestPtOnSegment(ip, ae1.bot, ae1.top);
        } else {
          ip = getClosestPtOnSegment(ip, ae2.bot, ae2.top);
        }
      } else if (absDx1 > 100) {
        ip = getClosestPtOnSegment(ip, ae1.bot, ae1.top);
      } else if (absDx2 > 100) {
        ip = getClosestPtOnSegment(ip, ae2.bot, ae2.top);
      } else {
        if (ip.y < topY) {
          ip.y = topY;
        } else {
          ip.y = this._currentBotY;
        }

        if (absDx1 < absDx2) {
          ip.x = topX(ae1, ip.y);
        } else {
          ip.x = topX(ae2, ip.y);
        }
      }
    }

    const node: IntersectNode = { pt: ip, edge1: ae1, edge2: ae2 };
    this._intersectList.push(node);
  }

  buildIntersectList(topY: bigint): boolean {
    if (this._actives === undefined || this._actives.nextInAEL === undefined) {
      return false;
    }

    this.adjustCurrXAndCopyToSEL(topY);
    let left: Active | undefined = this._sel;
    let right: Active | undefined;
    let lEnd: Active | undefined;
    let rEnd: Active | undefined;
    let currBase: Active | undefined;
    let prevBase: Active | undefined;
    let tmp: Active | undefined;

    while (left!.jump !== undefined) {
      prevBase = undefined;
      while (left !== undefined && left.jump !== undefined) {
        currBase = left;
        right = left.jump;
        lEnd = right;
        rEnd = right.jump;
        left.jump = rEnd;
        while (left !== lEnd && right !== rEnd) {
          if (right!.curX < left!.curX) {
            tmp = right!.prevInSEL;
            while (true) {
              this.addNewIntersectNode(tmp!, right!, topY);
              if (tmp === left) {
                break;
              }
              tmp = tmp!.prevInSEL;
            }

            tmp = right!;
            right = extractFromSEL(tmp);
            lEnd = right;
            insert1Before2InSEL(tmp, left!);

            if (left === currBase) {
              currBase = tmp;
              currBase.jump = rEnd;
              if (prevBase === undefined) {
                this._sel = currBase;
              } else {
                prevBase.jump = currBase;
              }
            }
          } else {
            left = left!.nextInSEL;
          }
        }

        prevBase = currBase;
        left = rEnd;
      }
      left = this._sel;
    }

    return this._intersectList.length > 0;
  }

  processIntersectList() {
    this._intersectList.sort(IntersectNodeSorter);

    for (let i = 0; i < this._intersectList.length; ++i) {
      if (!edgesAdjacentInAEL(this._intersectList[i])) {
        let j = i + 1;
        while (!edgesAdjacentInAEL(this._intersectList[j])) {
          j++;
        }
        const tmp = this._intersectList[j];
        this._intersectList[j] = this._intersectList[i];
        this._intersectList[i] = tmp;
      }

      const node = this._intersectList[i];
      this.intersectEdges(node.edge1, node.edge2, node.pt);
      this.swapPositionsInAEL(node.edge1, node.edge2);

      node.edge1.curX = node.pt.x;
      node.edge2.curX = node.pt.x;
      this.checkJoinLeft(node.edge2, node.pt, true);
      this.checkJoinRight(node.edge1, node.pt, true);
    }
  }

  swapPositionsInAEL(ae1: Active, ae2: Active) {
    const next = ae2.nextInAEL;
    if (next !== undefined) {
      next.prevInAEL = ae1;
    }

    const prev = ae1.prevInAEL;
    if (prev !== undefined) {
      prev.nextInAEL = ae2;
    }

    ae2.prevInAEL = prev;
    ae2.nextInAEL = ae1;
    ae1.prevInAEL = ae2;
    ae1.nextInAEL = next;
    if (ae2.prevInAEL === undefined) {
      this._actives = ae2;
    }
  }

  addToHorzSegList(op: OutPt) {
    if (op.outrec.isOpen) {
      return;
    }

    this._horzSegList.push({ leftOp: op, leftToRight: true });
  }

  getLastOp(hotEdge: Active): OutPt {
    const outrec = hotEdge.outrec!;
    return hotEdge === outrec.frontEdge ? outrec.pts! : outrec.pts!.next!;
  }

  doHorizontal(horz: Active) {
    let pt: Point64;
    const horzIsOpen = isOpen(horz);
    const y = horz.bot.y;

    const vertex_max = horzIsOpen
      ? getCurrYMaximaVertex_Open(horz)
      : getCurrYMaximaVertex(horz);

    if (
      vertex_max !== undefined &&
      !horzIsOpen &&
      vertex_max !== horz.vertexTop
    ) {
      trimHorz(horz, this.preserveCollinear);
    }

    let {
      result: isLeftToRight,
      leftX,
      rightX,
    } = resetHorzDirection(horz, vertex_max);

    if (isHotEdge(horz)) {
      const op = addOutPt(horz, { x: horz.curX, y });
      this.addToHorzSegList(op);
    }

    while (true) {
      let ae = isLeftToRight ? horz.nextInAEL : horz.prevInAEL;

      while (ae !== undefined) {
        if (ae.vertexTop === vertex_max) {
          if (isHotEdge(horz) && isJoined(ae!)) {
            this.split(ae, ae.top);
          }

          if (isHotEdge(horz)) {
            while (horz.vertexTop !== vertex_max) {
              addOutPt(horz, horz.top);
              this.updateEdgeIntoAEL(horz);
            }

            if (isLeftToRight) {
              this.addLocalMaxPoly(horz, ae, horz.top);
            } else {
              this.addLocalMaxPoly(ae, horz, horz.top);
            }
          }

          this.deleteFromAEL(ae);
          this.deleteFromAEL(horz);
          return;
        }

        if (vertex_max !== horz.vertexTop || isOpenEnd(horz)) {
          if (
            (isLeftToRight && ae.curX > rightX) ||
            (!isLeftToRight && ae.curX < leftX)
          ) {
            break;
          }

          if (ae.curX === horz.top.x && !isHorizontal(ae)) {
            pt = nextVertex(horz).pt;

            if (isOpen(ae) && !isSamePolyType(ae, horz) && !isHotEdge(ae)) {
              if (
                (isLeftToRight && topX(ae, pt.y) > pt.x) ||
                (!isLeftToRight && topX(ae, pt.y) < pt.x)
              ) {
                break;
              }
            } else if (
              (isLeftToRight && topX(ae, pt.y) >= pt.x) ||
              (!isLeftToRight && topX(ae, pt.y) <= pt.x)
            ) {
              break;
            }
          }
        }

        pt = { x: ae.curX, y };

        if (isLeftToRight) {
          this.intersectEdges(horz, ae, pt);
          this.swapPositionsInAEL(horz, ae);
          horz.curX = ae.curX;
          ae = horz.nextInAEL;
        } else {
          this.intersectEdges(ae, horz, pt);
          this.swapPositionsInAEL(ae, horz);
          horz.curX = ae.curX;
          ae = horz.prevInAEL;
        }

        if (isHotEdge(horz)) {
          this.addToHorzSegList(this.getLastOp(horz));
        }
      }

      if (horzIsOpen && isOpenEnd(horz)) {
        if (isHotEdge(horz)) {
          addOutPt(horz, horz.top);
          if (isFront(horz)) {
            horz.outrec!.frontEdge = undefined;
          } else {
            horz.outrec!.backEdge = undefined;
          }
          horz.outrec = undefined;
        }
        this.deleteFromAEL(horz);
        return;
      } else if (nextVertex(horz).pt.y !== horz.top.y) {
        break;
      }

      if (isHotEdge(horz)) {
        addOutPt(horz, horz.top);
      }

      this.updateEdgeIntoAEL(horz);

      if (this.preserveCollinear && !horzIsOpen && horzIsSpike(horz)) {
        trimHorz(horz, true);
      }

      ({
        result: isLeftToRight,
        leftX,
        rightX,
      } = resetHorzDirection(horz, vertex_max));
    }

    if (isHotEdge(horz)) {
      const op = addOutPt(horz, horz.top);
      this.addToHorzSegList(op);
    }

    this.updateEdgeIntoAEL(horz);
  }

  doTopOfScanbeam(y: bigint) {
    this._sel = undefined;
    let ae = this._actives;
    while (ae !== undefined) {
      if (ae.top.y === y) {
        ae.curX = ae.top.x;
        if (isMaxima(ae)) {
          ae = this.doMaxima(ae);
          continue;
        }

        if (isHotEdge(ae)) {
          addOutPt(ae, ae.top);
        }

        this.updateEdgeIntoAEL(ae);

        if (isHorizontal(ae)) {
          this.pushHorz(ae);
        }
      } else {
        ae.curX = topX(ae, y);
      }

      ae = ae.nextInAEL;
    }
  }

  doMaxima(ae: Active): Active | undefined {
    const prevE: Active | undefined = ae.prevInAEL;
    let nextE: Active | undefined = ae.nextInAEL;

    if (isOpenEnd(ae)) {
      if (isHotEdge(ae)) {
        addOutPt(ae, ae.top);
      }

      if (!isHorizontal(ae)) {
        if (isHotEdge(ae)) {
          if (isFront(ae)) {
            ae.outrec!.frontEdge = undefined;
          } else {
            ae.outrec!.backEdge = undefined;
          }
          ae.outrec = undefined;
        }
        this.deleteFromAEL(ae);
      }

      return nextE;
    }

    const maxPair: Active | undefined = getMaximaPair(ae);

    if (maxPair === undefined) {
      return nextE;
    }

    if (isJoined(ae)) {
      this.split(ae, ae.top);
    }
    if (isJoined(maxPair)) {
      this.split(maxPair, maxPair.top);
    }

    while (nextE !== maxPair) {
      this.intersectEdges(ae, nextE!, ae.top);
      this.swapPositionsInAEL(ae, nextE!);
      nextE = ae.nextInAEL;
    }

    if (isOpen(ae)) {
      if (isHotEdge(ae)) {
        this.addLocalMaxPoly(ae, maxPair, ae.top);
      }
      this.deleteFromAEL(maxPair);
      this.deleteFromAEL(ae);
    } else {
      if (isHotEdge(ae)) {
        this.addLocalMaxPoly(ae, maxPair, ae.top);
      }
      this.deleteFromAEL(ae);
      this.deleteFromAEL(maxPair);
    }

    return prevE !== undefined ? prevE.nextInAEL : this._actives;
  }

  split(e: Active, currPt: Point64) {
    if (e.joinWith === JoinWith.Right) {
      e.joinWith = JoinWith.None;
      e.nextInAEL!.joinWith = JoinWith.None;
      this.addLocalMinPoly(e, e.nextInAEL!, currPt, true);
    } else {
      e.joinWith = JoinWith.None;
      e.prevInAEL!.joinWith = JoinWith.None;
      this.addLocalMinPoly(e.prevInAEL!, e, currPt, true);
    }
  }

  checkJoinLeft(e: Active, pt: Point64, checkCurrX: boolean = false) {
    const prev = e.prevInAEL;

    if (
      prev === undefined ||
      isOpen(e) ||
      isOpen(prev) ||
      !isHotEdge(e) ||
      !isHotEdge(prev)
    ) {
      return;
    }

    if (
      (pt.y < e.top.y + 2n || pt.y < prev.top.y + 2n) &&
      (e.bot.y > pt.y || prev.bot.y > pt.y)
    ) {
      return;
    }

    if (checkCurrX) {
      if (perpendicDistFromLineSqrd(pt, prev.bot, prev.top) > 0.25) {
        return;
      }
    } else if (e.curX !== prev.curX) {
      return;
    }

    if (crossProduct(e.top, pt, prev.top) !== 0) {
      return;
    }

    if (e.outrec!.idx === prev.outrec!.idx) {
      this.addLocalMaxPoly(prev, e, pt);
    } else if (e.outrec!.idx < prev.outrec!.idx) {
      joinOutrecPaths(e, prev);
    } else {
      joinOutrecPaths(prev, e);
    }
    prev.joinWith = JoinWith.Right;
    e.joinWith = JoinWith.Left;
  }

  checkJoinRight(e: Active, pt: Point64, checkCurrX: boolean = false) {
    const next = e.nextInAEL;

    if (
      isOpen(e) ||
      !isHotEdge(e) ||
      isJoined(e) ||
      next === undefined ||
      isOpen(next) ||
      !isHotEdge(next)
    ) {
      return;
    }

    if (
      (pt.y < e.top.y + 2n || pt.y < next.top.y + 2n) &&
      (e.bot.y > pt.y || next.bot.y > pt.y)
    ) {
      return;
    }

    if (checkCurrX) {
      if (perpendicDistFromLineSqrd(pt, next.bot, next.top) > 0.25) {
        return;
      }
    } else if (e.curX !== next.curX) {
      return;
    }

    if (crossProduct(e.top, pt, next.top) !== 0) {
      return;
    }

    if (e.outrec!.idx === next.outrec!.idx) {
      this.addLocalMaxPoly(e, next, pt);
    } else if (e.outrec!.idx < next.outrec!.idx) {
      joinOutrecPaths(e, next);
    } else {
      joinOutrecPaths(next, e);
    }
    e.joinWith = JoinWith.Right;
    next.joinWith = JoinWith.Left;
  }

  convertHorzSegsToJoins() {
    let k = 0;

    for (const hs of this._horzSegList) {
      if (updateHorzSegment(hs)) {
        k++;
      }
    }

    if (k < 2) {
      return;
    }

    this._horzSegList.sort(HorzSegSorter);

    for (let i = 0; i < k - 1; i++) {
      const hs1 = this._horzSegList[i];

      for (let j = i + 1; j < k; j++) {
        const hs2 = this._horzSegList[j];

        if (
          hs2.leftOp!.pt.x >= hs1.rightOp!.pt.x ||
          hs2.leftToRight === hs1.leftToRight ||
          hs2.rightOp!.pt.x <= hs1.leftOp!.pt.x
        ) {
          continue;
        }

        const curr_y = hs1.leftOp!.pt.y;

        if (hs1.leftToRight) {
          while (
            hs1.leftOp!.next!.pt.y === curr_y &&
            hs1.leftOp!.next!.pt.x <= hs2.leftOp!.pt.x
          ) {
            hs1.leftOp = hs1.leftOp!.next;
          }
          while (
            hs2.leftOp!.prev!.pt.y === curr_y &&
            hs2.leftOp!.prev!.pt.x <= hs1.leftOp!.pt.x
          ) {
            hs2.leftOp = hs2.leftOp!.prev;
          }

          const join: HorzJoin = {
            op1: duplicateOp(hs1.leftOp!, true),
            op2: duplicateOp(hs2.leftOp!, false),
          };
          this._horzJoinList.push(join);
        } else {
          while (
            hs1.leftOp!.prev!.pt.y === curr_y &&
            hs1.leftOp!.prev!.pt.x <= hs2.leftOp!.pt.x
          ) {
            hs1.leftOp = hs1.leftOp!.prev;
          }
          while (
            hs2.leftOp!.next!.pt.y === curr_y &&
            hs2.leftOp!.next!.pt.x <= hs1.leftOp!.pt.x
          ) {
            hs2.leftOp = hs2.leftOp!.next;
          }

          const join: HorzJoin = {
            op1: duplicateOp(hs2.leftOp!, true),
            op2: duplicateOp(hs1.leftOp!, false),
          };
          this._horzJoinList.push(join);
        }
      }
    }
  }

  moveSplits(fromOr: OutRec, toOr: OutRec) {
    if (fromOr.splits === undefined) {
      return;
    }

    toOr.splits ??= [];

    for (const i of fromOr.splits) {
      toOr.splits.push(i);
    }

    fromOr.splits = undefined;
  }

  processHorzJoins() {
    for (const j of this._horzJoinList) {
      const or1 = getRealOutRec(j.op1!.outrec)!;
      let or2 = getRealOutRec(j.op2!.outrec)!;

      const op1b = j.op1!.next!;
      const op2b = j.op2!.prev!;

      j.op1!.next = j.op2;
      j.op2!.prev = j.op1!;

      op1b.prev = op2b;
      op2b.next = op1b;

      if (or1 === or2) {
        or2 = this.newOutRec();
        or2.pts = op1b;
        fixOutRecPts(or2);

        if (or1.pts!.outrec === or2) {
          or1.pts = j.op1!;
          or1.pts!.outrec = or1;
        }

        if (this._using_polytree) {
          if (path1InsidePath2(or1.pts!, or2.pts!)) {
            const tmp = or1.pts;
            or1.pts = or2.pts;
            or2.pts = tmp;
            fixOutRecPts(or1);
            fixOutRecPts(or2);
            or2.owner = or1;
          } else if (path1InsidePath2(or2.pts!, or1.pts!)) {
            or2.owner = or1;
          } else {
            or2.owner = or1.owner;
          }
          or1.splits ??= [];
          or1.splits.push(or2.idx);
        } else {
          or2.owner = or1;
        }
      } else {
        or2.pts = undefined;

        if (this._using_polytree) {
          setOwner(or2, or1);
          this.moveSplits(or2, or1);
        } else {
          or2.owner = or1;
        }
      }
    }
  }

  cleanCollinear(outrec?: OutRec) {
    outrec = getRealOutRec(outrec);
    if (outrec === undefined || outrec.isOpen) {
      return;
    }

    if (!isValidClosedPath(outrec.pts)) {
      outrec.pts = undefined;
      return;
    }

    let startOp = outrec.pts!;
    let op2: OutPt | undefined = startOp;

    while (true) {
      if (
        crossProduct(op2!.prev.pt, op2!.pt, op2!.next!.pt) === 0 &&
        (Point64.equals(op2!.pt, op2!.prev.pt) ||
          Point64.equals(op2!.pt, op2!.next!.pt) ||
          !this.preserveCollinear ||
          dotProduct(op2!.prev.pt, op2!.pt, op2!.next!.pt) < 0)
      ) {
        if (op2 === outrec.pts) {
          outrec.pts = op2!.prev;
        }

        op2 = disposeOutPt(op2!);

        if (!isValidClosedPath(op2)) {
          outrec.pts = undefined;
          return;
        }

        startOp = op2!;
        continue;
      }

      op2 = op2!.next;

      if (op2 === startOp) {
        break;
      }
    }
    this.fixSelfIntersects(outrec);
  }

  doSplitOp(outrec: OutRec, splitOp: OutPt) {
    const prevOp = splitOp.prev;
    const nextNextOp = splitOp.next!.next!;
    outrec.pts = prevOp;

    const { ip } = getIntersectPoint(
      prevOp.pt,
      splitOp.pt,
      splitOp.next!.pt,
      nextNextOp.pt,
    );

    const area1 = area(prevOp);
    const absArea1 = Math.abs(area1);

    if (absArea1 < 2) {
      outrec.pts = undefined;
      return;
    }

    const area2 = areaTriangle(ip, splitOp.pt, splitOp.next!.pt);
    const absArea2 = Math.abs(area2);

    if (Point64.equals(ip, prevOp.pt) || Point64.equals(ip, nextNextOp.pt)) {
      nextNextOp.prev = prevOp;
      prevOp.next = nextNextOp;
    } else {
      const newOp2: OutPt = {
        pt: ip,
        outrec: outrec,
        prev: prevOp,
        next: nextNextOp,
      };
      nextNextOp.prev = newOp2;
      prevOp.next = newOp2;
    }

    if (absArea2 > 1 && (absArea2 > absArea1 || area2 > 0 === area1 > 0)) {
      const newOutRec = this.newOutRec();
      newOutRec.owner = outrec.owner;
      splitOp.outrec = newOutRec;
      splitOp.next!.outrec = newOutRec;

      const newOp: OutPt = {
        pt: ip,
        outrec: newOutRec,
        prev: splitOp.next!,
        next: splitOp,
      };
      newOutRec.pts = newOp;
      splitOp.prev = newOp;
      splitOp.next!.next = newOp;

      if (this._using_polytree) {
        if (path1InsidePath2(prevOp, newOp)) {
          newOutRec.splits ??= [];
          newOutRec.splits.push(outrec.idx);
        } else {
          outrec.splits ??= [];
          outrec.splits.push(newOutRec.idx);
        }
      }
    }
  }

  fixSelfIntersects(outrec: OutRec) {
    let op2 = outrec.pts!;

    while (true) {
      if (op2.prev === op2.next!.next) {
        break;
      }

      if (
        segsIntersect(op2.prev.pt, op2.pt, op2.next!.pt, op2.next!.next!.pt)
      ) {
        this.doSplitOp(outrec, op2);
        if (outrec.pts === undefined) {
          return;
        }
        op2 = outrec.pts;
        continue;
      } else {
        op2 = op2.next!;
      }

      if (op2 === outrec.pts) {
        break;
      }
    }
  }

  buildPaths(solutionClosed: Paths64, solutionOpen: Paths64): boolean {
    solutionClosed.clear();
    solutionOpen.clear();
    let i = 0;
    while (i < this._outrecList.length) {
      const outrec = this._outrecList[i++];
      if (outrec.pts === undefined) {
        continue;
      }

      const path: Path64 = new Path64();
      if (outrec.isOpen) {
        if (buildPath(outrec.pts, this.reverseSolution, true, path)) {
          solutionOpen.push(path);
        }
      } else {
        this.cleanCollinear(outrec);
        if (buildPath(outrec.pts, this.reverseSolution, false, path)) {
          solutionClosed.push(path);
        }
      }
    }

    return true;
  }

  checkBounds(outrec: OutRec): boolean {
    if (outrec.pts === undefined) {
      return false;
    }

    if (!outrec.bounds.isEmpty()) {
      return true;
    }

    this.cleanCollinear(outrec);

    if (
      outrec.pts === undefined ||
      !buildPath(outrec.pts, this.reverseSolution, false, outrec.path)
    ) {
      return false;
    }

    outrec.bounds = getBounds(outrec.path);
    return true;
  }

  checkSplitOwner(outrec: OutRec, splits?: number[]) {
    if (splits === undefined) {
      return false;
    }

    for (const i of splits) {
      const split = getRealOutRec(this._outrecList[i]);
      if (
        split === undefined ||
        split === outrec ||
        split.recursiveSplit === outrec
      ) {
        continue;
      }
      split.recursiveSplit = outrec;

      if (
        split!.splits !== undefined &&
        this.checkSplitOwner(outrec, split.splits)
      ) {
        return true;
      }

      if (
        isValidOwner(outrec, split) &&
        this.checkBounds(split) &&
        split.bounds.contains(outrec.bounds) &&
        path1InsidePath2(outrec.pts!, split.pts!)
      ) {
        outrec.owner = split;
        return true;
      }
    }
    return false;
  }

  recursiveCheckOwners(outrec: OutRec, polypath: PolyPathBase) {
    if (outrec.polypath !== undefined || outrec.bounds.isEmpty()) {
      return;
    }

    while (outrec.owner !== undefined) {
      if (
        outrec.owner.splits !== undefined &&
        this.checkSplitOwner(outrec, outrec.owner.splits)
      ) {
        break;
      } else if (
        outrec.owner.pts !== undefined &&
        this.checkBounds(outrec.owner) &&
        path1InsidePath2(outrec.pts!, outrec.owner.pts!)
      ) {
        break;
      }

      outrec.owner = outrec.owner.owner;
    }

    if (outrec.owner !== undefined) {
      if (outrec.owner.polypath !== undefined) {
        this.recursiveCheckOwners(outrec.owner, polypath);
      }
      outrec.polypath = outrec.owner.polypath!.addChild(outrec.path);
    } else {
      outrec.polypath = polypath.addChild(outrec.path);
    }
  }

  buildTree(polytree: PolyPathBase, solutionOpen: Paths64) {
    polytree.clear();
    solutionOpen.clear();

    let i = 0;

    while (i < this._outrecList.length) {
      const outrec = this._outrecList[i++];
      if (outrec.pts === undefined) {
        continue;
      }

      if (outrec.isOpen) {
        const open_path: Path64 = new Path64();
        if (buildPath(outrec.pts, this.reverseSolution, true, open_path)) {
          solutionOpen.push(open_path);
        }
        continue;
      }

      if (this.checkBounds(outrec)) {
        this.recursiveCheckOwners(outrec, polytree);
      }
    }
  }

  getBounds(): Rect64 {
    const bounds = new Rect64(false);

    for (const t of this._vertexList) {
      let v = t;

      do {
        if (v.pt.x < bounds.left) {
          bounds.left = v.pt.x;
        }
        if (v.pt.x > bounds.right) {
          bounds.right = v.pt.x;
        }
        if (v.pt.y < bounds.top) {
          bounds.top = v.pt.y;
        }
        if (v.pt.y > bounds.bottom) {
          bounds.bottom = v.pt.y;
        }
        v = v.next!;
      } while (v !== t);
    }

    return bounds.isEmpty() ? new Rect64() : bounds;
  }
}
