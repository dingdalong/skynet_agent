import protobuf from "protobufjs/light.js";
export const maximumPacketSize = 262_144;

export function hash(name: string): number {
    let value = 0x811c9dc5;
    for (let index = 0; index < name.length; index++)
        value = Math.imul(value ^ name.charCodeAt(index), 0x01000193) >>> 0;
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
export interface Packet {
    app: string;
    name: string;
    id: number;
    body: Record<string, unknown>;
}
export interface AppProtocol {
    id: string;
    schema: protobuf.INamespace;
    namespace?: string;
}
const validApp = (id: string) =>
    id.length <= 63 && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id);

export function readFrame(data: string) {
    const bytes = fromBase64(data);
    const offset = 6 + bytes[5];
    if (
        bytes.length < 7 ||
        bytes.length > maximumPacketSize ||
        offset > bytes.length
    )
        throw Error("不支持的协议帧");
    const app = String.fromCharCode(...bytes.subarray(6, offset));
    const kind = bytes[0];
    const id = new DataView(bytes.buffer, bytes.byteOffset).getUint32(1);
    if (!validApp(app) || kind < 1 || kind > 4 || (kind === 3) !== (id === 0))
        throw Error("无效的消息方向或帧");
    return { app, kind, id, payload: bytes.subarray(offset) };
}

export function createCodec(applications: AppProtocol[]) {
    const scopes = new Map(
        applications.map(({ id, namespace, schema }) => {
            if (!validApp(id)) throw Error("无效应用 ID");
            const root = protobuf.Root.fromJSON(schema);
            const prefix = id
                .split("-")
                .map((part) => part[0].toUpperCase() + part.slice(1))
                .join("");
            const types = new Map<number, protobuf.Type>();
            const names = new Map<string, protobuf.Type>();
            function collect(scope: protobuf.Namespace) {
                for (const object of scope.nestedArray) {
                    if (
                        object instanceof protobuf.Type &&
                        object.name.startsWith(prefix) &&
                        /(Req|Res|Ntf)$/.test(object.name)
                    ) {
                        const key = hash(object.fullName.slice(1));
                        if (types.has(key) || names.has(object.name))
                            throw Error(
                                `应用 ${id} 的消息名称或哈希冲突：${object.fullName}`,
                            );
                        types.set(key, object);
                        names.set(object.name, object);
                    }
                    if (object instanceof protobuf.Namespace) collect(object);
                }
            }
            const scope = namespace ? root.lookup(namespace) : root;
            if (!(scope instanceof protobuf.Namespace))
                throw Error(`协议命名空间不存在：${namespace}`);
            collect(scope);
            return [id, { types, names }];
        }),
    );
    if (scopes.size !== applications.length) throw Error("重复的应用 ID");
    function ownerOf(name: string) {
        const owners = applications.filter(({ id }) =>
            scopes.get(id)!.names.has(name),
        );
        if (owners.length > 1) throw Error(`消息 ${name} 需要指定应用 ID`);
        return owners[0]?.id;
    }
    function encodePacket(
        name: string,
        id: number,
        payload: object,
        app = ownerOf(name),
    ): string {
        const type = app && scopes.get(app)?.names.get(name);
        if (!type) throw Error("未知应用消息");
        if (!Number.isInteger(id) || id < 0 || id > 0xffff_ffff)
            throw Error("请求编号超出范围");
        const kind = name.endsWith("Req")
            ? 1
            : name.endsWith("Res")
              ? 2
              : name.endsWith("Ntf")
                ? 3
                : 0;
        if (!kind || (kind === 3) !== (id === 0)) throw Error("无效的消息方向");
        const error = type.verify(payload);
        if (error) throw Error(`协议输入无效：${error}`);
        const body = type.encode(type.create(payload)).finish();
        const offset = 6 + app.length;
        if (body.length + offset + 4 > maximumPacketSize)
            throw Error("消息超过 256 KiB");
        const bytes = new Uint8Array(offset + 4 + body.length);
        const view = new DataView(bytes.buffer);
        bytes[0] = kind;
        view.setUint32(1, id);
        bytes[5] = app.length;
        for (let index = 0; index < app.length; index++)
            bytes[6 + index] = app.charCodeAt(index);
        view.setUint32(offset, hash(type.fullName.slice(1)));
        bytes.set(body, offset + 4);
        return toBase64(bytes);
    }
    function decodePacket(data: string): Packet {
        const { app, id, kind, payload } = readFrame(data);
        if (kind === 4 && payload.length)
            return {
                app,
                id,
                name: "RoutingError",
                body: {
                    ret: payload[0],
                    error: {
                        message: protobuf.util.utf8.read(
                            payload,
                            1,
                            payload.length,
                        ),
                    },
                },
            };
        if ((kind !== 2 && kind !== 3) || payload.length < 4)
            throw Error("无效的服务端消息方向或帧");
        const type = scopes
            .get(app)
            ?.types.get(
                new DataView(payload.buffer, payload.byteOffset).getUint32(0),
            );
        if (!type || !type.name.endsWith(kind === 3 ? "Ntf" : "Res"))
            throw Error("无效的服务端消息方向");
        return {
            app,
            id,
            name: type.name,
            body: type.toObject(type.decode(payload.subarray(4)), {
                defaults: true,
                arrays: true,
                longs: Number,
            }),
        };
    }
    return { encodePacket, decodePacket, ownerOf };
}
