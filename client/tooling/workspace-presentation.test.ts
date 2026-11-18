import { describe, it, expect } from "vitest";
import type { Workspace } from "@skynet/contracts";
import { visiblePanes } from "../packages/workspace/src/Workspace";

const split: Workspace = {
    mode: "apps",
    panes: ["settings", "agent"],
    ratio: 2 / 3,
    recent: ["agent", "settings"],
};
describe("workspace presentation", () => {
    it("exposes only the recent pane at narrow widths and restores the pair", () => {
        expect(visiblePanes(split, true)).toEqual(["settings", "agent"]);
        expect(visiblePanes(split, false)).toEqual(["agent"]);
        expect(visiblePanes(split, true)).toEqual(["settings", "agent"]);
        expect(split.ratio).toBe(2 / 3);
    });
    it.each(["desktop", "overview"] as const)(
        "hides all apps in %s",
        (mode) => {
            expect(visiblePanes({ ...split, mode }, true)).toEqual([]);
        },
    );
    it("retains the empty launcher only when both panes fit", () => {
        const workspace = { ...split, panes: [null, "settings"] };
        expect(visiblePanes(workspace, false)).toEqual(["settings"]);
        expect(visiblePanes(workspace, true)).toEqual([null, "settings"]);
    });
});
