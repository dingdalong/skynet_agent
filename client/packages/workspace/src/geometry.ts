import { tokens } from "@skynet/tokens";

export type Placement = "left" | "right";
export type DividerAdjustment = { ratio: number; collapse?: Placement };
export type DividerPreview = DividerAdjustment & {
    latched?: number;
    barrier?: { edge: Placement; x: number };
};
export type DividerDrag = {
    width: number;
    origin: number;
    preview: DividerPreview;
};
export type PaneFrame = { left: number; width: number };
const splitStops = [1 / 3, 1 / 2, 2 / 3];

/** One container owns both panes and the divider; content never sets their widths. */
export function splitFrames(
    width: number,
    ratio: number,
    collapse?: Placement,
): { panes: [PaneFrame, PaneFrame]; divider: PaneFrame } {
    const size = Math.max(0, width);
    const gap = collapse ? 0 : Math.min(size, tokens.shell.divider);
    const available = size - gap;
    const left =
        collapse === "left"
            ? 0
            : collapse === "right"
              ? size
              : available * Math.max(1 / 3, Math.min(ratio, 2 / 3));
    return {
        panes: [
            { left: 0, width: left },
            { left: left + gap, width: available - left },
        ],
        divider: { left, width: gap },
    };
}

export function beginDividerDrag(ratio: number, width: number): DividerDrag {
    const value = Math.max(1 / 3, Math.min(ratio, 2 / 3));
    const origin =
        (width - tokens.shell.divider) * value + tokens.shell.divider / 2;
    const edge =
        value === 1 / 3 ? "left" : value === 2 / 3 ? "right" : undefined;
    return {
        width,
        origin,
        preview: {
            ratio: value,
            ...(splitStops.includes(value) ? { latched: value } : {}),
            ...(edge ? { barrier: { edge, x: origin } } : {}),
        },
    };
}

/** Accumulated movement is independent of the responder's changing child frames. */
export function moveDividerDrag(drag: DividerDrag, delta: number): DividerDrag {
    return {
        ...drag,
        preview: dividerPosition(drag.origin + delta, drag.width, drag.preview),
    };
}

export function stepDivider(
    ratio: number,
    increase: boolean,
): DividerAdjustment {
    if (increase && ratio >= 2 / 3) return { ratio, collapse: "right" };
    if (!increase && ratio <= 1 / 3) return { ratio, collapse: "left" };
    const next = increase
        ? (splitStops.find((value) => value > ratio + 0.001) ?? 2 / 3)
        : ([...splitStops].reverse().find((value) => value < ratio - 0.001) ??
          1 / 3);
    return { ratio: next };
}

export function gripPlacement(
    x: number,
    delta: number,
    width: number,
): Placement | undefined {
    if (
        Math.abs(delta) < tokens.shell.gripThreshold ||
        width < tokens.shell.comfortablePane * 2 + tokens.shell.divider
    )
        return;
    if (x < width * 0.32) return "left";
    if (x > width * 0.68) return "right";
}

export function splitLayout(
    panes: (string | null)[],
    ratio: number,
    appId: string,
    edge: Placement,
) {
    const destination = edge === "left" ? 0 : 1;
    const origin = panes.indexOf(appId);
    if (panes.length === 2 && origin >= 0) {
        return origin === destination
            ? { panes: [...panes], ratio }
            : {
                  panes: [panes[1], panes[0]],
                  ratio: Math.max(1 / 3, Math.min(1 - ratio, 2 / 3)),
              };
    }
    return {
        panes: destination === 0 ? [appId, null] : [null, appId],
        ratio: 0.5,
    };
}

function dividerPosition(
    x: number,
    width: number,
    previous?: DividerPreview,
): DividerPreview {
    const available = Math.max(1, width - tokens.shell.divider);
    const raw = x - tokens.shell.divider / 2;
    const edge: Placement | undefined =
        raw <= available / 3
            ? "left"
            : raw >= (available * 2) / 3
              ? "right"
              : undefined;
    if (edge) {
        // Reaching the stop and pushing through it are separate intentions.
        // The first event at the stop cannot collapse, even after a fast drag.
        const barrier =
            previous?.barrier?.edge === edge ? previous.barrier : { edge, x };
        const distance = (x - barrier.x) * (edge === "right" ? 1 : -1);
        const threshold =
            previous?.collapse === edge
                ? tokens.shell.snapRelease
                : tokens.shell.collapseDistance;
        const ratio = edge === "left" ? 1 / 3 : 2 / 3;
        return {
            ratio,
            latched: ratio,
            barrier,
            ...(distance >= threshold ? { collapse: edge } : {}),
        };
    }
    const latched = previous?.latched;
    if (
        latched !== undefined &&
        Math.abs(raw - available * latched) <= tokens.shell.snapRelease
    )
        return { ratio: latched, latched };
    const target = splitStops.find(
        (ratio) => Math.abs(raw - available * ratio) <= tokens.shell.snapEnter,
    );
    if (target !== undefined) return { ratio: target, latched: target };
    return {
        ratio: Math.max(1 / 3, Math.min(raw / available, 2 / 3)),
    };
}
