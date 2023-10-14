import { test, expect, describe } from "vitest";
import { Clipper } from "../../src/clipper2lib";

describe(
  "Trim collinear test",
  async () => {
    test("1. ", async () => {
      const input1 = Clipper.makePath64([
        10, 10, 10, 10, 50, 10, 100, 10, 100, 100, 10, 100, 10, 10, 20, 10,
      ]);
      const output1 = Clipper.trimCollinear(input1, false);
      expect(output1.length).eq(4);

      const input2 = Clipper.makePath64([
        10, 10, 10, 10, 100, 10, 100, 100, 10, 100, 10, 10, 10, 10,
      ]);
      const output2 = Clipper.trimCollinear(input2, true);
      expect(output2.length).eq(5);

      const input3 = Clipper.makePath64([
        10, 10, 10, 50, 10, 10, 50, 10, 50, 50, 50, 10, 70, 10, 70, 50, 70, 10,
        50, 10, 100, 10, 100, 50, 100, 10,
      ]);
      const output3 = Clipper.trimCollinear(input3);
      expect(output3.length).eq(0);

      const input4 = Clipper.makePath64([
        2, 3, 3, 4, 4, 4, 4, 5, 7, 5, 8, 4, 8, 3, 9, 3, 8, 3, 7, 3, 6, 3, 5, 3,
        4, 3, 3, 3, 2, 3,
      ]);
      const output4a = Clipper.trimCollinear(input4);
      const output4b = Clipper.trimCollinear(output4a);

      const area4a = Clipper.area(output4a);
      const area4b = Clipper.area(output4b);

      expect(output4a.length).eq(7);
      expect(area4a).eq(-9);
      expect(output4a.length).eq(output4b.length);
      expect(area4a).eq(area4b);
    });
  },
  { timeout: 1000 },
);
