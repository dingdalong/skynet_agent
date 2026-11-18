export type LauncherArea = "desktop" | "dock";
export type Destination = { area: LauncherArea; before: string };
export type LauncherLayout = Record<LauncherArea, string[]>;

export function launcherDragCenter(
    bounds: Pick<DOMRect, "left" | "top" | "width" | "height">,
    pressX: number,
    pressY: number,
    iconSize: number,
) {
    const offsetX = ((pressX - bounds.left) / bounds.width - 0.5) * iconSize;
    const offsetY = ((pressY - bounds.top) / bounds.height - 0.5) * iconSize;
    return (pointerX: number, pointerY: number) => ({
        x: pointerX - offsetX,
        y: pointerY - offsetY,
    });
}

export function previewPlacement(
    layout: LauncherLayout,
    id: string,
    to: Destination,
): LauncherLayout {
    const result = {
        desktop: layout.desktop.filter((item) => item !== id),
        dock: layout.dock.filter((item) => item !== id),
    };
    const list = result[to.area];
    const index = to.before ? list.indexOf(to.before) : list.length;
    if (index < 0) return layout;
    list.splice(index, 0, id);
    return result;
}

type Slot = {
    id: string;
    rect: Pick<DOMRect, "top" | "bottom" | "left" | "right">;
};

export function insertionBefore(
    slots: Slot[],
    id: string,
    x: number,
    y: number,
): string {
    if (!slots.length || y > slots[slots.length - 1].rect.bottom) return "";
    let closest = 0;
    let rowDistance = Infinity;
    let columnDistance = Infinity;
    for (const [index, { rect }] of slots.entries()) {
        const row = Math.abs(y - (rect.top + rect.bottom) / 2);
        const column = Math.abs(x - (rect.left + rect.right) / 2);
        if (
            row < rowDistance ||
            (row === rowDistance && column < columnDistance)
        ) {
            closest = index;
            rowDistance = row;
            columnDistance = column;
        }
    }
    const grabbed = slots.findIndex((slot) => slot.id === id);
    const { rect } = slots[closest];
    const after =
        grabbed === -1 ? x > (rect.left + rect.right) / 2 : closest >= grabbed;
    let index = closest + Number(after);
    if (slots[index]?.id === id) index++;
    return slots[index]?.id ?? "";
}
