import { describe, expect, it } from "vitest";
import { tokens } from "@skynet/tokens";
import {
    beginDividerDrag,
    moveDividerDrag,
    splitFrames,
    gripPlacement,
    splitLayout,
    stepDivider,
} from "../packages/workspace/src/geometry";
import settings from "../builtins/settings/src/runtime";

describe("workspace direct manipulation", () => {
    it("snaps at thirds and half with hysteresis", () => {
        const width = 1280;
        const start = beginDividerDrag(1 / 2, width);
        const delta = (width - tokens.shell.divider) * (1 / 3 - 1 / 2);
        const third = moveDividerDrag(start, delta + 19);
        expect(third.preview.ratio).toBe(1 / 3);
        expect(moveDividerDrag(third, delta + 31).preview.ratio).toBe(1 / 3);
        expect(moveDividerDrag(third, delta + 33).preview.ratio).not.toBe(
            1 / 3,
        );
        expect(moveDividerDrag(start, 18).preview.ratio).toBe(1 / 2);
        expect(moveDividerDrag(start, -delta).preview.ratio).toBe(2 / 3);
    });
    it("keeps both sides at least one third while dragging", () => {
        for (const width of [728, 800, 1280, 2560]) {
            const start = beginDividerDrag(1 / 2, width);
            expect(moveDividerDrag(start, -width).preview.ratio).toBe(1 / 3);
            expect(moveDividerDrag(start, width).preview.ratio).toBe(2 / 3);
            const delta = (width - tokens.shell.divider) / 6;
            expect(moveDividerDrag(start, -delta).preview.ratio).toBe(1 / 3);
            expect(moveDividerDrag(start, delta).preview.ratio).toBe(2 / 3);
        }
    });
    it("requires a deliberate drag beyond either minimum and allows pulling back", () => {
        for (const width of [728, 800, 1280, 2560]) {
            const distance = tokens.shell.collapseDistance;
            const leftStop = beginDividerDrag(1 / 3, width);
            expect(leftStop.preview.collapse).toBeUndefined();
            expect(
                moveDividerDrag(leftStop, -distance + 1).preview.collapse,
            ).toBeUndefined();
            const left = moveDividerDrag(leftStop, -distance);
            expect(left.preview).toMatchObject({
                ratio: 1 / 3,
                collapse: "left",
            });
            expect(moveDividerDrag(left, 0).preview.collapse).toBeUndefined();
            const rightStop = beginDividerDrag(2 / 3, width);
            expect(rightStop.preview.collapse).toBeUndefined();
            expect(
                moveDividerDrag(rightStop, distance - 1).preview.collapse,
            ).toBeUndefined();
            const right = moveDividerDrag(rightStop, distance);
            expect(right.preview).toMatchObject({
                ratio: 2 / 3,
                collapse: "right",
            });
            expect(moveDividerDrag(right, 0).preview.collapse).toBeUndefined();
        }
    });
    it("stops a fast first movement at the boundary before a further push can preview fullscreen", () => {
        const start = beginDividerDrag(1 / 2, 1280);
        const stop = moveDividerDrag(start, 460);
        expect(stop.preview.collapse).toBeUndefined();
        expect(stop.preview.ratio).toBe(2 / 3);
        const full = moveDividerDrag(stop, 460 + tokens.shell.collapseDistance);
        expect(full.preview.collapse).toBe("right");
        expect(
            moveDividerDrag(full, 460 + tokens.shell.snapRelease + 1).preview
                .collapse,
        ).toBe("right");
        expect(moveDividerDrag(full, 460).preview.collapse).toBeUndefined();
    });
    it("fills the container exactly at all ratios, including zero-width collapsed content", () => {
        for (const width of [0, 393, 728, 1024, 1280, 2560]) {
            for (const ratio of [1 / 3, 0.4, 1 / 2, 0.6, 2 / 3]) {
                const frame = splitFrames(width, ratio);
                const [left, right] = frame.panes;
                expect(left.left).toBe(0);
                expect(frame.divider.left).toBe(left.width);
                expect(right.left).toBeCloseTo(
                    left.width + frame.divider.width,
                );
                expect(right.left + right.width).toBeCloseTo(width);
                expect(left.width).toBeGreaterThanOrEqual(
                    (width - frame.divider.width) / 3 - 0.00001,
                );
                expect(right.width).toBeGreaterThanOrEqual(
                    (width - frame.divider.width) / 3 - 0.00001,
                );
            }
            expect(splitFrames(width, 1 / 3, "left").panes).toEqual([
                { left: 0, width: 0 },
                { left: 0, width },
            ]);
            expect(splitFrames(width, 2 / 3, "right").panes).toEqual([
                { left: 0, width },
                { left: width, width: 0 },
            ]);
        }
    });
    it("keeps a session relative to its original container while the handle and preview move", () => {
        let drag = beginDividerDrag(1 / 2, 1200);
        for (const dx of [40, 80, 120, 160]) {
            drag = moveDividerDrag(drag, dx);
            expect(drag.preview.ratio).toBeCloseTo(1 / 2 + dx / 1192);
        }
        drag = moveDividerDrag(drag, 200);
        expect(drag.preview.ratio).toBe(2 / 3);
        expect(drag.preview.collapse).toBeUndefined();
        drag = moveDividerDrag(drag, 311);
        expect(drag.preview.collapse).toBeUndefined();
        drag = moveDividerDrag(drag, 312);
        expect(drag.preview.collapse).toBe("right");
        drag = moveDividerDrag(drag, 0);
        expect(drag.preview).toMatchObject({ ratio: 1 / 2 });
        expect(drag.preview.collapse).toBeUndefined();
    });
    it("releases live placement when the grip is pulled back", () => {
        expect(gripPlacement(100, -400, 1280)).toBe("left");
        expect(gripPlacement(1180, 400, 1280)).toBe("right");
        expect(gripPlacement(640, 0, 1280)).toBeUndefined();
        expect(gripPlacement(640, 100, 1280)).toBeUndefined();
        expect(gripPlacement(10, -100, 600)).toBeUndefined();
    });
    it("swaps sides without losing either application or its width", () => {
        expect(
            splitLayout(["settings", "agent"], 1 / 3, "settings", "right"),
        ).toEqual({ panes: ["agent", "settings"], ratio: 2 / 3 });
        expect(
            splitLayout(["settings", null], 0.5, "settings", "right"),
        ).toEqual({ panes: [null, "settings"], ratio: 0.5 });
        expect(
            splitLayout(["settings", "agent"], 0.4, "agent", "right"),
        ).toEqual({ panes: ["settings", "agent"], ratio: 0.4 });
        expect(splitLayout(["settings"], 0.5, "settings", "left")).toEqual({
            panes: ["settings", null],
            ratio: 0.5,
        });
    });
    it("steps accessibility adjustments through thirds and half", () => {
        expect(stepDivider(1 / 3, true)).toEqual({ ratio: 1 / 2 });
        expect(stepDivider(1 / 2, true)).toEqual({ ratio: 2 / 3 });
        expect(stepDivider(2 / 3, true)).toEqual({
            ratio: 2 / 3,
            collapse: "right",
        });
        expect(stepDivider(2 / 3, false)).toEqual({ ratio: 1 / 2 });
        expect(stepDivider(1 / 2, false)).toEqual({ ratio: 1 / 3 });
        expect(stepDivider(1 / 3, false)).toEqual({
            ratio: 1 / 3,
            collapse: "left",
        });
        expect(stepDivider(0.4, false)).toEqual({ ratio: 1 / 3 });
        expect(stepDivider(0.6, true)).toEqual({ ratio: 2 / 3 });
    });
});

describe("settings runtime", () => {
    it("keeps navigation in runtime state and validates the exported action", () => {
        const state = settings.initialState();
        const next = settings.reduce(state, {
            type: "navigate",
            payload: { section: "apps" },
        });
        expect(state.section).toBe("appearance");
        expect(next.state.section).toBe("apps");
        expect(() =>
            settings.actions!["navigation.open"](state, { section: "missing" }),
        ).toThrow();
    });
});
