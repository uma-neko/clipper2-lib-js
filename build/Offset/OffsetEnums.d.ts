export declare const JoinType: {
    readonly Square: 0;
    readonly Round: 1;
    readonly Miter: 2;
};
export type JoinType = (typeof JoinType)[keyof typeof JoinType];
export declare const EndType: {
    readonly Polygon: 0;
    readonly Joined: 1;
    readonly Butt: 2;
    readonly Square: 3;
    readonly Round: 4;
};
export type EndType = (typeof EndType)[keyof typeof EndType];
