// Independent wire peer for the native-client and real Gateway integration tests.
import assert from "node:assert/strict";

const chunk = 65_536;
export function sendGateway(socket, packet, maximum) {
    assert.ok(packet.length <= maximum, "packet exceeds negotiated limit");
    if (packet.length <= chunk) return socket.send(packet);
    for (let offset = 0; offset < packet.length; offset += chunk) {
        const header = Buffer.alloc(9);
        header[0] = 5;
        header.writeUInt32BE(packet.length, 1);
        header.writeUInt32BE(offset, 5);
        socket.send(
            Buffer.concat([header, packet.subarray(offset, offset + chunk)]),
        );
    }
}

export function receiver() {
    let parts = [],
        offset = 0,
        total = 0;
    return (data, maximum) => {
        if (data[0] !== 5) {
            assert.ok(!offset && data.length <= chunk);
            return data;
        }
        const length = data.readUInt32BE(1);
        assert.ok(length > chunk && length <= maximum);
        assert.equal(length, total || length);
        assert.equal(data.readUInt32BE(5), offset);
        assert.equal(data.length - 9, Math.min(chunk, length - offset));
        total = length;
        parts.push(data.subarray(9));
        offset += data.length - 9;
        if (offset !== total) return;
        const packet = Buffer.concat(parts);
        parts = [];
        offset = total = 0;
        return packet;
    };
}
