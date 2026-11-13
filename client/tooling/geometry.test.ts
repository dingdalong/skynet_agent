import { describe, expect, it } from "vitest";
import { tokens } from "@skynet/tokens";
import {
    dividerPosition,
    gripPlacement,
    splitLayout,
    stepDivider,
} from "../apps/host/src/geometry";
import settings from "../builtins/settings/src/runtime";

describe("workspace direct manipulation", () => {
    it("snaps at thirds and half with hysteresis", () => {
        const width = 1280;
        const third = (width - 8) / 3 + 4;
        expect(dividerPosition(third + 19, width).ratio).toBe(1 / 3);
        expect(dividerPosition(third + 31, width, 1 / 3).ratio).toBe(1 / 3);
        expect(dividerPosition(third + 33, width, 1 / 3).ratio).not.toBe(1 / 3);
        expect(dividerPosition(width / 2 + 18, width).ratio).toBe(1 / 2);
        expect(dividerPosition(width - third, width).ratio).toBe(2 / 3);
    });
    it("keeps both sides at least one third while dragging", () => {
        for (const width of [728, 800, 1280, 2560]) {
            expect(dividerPosition(-100, width).ratio).toBe(1 / 3);
            expect(dividerPosition(width + 100, width).ratio).toBe(2 / 3);
            const third = (width - 8) / 3 + 4;
            expect(dividerPosition(third, width).ratio).toBe(1 / 3);
            expect(dividerPosition(width - third, width).ratio).toBe(2 / 3);
        }
        expect(dividerPosition(0, 0).ratio).toBe(1 / 3);
    });
    it("requires a deliberate drag beyond either minimum and allows pulling back", () => {
        for (const width of [728, 800, 1280, 2560]) {
            const third =
                (width - tokens.shell.divider) / 3 + tokens.shell.divider / 2;
            const distance = tokens.shell.collapseDistance;
            expect(
                dividerPosition(third, width, 1 / 3).collapse,
            ).toBeUndefined();
            expect(
                dividerPosition(third - distance + 1, width, 1 / 3).collapse,
            ).toBeUndefined();
            const left = dividerPosition(third - distance, width, 1 / 3);
            expect(left).toMatchObject({ ratio: 1 / 3, collapse: "left" });
            expect(dividerPosition(third, width, left.latched)).toEqual({
                ratio: 1 / 3,
                latched: 1 / 3,
            });
            expect(
                dividerPosition(width - third, width, 2 / 3).collapse,
            ).toBeUndefined();
            expect(
                dividerPosition(width - third + distance - 1, width, 2 / 3)
                    .collapse,
            ).toBeUndefined();
            const right = dividerPosition(
                width - third + distance,
                width,
                2 / 3,
            );
            expect(right).toMatchObject({ ratio: 2 / 3, collapse: "right" });
            expect(
                dividerPosition(width - third, width, right.latched),
            ).toEqual({
                ratio: 2 / 3,
                latched: 2 / 3,
            });
        }
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
