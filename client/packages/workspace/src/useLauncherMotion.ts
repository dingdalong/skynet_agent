import { useLayoutEffect, useRef, type RefObject } from "react";
import { createAnimator, type Animator } from "@astryxdesign/core";

type Position = {
    x: number;
    y: number;
    element: HTMLElement;
    animator: Animator;
};

export function useLauncherMotion(
    root: RefObject<HTMLElement | null>,
    reduceMotion: boolean,
    layoutKey: string,
) {
    const positions = useRef(new Map<string, Position>());
    const landing = useRef<{ id: string; x: number; y: number } | null>(null);
    useLayoutEffect(() => {
        const screen = root.current;
        if (!screen) return;
        const measure = () => {
            const seen = new Set<string>();
            const reduced =
                reduceMotion ||
                matchMedia("(prefers-reduced-motion: reduce)").matches;
            for (const slot of screen.querySelectorAll<HTMLElement>(
                "[data-launcher]",
            )) {
                const id = slot.dataset.launcher!;
                const element = slot.firstElementChild as HTMLElement;
                const rect = slot.getBoundingClientRect();
                const scroll =
                    slot.closest<HTMLElement>("[data-drop-area]")?.scrollTop ??
                    0;
                const x = rect.left + rect.width / 2;
                const y = rect.top + scroll;
                const last = positions.current.get(id);
                const from =
                    landing.current?.id === id ? landing.current : null;
                seen.add(id);
                if (
                    last?.element === element &&
                    last.x === x &&
                    last.y === y &&
                    !from
                )
                    continue;
                const offset = last?.animator.get();
                if (last && last.element !== element) last.animator.destroy();
                const animator =
                    last?.element === element
                        ? last.animator
                        : createAnimator(element);
                positions.current.set(id, { x, y, element, animator });
                if (from) landing.current = null;
                if (!reduced && (from || last)) {
                    const button = element.querySelector("button")!;
                    animator.set({
                        x: from ? from.x - x : last!.x + (offset?.x ?? 0) - x,
                        y: from
                            ? from.y - rect.top - button.offsetHeight / 2
                            : last!.y + (offset?.y ?? 0) - y,
                    });
                    void animator.animate({ x: 0, y: 0 });
                } else {
                    animator.set({ x: 0, y: 0 });
                }
            }
            for (const [id, position] of positions.current) {
                if (seen.has(id)) continue;
                position.animator.destroy();
                positions.current.delete(id);
            }
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(screen);
        return () => observer.disconnect();
    }, [root, layoutKey, reduceMotion]);
    useLayoutEffect(
        () => () => {
            for (const position of positions.current.values())
                position.animator.destroy();
            positions.current.clear();
        },
        [],
    );
    return landing;
}
