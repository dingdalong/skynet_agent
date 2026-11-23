import { createCodec } from "@skynet/app-sdk/protocol";
import schema from "./schema.json";
import { platform } from "@skynet/app-sdk/platform";
export {
    fromBase64,
    toBase64,
    hash,
    gatewayChunkBytes,
    type Packet,
} from "@skynet/app-sdk/protocol";
export const { encodePacket, decodePacket, ownerOf } = createCodec([
    { id: "agent", schema, namespace: "skynet.agent.v1" },
    ...platform,
]);
