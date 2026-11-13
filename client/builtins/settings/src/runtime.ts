import { defineApp } from "@skynet/app-runtime";
import type { Json } from "@skynet/contracts";

export type Section = "appearance" | "wallpaper" | "motion" | "apps";
export interface State {
    section: Section;
}
const sections = ["appearance", "wallpaper", "motion", "apps"];
function navigate(state: State, input: Json) {
    const section = (input as { section?: Section } | null)?.section;
    if (!section || !sections.includes(section))
        throw new Error("未知设置分类");
    return { state: { ...state, section }, result: { section } };
}
export default defineApp<State>({
    initialState: () => ({ section: "appearance" }),
    reduce(state, command) {
        if (command.type === "navigate")
            return navigate(state, command.payload);
        return { state };
    },
    actions: { "navigation.open": navigate },
});
