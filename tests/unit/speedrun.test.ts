import { describe, expect, it } from "vitest";
import { formatTime, rankTrending } from "@/lib/speedrun";

const g = (id: string) => ({ game: { data: { id, names: { international: id.toUpperCase() }, abbreviation: id, weblink: "", assets: { "cover-large": { uri: `c/${id}` } } } } });
describe("speedrun", () => {
  it("ranks games by recent verified runs", () => {
    const r = rankTrending([g("a"), g("b"), g("b"), g("c"), g("b"), g("a")]);
    expect(r.map((x) => [x.id, x.runs])).toEqual([["b", 3], ["a", 2], ["c", 1]]);
    expect(r[0].cover).toBe("c/b");
  });
  it("formats times", () => {
    expect(formatTime(42.5)).toBe("42.500s");
    expect(formatTime(754)).toBe("12m 34s");
    expect(formatTime(3725)).toBe("1h 02m 05s");
  });
});
