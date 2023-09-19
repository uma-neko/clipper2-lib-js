export declare const FillRule: {
    readonly EvenOdd: 0;
    readonly NonZero: 1;
    readonly Positive: 2;
    readonly Negative: 3;
};
export type FillRule = (typeof FillRule)[keyof typeof FillRule];
export declare const ClipType: {
    readonly None: 0;
    readonly Intersection: 1;
    readonly Union: 2;
    readonly Difference: 3;
    readonly Xor: 4;
};
export type ClipType = (typeof ClipType)[keyof typeof ClipType];
export declare const PathType: {
    readonly Subject: 1;
    readonly Clip: 2;
};
export type PathType = (typeof PathType)[keyof typeof PathType];
