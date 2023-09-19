export declare const PointInPolygonResult: {
    readonly IsOn: 0;
    readonly IsInside: 1;
    readonly IsOutside: 2;
};
export type PointInPolygonResult = number;
export declare const VertexFlags: {
    readonly None: 0;
    readonly OpenStart: 1;
    readonly OpenEnd: 2;
    readonly LocalMax: 4;
    readonly LocalMin: 8;
};
export type VertexFlags = number;
export declare const JoinWith: {
    readonly None: 0;
    readonly Left: 1;
    readonly Right: 2;
};
export type JoinWith = (typeof JoinWith)[keyof typeof JoinWith];
export declare const HorzPosition: {
    readonly Bottom: 1;
    readonly Middle: 2;
    readonly Top: 3;
};
export type HorzPosition = (typeof HorzPosition)[keyof typeof HorzPosition];
