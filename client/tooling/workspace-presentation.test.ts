import { describe, it, expect } from "vitest";
import type { Workspace } from "@skynet/contracts";
import { visiblePanes } from "../packages/workspace/src/Workspace";
import {
    insertionBefore,
    launcherDragCenter,
    previewPlacement,
} from "../packages/workspace/src/launcherLayout";

const split: Workspace = {
    mode: "apps",
    panes: ["settings", "agent"],
    ratio: 2 / 3,
    recent: ["agent", "settings"],
    dock: ["agent"],
    desktop: ["settings"],
};
describe("workspace presentation", () => {
    it.each([
        [60, 5, 10],
        [60, 49, 40],
        [57, 7, 46],
        [60, 30, 30],
    ])(
        "keeps the grab point on a %ipx tile pressed at (%i, %i)",
        (width, grabX, grabY) => {
            const bounds = { left: 120, top: 75, width, height: width };
            const centerAt = launcherDragCenter(
                bounds,
                bounds.left + grabX,
                bounds.top + grabY,
                60,
            );
            for (const [pointerX, pointerY] of [
                [108, 92],
                [510, 405],
            ]) {
                const center = centerAt(pointerX, pointerY);
                expect(pointerX - (center.x - 30)).toBeCloseTo(
                    (grabX / width) * 60,
                );
                expect(pointerY - (center.y - 30)).toBeCloseTo(
                    (grabY / width) * 60,
                );
            }
        },
    );
    it("targets the actual wrapped row and previews a move across containers", () => {
        const ids = ["settings", "notes", "calendar"];
        const slots = ids.map((id, index) => {
            const left = (index % 2) * 100;
            const top = Math.floor(index / 2) * 100;
            return {
                id,
                rect: { left, top, right: left + 60, bottom: top + 80 },
            };
        });
        expect(insertionBefore(slots, "settings", 120, 40)).toBe("calendar");
        expect(insertionBefore(slots, "calendar", 30, 40)).toBe("settings");
        expect(insertionBefore(slots, "notes", 30, 140)).toBe("");
        const layout = { desktop: ids, dock: ["agent"] };
        const before = insertionBefore(slots, "agent", 10, 130);
        expect(
            previewPlacement(layout, "agent", { area: "desktop", before }),
        ).toEqual({
            desktop: ["settings", "notes", "agent", "calendar"],
            dock: [],
        });
        expect(layout.dock).toEqual(["agent"]);
    });
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
