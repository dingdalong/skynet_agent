import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";
import { loadProtocol } from "./load-protocol.mjs";

const output = new URL(
    "../packages/agent-client/src/schema.json",
    import.meta.url,
);
const root = await loadProtocol();
const canonical = (value) =>
    Array.isArray(value)
        ? value.map(canonical)
        : value && typeof value === "object"
          ? Object.fromEntries(
                Object.keys(value)
                    .sort()
                    .map((key) => [key, canonical(value[key])]),
            )
          : value;
const content = await format(JSON.stringify(canonical(root.toJSON())), {
    parser: "json",
    tabWidth: 2,
});
if (process.argv.includes("--check")) {
    if ((await readFile(output, "utf8")) !== content)
        throw Error("Client protocol is stale; run pnpm protocol:generate");
} else {
    await writeFile(output, content);
}
