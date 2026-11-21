import { createCodec } from "./protocol";
import schema from "./platform.json";
export const platform = ["login", "app-center"].map((id) => ({
    id,
    schema,
    namespace: "skynet.agent.v1",
}));
export const { encodePacket, decodePacket, ownerOf } = createCodec(platform);
