import protobuf from "protobufjs/light";
import schema from "./schema.json";

const root = protobuf.Root.fromJSON(schema);
const namespace = "skynet.agent.v1.";
const types = new Map(
    (root.lookup(namespace.slice(0, -1)) as protobuf.Namespace).nestedArray
        .filter(
            (value): value is protobuf.Type => value instanceof protobuf.Type,
        )
        .map((type) => [hash(namespace + type.name), type]),
);
export const maximumPacketSize = 262_144;

export function hash(name: string): number {
    let value = 0x811c9dc5;
    // Protocol names are ASCII; hashing UTF-16 would be incorrect for arbitrary text.
    for (let index = 0; index < name.length; index++)
        value = Math.imul(value ^ name.charCodeAt(index), 0x1000193) >>> 0;
    return value;
}

export function toBase64(bytes: Uint8Array): string {
    return protobuf.util.base64.encode(bytes, 0, bytes.length);
}

export function fromBase64(text: string): Uint8Array {
    if (text.length > 349_528 || !protobuf.util.base64.test(text))
        throw Error("无效或过大的二进制消息");
    const bytes = new Uint8Array(protobuf.util.base64.length(text));
    protobuf.util.base64.decode(text, bytes, 0);
    return bytes;
}

/** The nine-byte envelope is shared with server/network/protocol.lua. */
export function encodePacket(
    name: string,
    id: number,
    payload: object,
): string {
    if (!Number.isInteger(id) || id < 0 || id > 0xffff_ffff)
        throw Error("请求编号超出范围");
    const type = root.lookupType(namespace + name);
    const error = type.verify(payload);
    if (error) throw Error(`协议输入无效：${error}`);
    const body = type.encode(type.create(payload)).finish();
    if (body.length + 9 > maximumPacketSize) throw Error("消息超过 256 KiB");
    const bytes = new Uint8Array(9 + body.length);
    const view = new DataView(bytes.buffer);
    view.setUint32(1, id);
    view.setUint32(5, hash(namespace + name));
    bytes.set(body, 9);
    return toBase64(bytes);
}

export interface Packet {
    name: string;
    id: number;
    body: Record<string, unknown>;
}

export function decodePacket(data: string): Packet {
    const bytes = fromBase64(data);
    if (bytes.length < 9 || bytes.length > maximumPacketSize || bytes[0] !== 0)
        throw Error("不支持的协议帧");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const id = view.getUint32(1);
    const type = types.get(view.getUint32(5));
    if (
        !type ||
        !(id === 0 ? type.name.endsWith("Ntf") : type.name.endsWith("Res"))
    )
        throw Error("无效的服务端消息方向");
    const body = type.toObject(type.decode(bytes.subarray(9)), {
        defaults: true,
        arrays: true,
        longs: Number,
    });
    return { name: type.name, id, body };
}
