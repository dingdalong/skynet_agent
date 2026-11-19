import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import protobuf from "protobufjs";

const directory = fileURLToPath(
    new URL("../../common/proto/", import.meta.url),
);

export async function loadProtocol() {
    const root = new protobuf.Root();
    root.resolvePath = (_origin, target) => resolve(directory, target);
    await root.load("schema.proto", { keepCase: true });
    return root.resolveAll();
}
