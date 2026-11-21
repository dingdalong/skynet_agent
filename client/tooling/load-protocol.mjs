import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import protobuf from "protobufjs";

const directory = fileURLToPath(
    new URL("../../common/proto/", import.meta.url),
);

export async function loadProtocol(entry = "schema.proto") {
    const root = new protobuf.Root();
    root.resolvePath = (_origin, target) => resolve(directory, target);
    await root.load(entry, { keepCase: true });
    return root.resolveAll();
}
