import { test, expect, describe } from "vitest";
import { Rect64, Paths64, Clipper } from "../../src/clipper2lib";
import { getBounds } from "../../src/Clipper";

describe(
  "RectClip test",
  async () => {
    test("1. ", async () => {
      const sub = new Paths64();
      const clp = new Paths64();
      let sol: Paths64;
      let rect = new Rect64(100n, 100n, 700n, 500n);
      clp.push(rect.asPath());

      sub.push(Clipper.makePath64([100, 100, 700, 100, 700, 500, 100, 500]));
      sol = Clipper.rectClip(rect, sub);
      expect(Clipper.area(sol)).toBe(Clipper.area(sub));

      sub.clear();
      sub.push(Clipper.makePath64([110, 110, 700, 100, 700, 500, 100, 500]));
      sol = Clipper.rectClip(rect, sub);
      expect(Clipper.area(sol)).toBe(Clipper.area(sub));

      sub.clear();
      sub.push(Clipper.makePath64([90, 90, 700, 100, 700, 500, 100, 500]));
      sol = Clipper.rectClip(rect, sub);
      expect(Clipper.area(sol)).toBe(Clipper.area(clp));

      sub.clear();
      sub.push(Clipper.makePath64([110, 110, 690, 110, 690, 490, 110, 490]));
      sol = Clipper.rectClip(rect, sub);
      expect(Clipper.area(sol)).toBe(Clipper.area(sub));

      sub.clear();
      clp.clear();
      rect = new Rect64(390n, 290n, 410n, 310n);
      clp.push(rect.asPath());
      sub.push(Clipper.makePath64([410, 290, 500, 290, 500, 310, 410, 310]));
      sol = Clipper.rectClip(rect, sub);
      expect(Clipper.area(sol)).toBe(0);

      sub.clear();
      sub.push(Clipper.makePath64([430, 290, 470, 330, 390, 330]));
      sol = Clipper.rectClip(rect, sub);
      expect(Clipper.area(sol)).toBe(0);

      sub.clear();
      sub.push(Clipper.makePath64([450, 290, 480, 330, 450, 330]));
      sol = Clipper.rectClip(rect, sub);
      expect(Clipper.area(sol)).toBe(0);

      sub.clear();
      sub.push(
        Clipper.makePath64([
          208, 66, 366, 112, 402, 303, 234, 332, 233, 262, 243, 140, 215, 126,
          40, 172,
        ]),
      );
      rect = new Rect64(237n, 164n, 322n, 248n);
      sol = Clipper.rectClip(rect, sub);
      const solBounds = getBounds(sol);
      expect(solBounds.width).toBe(rect.width);
      expect(solBounds.height).toBe(rect.height);
    });

    test("2. Unexpected spike when clipping a long and narrow rectangle.", async () => {
      const sub = new Paths64();
      let sol: Paths64;
      const rect = new Rect64(54690n, 0n, 65628n, 6000n);
      sub.push(
        Clipper.makePath64([700000, 6000, 0, 6000, 0, 5925, 700000, 5925]),
      );
      sol = Clipper.rectClip(rect, sub);
      expect(sol.length).toBe(1);
      expect(sol[0].length).toBe(4);
    });

    test("3. Infinite loop.", async () => {
      const sub = new Paths64();
      const clip = new Paths64();
      let sol: Paths64;
      const rect = new Rect64(
        -1800000000n,
        -137573171n,
        -1741475021n,
        3355443n,
      );
      sub.push(
        Clipper.makePath64([
          -1800000000n,
          10005000n,
          -1800000000n,
          -5000n,
          -1789994999n,
          -5000n,
          -1789994999n,
          10005000n,
        ]),
      );
      clip.push(rect.asPath());
      sol = Clipper.rectClip(rect, sub);
      expect(sol.length).toBe(1);
    });
  },
  { timeout: 10 },
);
