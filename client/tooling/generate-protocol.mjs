import protobuf from "protobufjs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const proto = fileURLToPath(new URL("../../common/proto/", import.meta.url));
const output = new URL(
    "../packages/agent-client/src/schema.json",
    import.meta.url,
);
const root = new protobuf.Root();
await root.load(
    ["login.proto", "agent_session.proto", "execution.proto"].map(
        (name) => proto + name,
    ),
    { keepCase: true },
);
root.resolveAll();
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
