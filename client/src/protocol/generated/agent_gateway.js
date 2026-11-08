/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $RangeError = $util.global.RangeError, $TypeError = $util.global.TypeError, $String = $util.global.String, $Number = $util.global.Number, $Boolean = $util.global.Boolean, $Array = $util.global.Array, $parseInt = $util.global.parseInt, $BigInt = $util.global.BigInt;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const skynet = $root.skynet = (() => {

    /**
     * Namespace skynet.
     * @exports skynet
     * @namespace
     */
    const skynet = {};

    skynet.agent = (function() {

        /**
         * Namespace agent.
         * @memberof skynet
         * @namespace
         */
        const agent = {};

        agent.v1 = (function() {

            /**
             * Namespace v1.
             * @memberof skynet.agent
             * @namespace
             */
            const v1 = {};

            v1.SessionModelSetReq = (function() {

                /**
                 * Properties of a SessionModelSetReq.
                 * @typedef {Object} skynet.agent.v1.SessionModelSetReq.$Properties
                 * @property {string|null} [sessionId] SessionModelSetReq sessionId
                 * @property {string|null} [modelId] SessionModelSetReq modelId
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionModelSetReq.
                 * @memberof skynet.agent.v1
                 * @interface ISessionModelSetReq
                 * @augments skynet.agent.v1.SessionModelSetReq.$Properties
                 * @deprecated Use skynet.agent.v1.SessionModelSetReq.$Properties instead.
                 */

                /**
                 * Shape of a SessionModelSetReq.
                 * @typedef {skynet.agent.v1.SessionModelSetReq.$Properties} skynet.agent.v1.SessionModelSetReq.$Shape
                 */

                /**
                 * Constructs a new SessionModelSetReq.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionModelSetReq.
                 * @constructor
                 * @param {skynet.agent.v1.SessionModelSetReq.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionModelSetReq = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionModelSetReq sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @instance
                 */
                SessionModelSetReq.prototype.sessionId = "";

                /**
                 * SessionModelSetReq modelId.
                 * @member {string} modelId
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @instance
                 */
                SessionModelSetReq.prototype.modelId = "";

                /**
                 * Creates a new SessionModelSetReq instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetReq.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionModelSetReq} SessionModelSetReq instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionModelSetReq.$Shape): skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape;
                 *   (properties?: skynet.agent.v1.SessionModelSetReq.$Properties): skynet.agent.v1.SessionModelSetReq;
                 * }}
                 */
                SessionModelSetReq.create = function(properties) {
                    return new SessionModelSetReq(properties);
                };

                /**
                 * Encodes the specified SessionModelSetReq message. Does not implicitly {@link skynet.agent.v1.SessionModelSetReq.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetReq.$Properties} message SessionModelSetReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionModelSetReq.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId") && message.modelId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.modelId);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionModelSetReq message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionModelSetReq.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetReq.$Properties} message SessionModelSetReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionModelSetReq.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionModelSetReq message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape} SessionModelSetReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionModelSetReq.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.SessionModelSetReq();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.modelId = value;
                                else
                                    delete message.modelId;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a SessionModelSetReq message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape} SessionModelSetReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionModelSetReq.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionModelSetReq message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionModelSetReq.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId"))
                        if (!$util.isString(message.modelId))
                            return "modelId: string expected";
                    return null;
                };

                /**
                 * Creates a SessionModelSetReq message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionModelSetReq} SessionModelSetReq
                 */
                SessionModelSetReq.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionModelSetReq)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionModelSetReq: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionModelSetReq();
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.modelId != null)
                        if (typeof object.modelId !== "string" || object.modelId.length)
                            message.modelId = $String(object.modelId);
                    return message;
                };

                /**
                 * Creates a plain object from a SessionModelSetReq message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetReq} message SessionModelSetReq
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionModelSetReq.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.sessionId = "";
                        object.modelId = "";
                    }
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId"))
                        object.modelId = message.modelId;
                    return object;
                };

                /**
                 * Converts this SessionModelSetReq to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionModelSetReq
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionModelSetReq.prototype.toJSON = function() {
                    return SessionModelSetReq.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionModelSetReq;
            })();

            v1.SessionModelSetRes = (function() {

                /**
                 * Properties of a SessionModelSetRes.
                 * @typedef {Object} skynet.agent.v1.SessionModelSetRes.$Properties
                 * @property {number|null} [ret] SessionModelSetRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] SessionModelSetRes error
                 * @property {skynet.agent.v1.SessionState.$Properties|null} [session] SessionModelSetRes session
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionModelSetRes.
                 * @memberof skynet.agent.v1
                 * @interface ISessionModelSetRes
                 * @augments skynet.agent.v1.SessionModelSetRes.$Properties
                 * @deprecated Use skynet.agent.v1.SessionModelSetRes.$Properties instead.
                 */

                /**
                 * Shape of a SessionModelSetRes.
                 * @typedef {skynet.agent.v1.SessionModelSetRes.$Properties} skynet.agent.v1.SessionModelSetRes.$Shape
                 */

                /**
                 * Constructs a new SessionModelSetRes.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionModelSetRes.
                 * @constructor
                 * @param {skynet.agent.v1.SessionModelSetRes.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionModelSetRes = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionModelSetRes ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @instance
                 */
                SessionModelSetRes.prototype.ret = 0;

                /**
                 * SessionModelSetRes error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @instance
                 */
                SessionModelSetRes.prototype.error = null;

                /**
                 * SessionModelSetRes session.
                 * @member {skynet.agent.v1.SessionState.$Properties|null|undefined} session
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @instance
                 */
                SessionModelSetRes.prototype.session = null;

                /**
                 * Creates a new SessionModelSetRes instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetRes.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionModelSetRes} SessionModelSetRes instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionModelSetRes.$Shape): skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape;
                 *   (properties?: skynet.agent.v1.SessionModelSetRes.$Properties): skynet.agent.v1.SessionModelSetRes;
                 * }}
                 */
                SessionModelSetRes.create = function(properties) {
                    return new SessionModelSetRes(properties);
                };

                /**
                 * Encodes the specified SessionModelSetRes message. Does not implicitly {@link skynet.agent.v1.SessionModelSetRes.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetRes.$Properties} message SessionModelSetRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionModelSetRes.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret") && message.ret !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.ret);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        $root.skynet.agent.v1.ErrorInfo.encode(message.error, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        $root.skynet.agent.v1.SessionState.encode(message.session, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionModelSetRes message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionModelSetRes.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetRes.$Properties} message SessionModelSetRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionModelSetRes.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionModelSetRes message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape} SessionModelSetRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionModelSetRes.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.SessionModelSetRes();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.ret = value;
                                else
                                    delete message.ret;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                message.error = $root.skynet.agent.v1.ErrorInfo.decode(reader, reader.size(), $undefined, _depth + 1, message.error);
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                message.session = $root.skynet.agent.v1.SessionState.decode(reader, reader.size(), $undefined, _depth + 1, message.session);
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a SessionModelSetRes message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape} SessionModelSetRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionModelSetRes.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionModelSetRes message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionModelSetRes.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        if (!$util.isInteger(message.ret))
                            return "ret: integer expected";
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                        let error = $root.skynet.agent.v1.ErrorInfo.verify(message.error, _depth + 1);
                        if (error)
                            return "error." + error;
                    }
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session")) {
                        let error = $root.skynet.agent.v1.SessionState.verify(message.session, _depth + 1);
                        if (error)
                            return "session." + error;
                    }
                    return null;
                };

                /**
                 * Creates a SessionModelSetRes message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionModelSetRes} SessionModelSetRes
                 */
                SessionModelSetRes.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionModelSetRes)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionModelSetRes: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionModelSetRes();
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.SessionModelSetRes.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    if (object.session != null) {
                        if (!$util.isObject(object.session))
                            throw $TypeError(".skynet.agent.v1.SessionModelSetRes.session: object expected");
                        message.session = $root.skynet.agent.v1.SessionState.fromObject(object.session, _depth + 1);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a SessionModelSetRes message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @static
                 * @param {skynet.agent.v1.SessionModelSetRes} message SessionModelSetRes
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionModelSetRes.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.ret = 0;
                        object.error = null;
                        object.session = null;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        object.session = $root.skynet.agent.v1.SessionState.toObject(message.session, options, _depth + 1);
                    return object;
                };

                /**
                 * Converts this SessionModelSetRes to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionModelSetRes
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionModelSetRes.prototype.toJSON = function() {
                    return SessionModelSetRes.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionModelSetRes;
            })();

            v1.ReasoningDeltaNtf = (function() {

                /**
                 * Properties of a ReasoningDeltaNtf.
                 * @typedef {Object} skynet.agent.v1.ReasoningDeltaNtf.$Properties
                 * @property {string|null} [sessionId] ReasoningDeltaNtf sessionId
                 * @property {string|null} [messageId] ReasoningDeltaNtf messageId
                 * @property {string|null} [toolCallId] ReasoningDeltaNtf toolCallId
                 * @property {skynet.agent.v1.ReasoningBlock.$Properties|null} [block] ReasoningDeltaNtf block
                 * @property {number|null} [revision] ReasoningDeltaNtf revision
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a ReasoningDeltaNtf.
                 * @memberof skynet.agent.v1
                 * @interface IReasoningDeltaNtf
                 * @augments skynet.agent.v1.ReasoningDeltaNtf.$Properties
                 * @deprecated Use skynet.agent.v1.ReasoningDeltaNtf.$Properties instead.
                 */

                /**
                 * Shape of a ReasoningDeltaNtf.
                 * @typedef {skynet.agent.v1.ReasoningDeltaNtf.$Properties} skynet.agent.v1.ReasoningDeltaNtf.$Shape
                 */

                /**
                 * Constructs a new ReasoningDeltaNtf.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a ReasoningDeltaNtf.
                 * @constructor
                 * @param {skynet.agent.v1.ReasoningDeltaNtf.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const ReasoningDeltaNtf = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * ReasoningDeltaNtf sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @instance
                 */
                ReasoningDeltaNtf.prototype.sessionId = "";

                /**
                 * ReasoningDeltaNtf messageId.
                 * @member {string} messageId
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @instance
                 */
                ReasoningDeltaNtf.prototype.messageId = "";

                /**
                 * ReasoningDeltaNtf toolCallId.
                 * @member {string} toolCallId
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @instance
                 */
                ReasoningDeltaNtf.prototype.toolCallId = "";

                /**
                 * ReasoningDeltaNtf block.
                 * @member {skynet.agent.v1.ReasoningBlock.$Properties|null|undefined} block
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @instance
                 */
                ReasoningDeltaNtf.prototype.block = null;

                /**
                 * ReasoningDeltaNtf revision.
                 * @member {number} revision
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @instance
                 */
                ReasoningDeltaNtf.prototype.revision = 0;

                /**
                 * Creates a new ReasoningDeltaNtf instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.ReasoningDeltaNtf.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.ReasoningDeltaNtf} ReasoningDeltaNtf instance
                 * @type {{
                 *   (properties: skynet.agent.v1.ReasoningDeltaNtf.$Shape): skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape;
                 *   (properties?: skynet.agent.v1.ReasoningDeltaNtf.$Properties): skynet.agent.v1.ReasoningDeltaNtf;
                 * }}
                 */
                ReasoningDeltaNtf.create = function(properties) {
                    return new ReasoningDeltaNtf(properties);
                };

                /**
                 * Encodes the specified ReasoningDeltaNtf message. Does not implicitly {@link skynet.agent.v1.ReasoningDeltaNtf.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.ReasoningDeltaNtf.$Properties} message ReasoningDeltaNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ReasoningDeltaNtf.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId") && message.messageId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.messageId);
                    if (message.toolCallId != null && $Object.hasOwnProperty.call(message, "toolCallId") && message.toolCallId !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.toolCallId);
                    if (message.block != null && $Object.hasOwnProperty.call(message, "block"))
                        $root.skynet.agent.v1.ReasoningBlock.encode(message.block, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision") && message.revision !== 0)
                        writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.revision);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified ReasoningDeltaNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.ReasoningDeltaNtf.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.ReasoningDeltaNtf.$Properties} message ReasoningDeltaNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ReasoningDeltaNtf.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a ReasoningDeltaNtf message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape} ReasoningDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ReasoningDeltaNtf.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.ReasoningDeltaNtf();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.messageId = value;
                                else
                                    delete message.messageId;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.toolCallId = value;
                                else
                                    delete message.toolCallId;
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                message.block = $root.skynet.agent.v1.ReasoningBlock.decode(reader, reader.size(), $undefined, _depth + 1, message.block);
                                continue;
                            }
                        case 5: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.uint32())
                                    message.revision = value;
                                else
                                    delete message.revision;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a ReasoningDeltaNtf message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape} ReasoningDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ReasoningDeltaNtf.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a ReasoningDeltaNtf message.
                 * @function verify
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ReasoningDeltaNtf.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                        if (!$util.isString(message.messageId))
                            return "messageId: string expected";
                    if (message.toolCallId != null && $Object.hasOwnProperty.call(message, "toolCallId"))
                        if (!$util.isString(message.toolCallId))
                            return "toolCallId: string expected";
                    if (message.block != null && $Object.hasOwnProperty.call(message, "block")) {
                        let error = $root.skynet.agent.v1.ReasoningBlock.verify(message.block, _depth + 1);
                        if (error)
                            return "block." + error;
                    }
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        if (!$util.isInteger(message.revision))
                            return "revision: integer expected";
                    return null;
                };

                /**
                 * Creates a ReasoningDeltaNtf message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.ReasoningDeltaNtf} ReasoningDeltaNtf
                 */
                ReasoningDeltaNtf.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.ReasoningDeltaNtf)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.ReasoningDeltaNtf: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.ReasoningDeltaNtf();
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.messageId != null)
                        if (typeof object.messageId !== "string" || object.messageId.length)
                            message.messageId = $String(object.messageId);
                    if (object.toolCallId != null)
                        if (typeof object.toolCallId !== "string" || object.toolCallId.length)
                            message.toolCallId = $String(object.toolCallId);
                    if (object.block != null) {
                        if (!$util.isObject(object.block))
                            throw $TypeError(".skynet.agent.v1.ReasoningDeltaNtf.block: object expected");
                        message.block = $root.skynet.agent.v1.ReasoningBlock.fromObject(object.block, _depth + 1);
                    }
                    if (object.revision != null)
                        if ($Number(object.revision) !== 0)
                            message.revision = object.revision >>> 0;
                    return message;
                };

                /**
                 * Creates a plain object from a ReasoningDeltaNtf message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.ReasoningDeltaNtf} message ReasoningDeltaNtf
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ReasoningDeltaNtf.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.sessionId = "";
                        object.messageId = "";
                        object.toolCallId = "";
                        object.block = null;
                        object.revision = 0;
                    }
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                        object.messageId = message.messageId;
                    if (message.toolCallId != null && $Object.hasOwnProperty.call(message, "toolCallId"))
                        object.toolCallId = message.toolCallId;
                    if (message.block != null && $Object.hasOwnProperty.call(message, "block"))
                        object.block = $root.skynet.agent.v1.ReasoningBlock.toObject(message.block, options, _depth + 1);
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        object.revision = message.revision;
                    return object;
                };

                /**
                 * Converts this ReasoningDeltaNtf to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.ReasoningDeltaNtf
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ReasoningDeltaNtf.prototype.toJSON = function() {
                    return ReasoningDeltaNtf.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ReasoningDeltaNtf;
            })();

            v1.SessionCreateReq = (function() {

                /**
                 * Properties of a SessionCreateReq.
                 * @typedef {Object} skynet.agent.v1.SessionCreateReq.$Properties
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionCreateReq.
                 * @memberof skynet.agent.v1
                 * @interface ISessionCreateReq
                 * @augments skynet.agent.v1.SessionCreateReq.$Properties
                 * @deprecated Use skynet.agent.v1.SessionCreateReq.$Properties instead.
                 */

                /**
                 * Shape of a SessionCreateReq.
                 * @typedef {skynet.agent.v1.SessionCreateReq.$Properties} skynet.agent.v1.SessionCreateReq.$Shape
                 */

                /**
                 * Constructs a new SessionCreateReq.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionCreateReq.
                 * @constructor
                 * @param {skynet.agent.v1.SessionCreateReq.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionCreateReq = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * Creates a new SessionCreateReq instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {skynet.agent.v1.SessionCreateReq.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionCreateReq} SessionCreateReq instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionCreateReq.$Shape): skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape;
                 *   (properties?: skynet.agent.v1.SessionCreateReq.$Properties): skynet.agent.v1.SessionCreateReq;
                 * }}
                 */
                SessionCreateReq.create = function(properties) {
                    return new SessionCreateReq(properties);
                };

                /**
                 * Encodes the specified SessionCreateReq message. Does not implicitly {@link skynet.agent.v1.SessionCreateReq.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {skynet.agent.v1.SessionCreateReq.$Properties} message SessionCreateReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionCreateReq.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionCreateReq message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionCreateReq.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {skynet.agent.v1.SessionCreateReq.$Properties} message SessionCreateReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionCreateReq.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionCreateReq message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape} SessionCreateReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionCreateReq.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.SessionCreateReq();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        reader.skipType(tag & 7, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a SessionCreateReq message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape} SessionCreateReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionCreateReq.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionCreateReq message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionCreateReq.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    return null;
                };

                /**
                 * Creates a SessionCreateReq message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionCreateReq} SessionCreateReq
                 */
                SessionCreateReq.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionCreateReq)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionCreateReq: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    return new $root.skynet.agent.v1.SessionCreateReq();
                };

                /**
                 * Creates a plain object from a SessionCreateReq message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @static
                 * @param {skynet.agent.v1.SessionCreateReq} message SessionCreateReq
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionCreateReq.toObject = function () {
                    return {};
                };

                /**
                 * Converts this SessionCreateReq to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionCreateReq
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionCreateReq.prototype.toJSON = function() {
                    return SessionCreateReq.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionCreateReq;
            })();

            v1.SessionCreateRes = (function() {

                /**
                 * Properties of a SessionCreateRes.
                 * @typedef {Object} skynet.agent.v1.SessionCreateRes.$Properties
                 * @property {number|null} [ret] SessionCreateRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] SessionCreateRes error
                 * @property {skynet.agent.v1.SessionState.$Properties|null} [session] SessionCreateRes session
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionCreateRes.
                 * @memberof skynet.agent.v1
                 * @interface ISessionCreateRes
                 * @augments skynet.agent.v1.SessionCreateRes.$Properties
                 * @deprecated Use skynet.agent.v1.SessionCreateRes.$Properties instead.
                 */

                /**
                 * Shape of a SessionCreateRes.
                 * @typedef {skynet.agent.v1.SessionCreateRes.$Properties} skynet.agent.v1.SessionCreateRes.$Shape
                 */

                /**
                 * Constructs a new SessionCreateRes.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionCreateRes.
                 * @constructor
                 * @param {skynet.agent.v1.SessionCreateRes.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionCreateRes = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionCreateRes ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @instance
                 */
                SessionCreateRes.prototype.ret = 0;

                /**
                 * SessionCreateRes error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @instance
                 */
                SessionCreateRes.prototype.error = null;

                /**
                 * SessionCreateRes session.
                 * @member {skynet.agent.v1.SessionState.$Properties|null|undefined} session
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @instance
                 */
                SessionCreateRes.prototype.session = null;

                /**
                 * Creates a new SessionCreateRes instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {skynet.agent.v1.SessionCreateRes.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionCreateRes} SessionCreateRes instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionCreateRes.$Shape): skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape;
                 *   (properties?: skynet.agent.v1.SessionCreateRes.$Properties): skynet.agent.v1.SessionCreateRes;
                 * }}
                 */
                SessionCreateRes.create = function(properties) {
                    return new SessionCreateRes(properties);
                };

                /**
                 * Encodes the specified SessionCreateRes message. Does not implicitly {@link skynet.agent.v1.SessionCreateRes.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {skynet.agent.v1.SessionCreateRes.$Properties} message SessionCreateRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionCreateRes.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret") && message.ret !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.ret);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        $root.skynet.agent.v1.ErrorInfo.encode(message.error, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        $root.skynet.agent.v1.SessionState.encode(message.session, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionCreateRes message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionCreateRes.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {skynet.agent.v1.SessionCreateRes.$Properties} message SessionCreateRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionCreateRes.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionCreateRes message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape} SessionCreateRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionCreateRes.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.SessionCreateRes();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.ret = value;
                                else
                                    delete message.ret;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                message.error = $root.skynet.agent.v1.ErrorInfo.decode(reader, reader.size(), $undefined, _depth + 1, message.error);
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                message.session = $root.skynet.agent.v1.SessionState.decode(reader, reader.size(), $undefined, _depth + 1, message.session);
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a SessionCreateRes message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape} SessionCreateRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionCreateRes.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionCreateRes message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionCreateRes.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        if (!$util.isInteger(message.ret))
                            return "ret: integer expected";
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                        let error = $root.skynet.agent.v1.ErrorInfo.verify(message.error, _depth + 1);
                        if (error)
                            return "error." + error;
                    }
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session")) {
                        let error = $root.skynet.agent.v1.SessionState.verify(message.session, _depth + 1);
                        if (error)
                            return "session." + error;
                    }
                    return null;
                };

                /**
                 * Creates a SessionCreateRes message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionCreateRes} SessionCreateRes
                 */
                SessionCreateRes.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionCreateRes)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionCreateRes: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionCreateRes();
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.SessionCreateRes.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    if (object.session != null) {
                        if (!$util.isObject(object.session))
                            throw $TypeError(".skynet.agent.v1.SessionCreateRes.session: object expected");
                        message.session = $root.skynet.agent.v1.SessionState.fromObject(object.session, _depth + 1);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a SessionCreateRes message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @static
                 * @param {skynet.agent.v1.SessionCreateRes} message SessionCreateRes
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionCreateRes.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.ret = 0;
                        object.error = null;
                        object.session = null;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        object.session = $root.skynet.agent.v1.SessionState.toObject(message.session, options, _depth + 1);
                    return object;
                };

                /**
                 * Converts this SessionCreateRes to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionCreateRes.prototype.toJSON = function() {
                    return SessionCreateRes.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionCreateRes;
            })();

            v1.MessageSendReq = (function() {

                /**
                 * Properties of a MessageSendReq.
                 * @typedef {Object} skynet.agent.v1.MessageSendReq.$Properties
                 * @property {string|null} [sessionId] MessageSendReq sessionId
                 * @property {string|null} [text] MessageSendReq text
                 * @property {string|null} [retryRunId] MessageSendReq retryRunId
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a MessageSendReq.
                 * @memberof skynet.agent.v1
                 * @interface IMessageSendReq
                 * @augments skynet.agent.v1.MessageSendReq.$Properties
                 * @deprecated Use skynet.agent.v1.MessageSendReq.$Properties instead.
                 */

                /**
                 * Shape of a MessageSendReq.
                 * @typedef {skynet.agent.v1.MessageSendReq.$Properties} skynet.agent.v1.MessageSendReq.$Shape
                 */

                /**
                 * Constructs a new MessageSendReq.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a MessageSendReq.
                 * @constructor
                 * @param {skynet.agent.v1.MessageSendReq.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const MessageSendReq = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * MessageSendReq sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @instance
                 */
                MessageSendReq.prototype.sessionId = "";

                /**
                 * MessageSendReq text.
                 * @member {string} text
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @instance
                 */
                MessageSendReq.prototype.text = "";

                /**
                 * MessageSendReq retryRunId.
                 * @member {string} retryRunId
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @instance
                 */
                MessageSendReq.prototype.retryRunId = "";

                /**
                 * Creates a new MessageSendReq instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {skynet.agent.v1.MessageSendReq.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.MessageSendReq} MessageSendReq instance
                 * @type {{
                 *   (properties: skynet.agent.v1.MessageSendReq.$Shape): skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape;
                 *   (properties?: skynet.agent.v1.MessageSendReq.$Properties): skynet.agent.v1.MessageSendReq;
                 * }}
                 */
                MessageSendReq.create = function(properties) {
                    return new MessageSendReq(properties);
                };

                /**
                 * Encodes the specified MessageSendReq message. Does not implicitly {@link skynet.agent.v1.MessageSendReq.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {skynet.agent.v1.MessageSendReq.$Properties} message MessageSendReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageSendReq.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.sessionId);
                    if (message.text != null && $Object.hasOwnProperty.call(message, "text") && message.text !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.text);
                    if (message.retryRunId != null && $Object.hasOwnProperty.call(message, "retryRunId") && message.retryRunId !== "")
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.retryRunId);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified MessageSendReq message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageSendReq.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {skynet.agent.v1.MessageSendReq.$Properties} message MessageSendReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageSendReq.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a MessageSendReq message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape} MessageSendReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageSendReq.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.MessageSendReq();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.text = value;
                                else
                                    delete message.text;
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.retryRunId = value;
                                else
                                    delete message.retryRunId;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a MessageSendReq message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape} MessageSendReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageSendReq.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a MessageSendReq message.
                 * @function verify
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                MessageSendReq.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                        if (!$util.isString(message.text))
                            return "text: string expected";
                    if (message.retryRunId != null && $Object.hasOwnProperty.call(message, "retryRunId"))
                        if (!$util.isString(message.retryRunId))
                            return "retryRunId: string expected";
                    return null;
                };

                /**
                 * Creates a MessageSendReq message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.MessageSendReq} MessageSendReq
                 */
                MessageSendReq.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.MessageSendReq)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.MessageSendReq: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.MessageSendReq();
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.text != null)
                        if (typeof object.text !== "string" || object.text.length)
                            message.text = $String(object.text);
                    if (object.retryRunId != null)
                        if (typeof object.retryRunId !== "string" || object.retryRunId.length)
                            message.retryRunId = $String(object.retryRunId);
                    return message;
                };

                /**
                 * Creates a plain object from a MessageSendReq message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @static
                 * @param {skynet.agent.v1.MessageSendReq} message MessageSendReq
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                MessageSendReq.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.sessionId = "";
                        object.text = "";
                        object.retryRunId = "";
                    }
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                        object.text = message.text;
                    if (message.retryRunId != null && $Object.hasOwnProperty.call(message, "retryRunId"))
                        object.retryRunId = message.retryRunId;
                    return object;
                };

                /**
                 * Converts this MessageSendReq to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.MessageSendReq
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                MessageSendReq.prototype.toJSON = function() {
                    return MessageSendReq.toObject(this, $protobuf.util.toJSONOptions);
                };

                return MessageSendReq;
            })();

            v1.MessageSendRes = (function() {

                /**
                 * Properties of a MessageSendRes.
                 * @typedef {Object} skynet.agent.v1.MessageSendRes.$Properties
                 * @property {number|null} [ret] MessageSendRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] MessageSendRes error
                 * @property {skynet.agent.v1.SessionState.$Properties|null} [session] MessageSendRes session
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a MessageSendRes.
                 * @memberof skynet.agent.v1
                 * @interface IMessageSendRes
                 * @augments skynet.agent.v1.MessageSendRes.$Properties
                 * @deprecated Use skynet.agent.v1.MessageSendRes.$Properties instead.
                 */

                /**
                 * Shape of a MessageSendRes.
                 * @typedef {skynet.agent.v1.MessageSendRes.$Properties} skynet.agent.v1.MessageSendRes.$Shape
                 */

                /**
                 * Constructs a new MessageSendRes.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a MessageSendRes.
                 * @constructor
                 * @param {skynet.agent.v1.MessageSendRes.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const MessageSendRes = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * MessageSendRes ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 */
                MessageSendRes.prototype.ret = 0;

                /**
                 * MessageSendRes error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 */
                MessageSendRes.prototype.error = null;

                /**
                 * MessageSendRes session.
                 * @member {skynet.agent.v1.SessionState.$Properties|null|undefined} session
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 */
                MessageSendRes.prototype.session = null;

                /**
                 * Creates a new MessageSendRes instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {skynet.agent.v1.MessageSendRes.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.MessageSendRes} MessageSendRes instance
                 * @type {{
                 *   (properties: skynet.agent.v1.MessageSendRes.$Shape): skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape;
                 *   (properties?: skynet.agent.v1.MessageSendRes.$Properties): skynet.agent.v1.MessageSendRes;
                 * }}
                 */
                MessageSendRes.create = function(properties) {
                    return new MessageSendRes(properties);
                };

                /**
                 * Encodes the specified MessageSendRes message. Does not implicitly {@link skynet.agent.v1.MessageSendRes.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {skynet.agent.v1.MessageSendRes.$Properties} message MessageSendRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageSendRes.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret") && message.ret !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.ret);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        $root.skynet.agent.v1.ErrorInfo.encode(message.error, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        $root.skynet.agent.v1.SessionState.encode(message.session, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified MessageSendRes message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageSendRes.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {skynet.agent.v1.MessageSendRes.$Properties} message MessageSendRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageSendRes.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a MessageSendRes message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape} MessageSendRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageSendRes.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.MessageSendRes();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.ret = value;
                                else
                                    delete message.ret;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                message.error = $root.skynet.agent.v1.ErrorInfo.decode(reader, reader.size(), $undefined, _depth + 1, message.error);
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                message.session = $root.skynet.agent.v1.SessionState.decode(reader, reader.size(), $undefined, _depth + 1, message.session);
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a MessageSendRes message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape} MessageSendRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageSendRes.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a MessageSendRes message.
                 * @function verify
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                MessageSendRes.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        if (!$util.isInteger(message.ret))
                            return "ret: integer expected";
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                        let error = $root.skynet.agent.v1.ErrorInfo.verify(message.error, _depth + 1);
                        if (error)
                            return "error." + error;
                    }
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session")) {
                        let error = $root.skynet.agent.v1.SessionState.verify(message.session, _depth + 1);
                        if (error)
                            return "session." + error;
                    }
                    return null;
                };

                /**
                 * Creates a MessageSendRes message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.MessageSendRes} MessageSendRes
                 */
                MessageSendRes.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.MessageSendRes)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.MessageSendRes: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.MessageSendRes();
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.MessageSendRes.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    if (object.session != null) {
                        if (!$util.isObject(object.session))
                            throw $TypeError(".skynet.agent.v1.MessageSendRes.session: object expected");
                        message.session = $root.skynet.agent.v1.SessionState.fromObject(object.session, _depth + 1);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a MessageSendRes message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @static
                 * @param {skynet.agent.v1.MessageSendRes} message MessageSendRes
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                MessageSendRes.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.ret = 0;
                        object.error = null;
                        object.session = null;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        object.session = $root.skynet.agent.v1.SessionState.toObject(message.session, options, _depth + 1);
                    return object;
                };

                /**
                 * Converts this MessageSendRes to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                MessageSendRes.prototype.toJSON = function() {
                    return MessageSendRes.toObject(this, $protobuf.util.toJSONOptions);
                };

                return MessageSendRes;
            })();

            v1.MessageCancelReq = (function() {

                /**
                 * Properties of a MessageCancelReq.
                 * @typedef {Object} skynet.agent.v1.MessageCancelReq.$Properties
                 * @property {string|null} [sessionId] MessageCancelReq sessionId
                 * @property {string|null} [runId] MessageCancelReq runId
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a MessageCancelReq.
                 * @memberof skynet.agent.v1
                 * @interface IMessageCancelReq
                 * @augments skynet.agent.v1.MessageCancelReq.$Properties
                 * @deprecated Use skynet.agent.v1.MessageCancelReq.$Properties instead.
                 */

                /**
                 * Shape of a MessageCancelReq.
                 * @typedef {skynet.agent.v1.MessageCancelReq.$Properties} skynet.agent.v1.MessageCancelReq.$Shape
                 */

                /**
                 * Constructs a new MessageCancelReq.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a MessageCancelReq.
                 * @constructor
                 * @param {skynet.agent.v1.MessageCancelReq.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const MessageCancelReq = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * MessageCancelReq sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @instance
                 */
                MessageCancelReq.prototype.sessionId = "";

                /**
                 * MessageCancelReq runId.
                 * @member {string} runId
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @instance
                 */
                MessageCancelReq.prototype.runId = "";

                /**
                 * Creates a new MessageCancelReq instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {skynet.agent.v1.MessageCancelReq.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.MessageCancelReq} MessageCancelReq instance
                 * @type {{
                 *   (properties: skynet.agent.v1.MessageCancelReq.$Shape): skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape;
                 *   (properties?: skynet.agent.v1.MessageCancelReq.$Properties): skynet.agent.v1.MessageCancelReq;
                 * }}
                 */
                MessageCancelReq.create = function(properties) {
                    return new MessageCancelReq(properties);
                };

                /**
                 * Encodes the specified MessageCancelReq message. Does not implicitly {@link skynet.agent.v1.MessageCancelReq.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {skynet.agent.v1.MessageCancelReq.$Properties} message MessageCancelReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageCancelReq.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.sessionId);
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId") && message.runId !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.runId);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified MessageCancelReq message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageCancelReq.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {skynet.agent.v1.MessageCancelReq.$Properties} message MessageCancelReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageCancelReq.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a MessageCancelReq message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape} MessageCancelReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageCancelReq.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.MessageCancelReq();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.runId = value;
                                else
                                    delete message.runId;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a MessageCancelReq message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape} MessageCancelReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageCancelReq.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a MessageCancelReq message.
                 * @function verify
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                MessageCancelReq.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        if (!$util.isString(message.runId))
                            return "runId: string expected";
                    return null;
                };

                /**
                 * Creates a MessageCancelReq message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.MessageCancelReq} MessageCancelReq
                 */
                MessageCancelReq.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.MessageCancelReq)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.MessageCancelReq: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.MessageCancelReq();
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.runId != null)
                        if (typeof object.runId !== "string" || object.runId.length)
                            message.runId = $String(object.runId);
                    return message;
                };

                /**
                 * Creates a plain object from a MessageCancelReq message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @static
                 * @param {skynet.agent.v1.MessageCancelReq} message MessageCancelReq
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                MessageCancelReq.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.sessionId = "";
                        object.runId = "";
                    }
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        object.runId = message.runId;
                    return object;
                };

                /**
                 * Converts this MessageCancelReq to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                MessageCancelReq.prototype.toJSON = function() {
                    return MessageCancelReq.toObject(this, $protobuf.util.toJSONOptions);
                };

                return MessageCancelReq;
            })();

            v1.MessageCancelRes = (function() {

                /**
                 * Properties of a MessageCancelRes.
                 * @typedef {Object} skynet.agent.v1.MessageCancelRes.$Properties
                 * @property {number|null} [ret] MessageCancelRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] MessageCancelRes error
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a MessageCancelRes.
                 * @memberof skynet.agent.v1
                 * @interface IMessageCancelRes
                 * @augments skynet.agent.v1.MessageCancelRes.$Properties
                 * @deprecated Use skynet.agent.v1.MessageCancelRes.$Properties instead.
                 */

                /**
                 * Shape of a MessageCancelRes.
                 * @typedef {skynet.agent.v1.MessageCancelRes.$Properties} skynet.agent.v1.MessageCancelRes.$Shape
                 */

                /**
                 * Constructs a new MessageCancelRes.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a MessageCancelRes.
                 * @constructor
                 * @param {skynet.agent.v1.MessageCancelRes.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const MessageCancelRes = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * MessageCancelRes ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @instance
                 */
                MessageCancelRes.prototype.ret = 0;

                /**
                 * MessageCancelRes error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @instance
                 */
                MessageCancelRes.prototype.error = null;

                /**
                 * Creates a new MessageCancelRes instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {skynet.agent.v1.MessageCancelRes.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.MessageCancelRes} MessageCancelRes instance
                 * @type {{
                 *   (properties: skynet.agent.v1.MessageCancelRes.$Shape): skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape;
                 *   (properties?: skynet.agent.v1.MessageCancelRes.$Properties): skynet.agent.v1.MessageCancelRes;
                 * }}
                 */
                MessageCancelRes.create = function(properties) {
                    return new MessageCancelRes(properties);
                };

                /**
                 * Encodes the specified MessageCancelRes message. Does not implicitly {@link skynet.agent.v1.MessageCancelRes.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {skynet.agent.v1.MessageCancelRes.$Properties} message MessageCancelRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageCancelRes.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret") && message.ret !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.ret);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        $root.skynet.agent.v1.ErrorInfo.encode(message.error, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified MessageCancelRes message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageCancelRes.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {skynet.agent.v1.MessageCancelRes.$Properties} message MessageCancelRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageCancelRes.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a MessageCancelRes message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape} MessageCancelRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageCancelRes.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.MessageCancelRes();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.ret = value;
                                else
                                    delete message.ret;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                message.error = $root.skynet.agent.v1.ErrorInfo.decode(reader, reader.size(), $undefined, _depth + 1, message.error);
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a MessageCancelRes message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape} MessageCancelRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageCancelRes.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a MessageCancelRes message.
                 * @function verify
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                MessageCancelRes.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        if (!$util.isInteger(message.ret))
                            return "ret: integer expected";
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                        let error = $root.skynet.agent.v1.ErrorInfo.verify(message.error, _depth + 1);
                        if (error)
                            return "error." + error;
                    }
                    return null;
                };

                /**
                 * Creates a MessageCancelRes message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.MessageCancelRes} MessageCancelRes
                 */
                MessageCancelRes.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.MessageCancelRes)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.MessageCancelRes: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.MessageCancelRes();
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.MessageCancelRes.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a MessageCancelRes message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @static
                 * @param {skynet.agent.v1.MessageCancelRes} message MessageCancelRes
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                MessageCancelRes.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.ret = 0;
                        object.error = null;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    return object;
                };

                /**
                 * Converts this MessageCancelRes to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.MessageCancelRes
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                MessageCancelRes.prototype.toJSON = function() {
                    return MessageCancelRes.toObject(this, $protobuf.util.toJSONOptions);
                };

                return MessageCancelRes;
            })();

            v1.SessionUpdatedNtf = (function() {

                /**
                 * Properties of a SessionUpdatedNtf.
                 * @typedef {Object} skynet.agent.v1.SessionUpdatedNtf.$Properties
                 * @property {skynet.agent.v1.SessionState.$Properties|null} [session] SessionUpdatedNtf session
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionUpdatedNtf.
                 * @memberof skynet.agent.v1
                 * @interface ISessionUpdatedNtf
                 * @augments skynet.agent.v1.SessionUpdatedNtf.$Properties
                 * @deprecated Use skynet.agent.v1.SessionUpdatedNtf.$Properties instead.
                 */

                /**
                 * Shape of a SessionUpdatedNtf.
                 * @typedef {skynet.agent.v1.SessionUpdatedNtf.$Properties} skynet.agent.v1.SessionUpdatedNtf.$Shape
                 */

                /**
                 * Constructs a new SessionUpdatedNtf.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionUpdatedNtf.
                 * @constructor
                 * @param {skynet.agent.v1.SessionUpdatedNtf.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionUpdatedNtf = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionUpdatedNtf session.
                 * @member {skynet.agent.v1.SessionState.$Properties|null|undefined} session
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @instance
                 */
                SessionUpdatedNtf.prototype.session = null;

                /**
                 * Creates a new SessionUpdatedNtf instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.SessionUpdatedNtf.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionUpdatedNtf} SessionUpdatedNtf instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionUpdatedNtf.$Shape): skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape;
                 *   (properties?: skynet.agent.v1.SessionUpdatedNtf.$Properties): skynet.agent.v1.SessionUpdatedNtf;
                 * }}
                 */
                SessionUpdatedNtf.create = function(properties) {
                    return new SessionUpdatedNtf(properties);
                };

                /**
                 * Encodes the specified SessionUpdatedNtf message. Does not implicitly {@link skynet.agent.v1.SessionUpdatedNtf.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.SessionUpdatedNtf.$Properties} message SessionUpdatedNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionUpdatedNtf.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        $root.skynet.agent.v1.SessionState.encode(message.session, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionUpdatedNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionUpdatedNtf.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.SessionUpdatedNtf.$Properties} message SessionUpdatedNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionUpdatedNtf.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionUpdatedNtf message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape} SessionUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionUpdatedNtf.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.SessionUpdatedNtf();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                message.session = $root.skynet.agent.v1.SessionState.decode(reader, reader.size(), $undefined, _depth + 1, message.session);
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a SessionUpdatedNtf message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape} SessionUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionUpdatedNtf.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionUpdatedNtf message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionUpdatedNtf.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session")) {
                        let error = $root.skynet.agent.v1.SessionState.verify(message.session, _depth + 1);
                        if (error)
                            return "session." + error;
                    }
                    return null;
                };

                /**
                 * Creates a SessionUpdatedNtf message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionUpdatedNtf} SessionUpdatedNtf
                 */
                SessionUpdatedNtf.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionUpdatedNtf)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionUpdatedNtf: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionUpdatedNtf();
                    if (object.session != null) {
                        if (!$util.isObject(object.session))
                            throw $TypeError(".skynet.agent.v1.SessionUpdatedNtf.session: object expected");
                        message.session = $root.skynet.agent.v1.SessionState.fromObject(object.session, _depth + 1);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a SessionUpdatedNtf message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.SessionUpdatedNtf} message SessionUpdatedNtf
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionUpdatedNtf.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults)
                        object.session = null;
                    if (message.session != null && $Object.hasOwnProperty.call(message, "session"))
                        object.session = $root.skynet.agent.v1.SessionState.toObject(message.session, options, _depth + 1);
                    return object;
                };

                /**
                 * Converts this SessionUpdatedNtf to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionUpdatedNtf
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionUpdatedNtf.prototype.toJSON = function() {
                    return SessionUpdatedNtf.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionUpdatedNtf;
            })();

            v1.MessageDeltaNtf = (function() {

                /**
                 * Properties of a MessageDeltaNtf.
                 * @typedef {Object} skynet.agent.v1.MessageDeltaNtf.$Properties
                 * @property {string|null} [sessionId] MessageDeltaNtf sessionId
                 * @property {string|null} [runId] MessageDeltaNtf runId
                 * @property {string|null} [messageId] MessageDeltaNtf messageId
                 * @property {string|null} [delta] MessageDeltaNtf delta
                 * @property {number|null} [revision] MessageDeltaNtf revision
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a MessageDeltaNtf.
                 * @memberof skynet.agent.v1
                 * @interface IMessageDeltaNtf
                 * @augments skynet.agent.v1.MessageDeltaNtf.$Properties
                 * @deprecated Use skynet.agent.v1.MessageDeltaNtf.$Properties instead.
                 */

                /**
                 * Shape of a MessageDeltaNtf.
                 * @typedef {skynet.agent.v1.MessageDeltaNtf.$Properties} skynet.agent.v1.MessageDeltaNtf.$Shape
                 */

                /**
                 * Constructs a new MessageDeltaNtf.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a MessageDeltaNtf.
                 * @constructor
                 * @param {skynet.agent.v1.MessageDeltaNtf.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const MessageDeltaNtf = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * MessageDeltaNtf sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @instance
                 */
                MessageDeltaNtf.prototype.sessionId = "";

                /**
                 * MessageDeltaNtf runId.
                 * @member {string} runId
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @instance
                 */
                MessageDeltaNtf.prototype.runId = "";

                /**
                 * MessageDeltaNtf messageId.
                 * @member {string} messageId
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @instance
                 */
                MessageDeltaNtf.prototype.messageId = "";

                /**
                 * MessageDeltaNtf delta.
                 * @member {string} delta
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @instance
                 */
                MessageDeltaNtf.prototype.delta = "";

                /**
                 * MessageDeltaNtf revision.
                 * @member {number} revision
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @instance
                 */
                MessageDeltaNtf.prototype.revision = 0;

                /**
                 * Creates a new MessageDeltaNtf instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.MessageDeltaNtf.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.MessageDeltaNtf} MessageDeltaNtf instance
                 * @type {{
                 *   (properties: skynet.agent.v1.MessageDeltaNtf.$Shape): skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape;
                 *   (properties?: skynet.agent.v1.MessageDeltaNtf.$Properties): skynet.agent.v1.MessageDeltaNtf;
                 * }}
                 */
                MessageDeltaNtf.create = function(properties) {
                    return new MessageDeltaNtf(properties);
                };

                /**
                 * Encodes the specified MessageDeltaNtf message. Does not implicitly {@link skynet.agent.v1.MessageDeltaNtf.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.MessageDeltaNtf.$Properties} message MessageDeltaNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageDeltaNtf.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId") && message.runId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.runId);
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId") && message.messageId !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.messageId);
                    if (message.delta != null && $Object.hasOwnProperty.call(message, "delta") && message.delta !== "")
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.delta);
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision") && message.revision !== 0)
                        writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.revision);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified MessageDeltaNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageDeltaNtf.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.MessageDeltaNtf.$Properties} message MessageDeltaNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                MessageDeltaNtf.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a MessageDeltaNtf message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape} MessageDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageDeltaNtf.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.MessageDeltaNtf();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.runId = value;
                                else
                                    delete message.runId;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.messageId = value;
                                else
                                    delete message.messageId;
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.delta = value;
                                else
                                    delete message.delta;
                                continue;
                            }
                        case 5: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.uint32())
                                    message.revision = value;
                                else
                                    delete message.revision;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a MessageDeltaNtf message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape} MessageDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                MessageDeltaNtf.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a MessageDeltaNtf message.
                 * @function verify
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                MessageDeltaNtf.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        if (!$util.isString(message.runId))
                            return "runId: string expected";
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                        if (!$util.isString(message.messageId))
                            return "messageId: string expected";
                    if (message.delta != null && $Object.hasOwnProperty.call(message, "delta"))
                        if (!$util.isString(message.delta))
                            return "delta: string expected";
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        if (!$util.isInteger(message.revision))
                            return "revision: integer expected";
                    return null;
                };

                /**
                 * Creates a MessageDeltaNtf message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.MessageDeltaNtf} MessageDeltaNtf
                 */
                MessageDeltaNtf.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.MessageDeltaNtf)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.MessageDeltaNtf: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.MessageDeltaNtf();
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.runId != null)
                        if (typeof object.runId !== "string" || object.runId.length)
                            message.runId = $String(object.runId);
                    if (object.messageId != null)
                        if (typeof object.messageId !== "string" || object.messageId.length)
                            message.messageId = $String(object.messageId);
                    if (object.delta != null)
                        if (typeof object.delta !== "string" || object.delta.length)
                            message.delta = $String(object.delta);
                    if (object.revision != null)
                        if ($Number(object.revision) !== 0)
                            message.revision = object.revision >>> 0;
                    return message;
                };

                /**
                 * Creates a plain object from a MessageDeltaNtf message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @static
                 * @param {skynet.agent.v1.MessageDeltaNtf} message MessageDeltaNtf
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                MessageDeltaNtf.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.sessionId = "";
                        object.runId = "";
                        object.messageId = "";
                        object.delta = "";
                        object.revision = 0;
                    }
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        object.runId = message.runId;
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                        object.messageId = message.messageId;
                    if (message.delta != null && $Object.hasOwnProperty.call(message, "delta"))
                        object.delta = message.delta;
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        object.revision = message.revision;
                    return object;
                };

                /**
                 * Converts this MessageDeltaNtf to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.MessageDeltaNtf
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                MessageDeltaNtf.prototype.toJSON = function() {
                    return MessageDeltaNtf.toObject(this, $protobuf.util.toJSONOptions);
                };

                return MessageDeltaNtf;
            })();

            v1.ToolUpdatedNtf = (function() {

                /**
                 * Properties of a ToolUpdatedNtf.
                 * @typedef {Object} skynet.agent.v1.ToolUpdatedNtf.$Properties
                 * @property {string|null} [sessionId] ToolUpdatedNtf sessionId
                 * @property {string|null} [messageId] ToolUpdatedNtf messageId
                 * @property {skynet.agent.v1.ToolCall.$Properties|null} [tool] ToolUpdatedNtf tool
                 * @property {number|null} [revision] ToolUpdatedNtf revision
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a ToolUpdatedNtf.
                 * @memberof skynet.agent.v1
                 * @interface IToolUpdatedNtf
                 * @augments skynet.agent.v1.ToolUpdatedNtf.$Properties
                 * @deprecated Use skynet.agent.v1.ToolUpdatedNtf.$Properties instead.
                 */

                /**
                 * Shape of a ToolUpdatedNtf.
                 * @typedef {skynet.agent.v1.ToolUpdatedNtf.$Properties} skynet.agent.v1.ToolUpdatedNtf.$Shape
                 */

                /**
                 * Constructs a new ToolUpdatedNtf.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a ToolUpdatedNtf.
                 * @constructor
                 * @param {skynet.agent.v1.ToolUpdatedNtf.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const ToolUpdatedNtf = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * ToolUpdatedNtf sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @instance
                 */
                ToolUpdatedNtf.prototype.sessionId = "";

                /**
                 * ToolUpdatedNtf messageId.
                 * @member {string} messageId
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @instance
                 */
                ToolUpdatedNtf.prototype.messageId = "";

                /**
                 * ToolUpdatedNtf tool.
                 * @member {skynet.agent.v1.ToolCall.$Properties|null|undefined} tool
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @instance
                 */
                ToolUpdatedNtf.prototype.tool = null;

                /**
                 * ToolUpdatedNtf revision.
                 * @member {number} revision
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @instance
                 */
                ToolUpdatedNtf.prototype.revision = 0;

                /**
                 * Creates a new ToolUpdatedNtf instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.ToolUpdatedNtf.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.ToolUpdatedNtf} ToolUpdatedNtf instance
                 * @type {{
                 *   (properties: skynet.agent.v1.ToolUpdatedNtf.$Shape): skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape;
                 *   (properties?: skynet.agent.v1.ToolUpdatedNtf.$Properties): skynet.agent.v1.ToolUpdatedNtf;
                 * }}
                 */
                ToolUpdatedNtf.create = function(properties) {
                    return new ToolUpdatedNtf(properties);
                };

                /**
                 * Encodes the specified ToolUpdatedNtf message. Does not implicitly {@link skynet.agent.v1.ToolUpdatedNtf.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.ToolUpdatedNtf.$Properties} message ToolUpdatedNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ToolUpdatedNtf.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId") && message.messageId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.messageId);
                    if (message.tool != null && $Object.hasOwnProperty.call(message, "tool"))
                        $root.skynet.agent.v1.ToolCall.encode(message.tool, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision") && message.revision !== 0)
                        writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.revision);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified ToolUpdatedNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.ToolUpdatedNtf.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.ToolUpdatedNtf.$Properties} message ToolUpdatedNtf message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ToolUpdatedNtf.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a ToolUpdatedNtf message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape} ToolUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ToolUpdatedNtf.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.ToolUpdatedNtf();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.messageId = value;
                                else
                                    delete message.messageId;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                message.tool = $root.skynet.agent.v1.ToolCall.decode(reader, reader.size(), $undefined, _depth + 1, message.tool);
                                continue;
                            }
                        case 4: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.uint32())
                                    message.revision = value;
                                else
                                    delete message.revision;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a ToolUpdatedNtf message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape} ToolUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ToolUpdatedNtf.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a ToolUpdatedNtf message.
                 * @function verify
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ToolUpdatedNtf.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                        if (!$util.isString(message.messageId))
                            return "messageId: string expected";
                    if (message.tool != null && $Object.hasOwnProperty.call(message, "tool")) {
                        let error = $root.skynet.agent.v1.ToolCall.verify(message.tool, _depth + 1);
                        if (error)
                            return "tool." + error;
                    }
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        if (!$util.isInteger(message.revision))
                            return "revision: integer expected";
                    return null;
                };

                /**
                 * Creates a ToolUpdatedNtf message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.ToolUpdatedNtf} ToolUpdatedNtf
                 */
                ToolUpdatedNtf.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.ToolUpdatedNtf)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.ToolUpdatedNtf: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.ToolUpdatedNtf();
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.messageId != null)
                        if (typeof object.messageId !== "string" || object.messageId.length)
                            message.messageId = $String(object.messageId);
                    if (object.tool != null) {
                        if (!$util.isObject(object.tool))
                            throw $TypeError(".skynet.agent.v1.ToolUpdatedNtf.tool: object expected");
                        message.tool = $root.skynet.agent.v1.ToolCall.fromObject(object.tool, _depth + 1);
                    }
                    if (object.revision != null)
                        if ($Number(object.revision) !== 0)
                            message.revision = object.revision >>> 0;
                    return message;
                };

                /**
                 * Creates a plain object from a ToolUpdatedNtf message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @static
                 * @param {skynet.agent.v1.ToolUpdatedNtf} message ToolUpdatedNtf
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ToolUpdatedNtf.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.sessionId = "";
                        object.messageId = "";
                        object.tool = null;
                        object.revision = 0;
                    }
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                        object.messageId = message.messageId;
                    if (message.tool != null && $Object.hasOwnProperty.call(message, "tool"))
                        object.tool = $root.skynet.agent.v1.ToolCall.toObject(message.tool, options, _depth + 1);
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        object.revision = message.revision;
                    return object;
                };

                /**
                 * Converts this ToolUpdatedNtf to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.ToolUpdatedNtf
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ToolUpdatedNtf.prototype.toJSON = function() {
                    return ToolUpdatedNtf.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ToolUpdatedNtf;
            })();

            v1.ErrorInfo = (function() {

                /**
                 * Properties of an ErrorInfo.
                 * @typedef {Object} skynet.agent.v1.ErrorInfo.$Properties
                 * @property {string|null} [message] ErrorInfo message
                 * @property {boolean|null} [retryable] ErrorInfo retryable
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of an ErrorInfo.
                 * @memberof skynet.agent.v1
                 * @interface IErrorInfo
                 * @augments skynet.agent.v1.ErrorInfo.$Properties
                 * @deprecated Use skynet.agent.v1.ErrorInfo.$Properties instead.
                 */

                /**
                 * Shape of an ErrorInfo.
                 * @typedef {skynet.agent.v1.ErrorInfo.$Properties} skynet.agent.v1.ErrorInfo.$Shape
                 */

                /**
                 * Constructs a new ErrorInfo.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents an ErrorInfo.
                 * @constructor
                 * @param {skynet.agent.v1.ErrorInfo.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const ErrorInfo = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * ErrorInfo message.
                 * @member {string} message
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @instance
                 */
                ErrorInfo.prototype.message = "";

                /**
                 * ErrorInfo retryable.
                 * @member {boolean} retryable
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @instance
                 */
                ErrorInfo.prototype.retryable = false;

                /**
                 * Creates a new ErrorInfo instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {skynet.agent.v1.ErrorInfo.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.ErrorInfo} ErrorInfo instance
                 * @type {{
                 *   (properties: skynet.agent.v1.ErrorInfo.$Shape): skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape;
                 *   (properties?: skynet.agent.v1.ErrorInfo.$Properties): skynet.agent.v1.ErrorInfo;
                 * }}
                 */
                ErrorInfo.create = function(properties) {
                    return new ErrorInfo(properties);
                };

                /**
                 * Encodes the specified ErrorInfo message. Does not implicitly {@link skynet.agent.v1.ErrorInfo.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {skynet.agent.v1.ErrorInfo.$Properties} message ErrorInfo message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ErrorInfo.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.message != null && $Object.hasOwnProperty.call(message, "message") && message.message !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
                    if (message.retryable != null && $Object.hasOwnProperty.call(message, "retryable") && message.retryable !== false)
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.retryable);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified ErrorInfo message, length delimited. Does not implicitly {@link skynet.agent.v1.ErrorInfo.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {skynet.agent.v1.ErrorInfo.$Properties} message ErrorInfo message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ErrorInfo.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes an ErrorInfo message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape} ErrorInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ErrorInfo.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.ErrorInfo();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.message = value;
                                else
                                    delete message.message;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.bool())
                                    message.retryable = value;
                                else
                                    delete message.retryable;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes an ErrorInfo message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape} ErrorInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ErrorInfo.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies an ErrorInfo message.
                 * @function verify
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ErrorInfo.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                        if (!$util.isString(message.message))
                            return "message: string expected";
                    if (message.retryable != null && $Object.hasOwnProperty.call(message, "retryable"))
                        if (typeof message.retryable !== "boolean")
                            return "retryable: boolean expected";
                    return null;
                };

                /**
                 * Creates an ErrorInfo message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.ErrorInfo} ErrorInfo
                 */
                ErrorInfo.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.ErrorInfo)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.ErrorInfo: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.ErrorInfo();
                    if (object.message != null)
                        if (typeof object.message !== "string" || object.message.length)
                            message.message = $String(object.message);
                    if (object.retryable != null)
                        if (object.retryable)
                            message.retryable = $Boolean(object.retryable);
                    return message;
                };

                /**
                 * Creates a plain object from an ErrorInfo message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @static
                 * @param {skynet.agent.v1.ErrorInfo} message ErrorInfo
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ErrorInfo.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.message = "";
                        object.retryable = false;
                    }
                    if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                        object.message = message.message;
                    if (message.retryable != null && $Object.hasOwnProperty.call(message, "retryable"))
                        object.retryable = message.retryable;
                    return object;
                };

                /**
                 * Converts this ErrorInfo to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.ErrorInfo
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ErrorInfo.prototype.toJSON = function() {
                    return ErrorInfo.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ErrorInfo;
            })();

            /**
             * MessageRole enum.
             * @name skynet.agent.v1.MessageRole
             * @enum {number}
             * @property {number} MESSAGE_ROLE_UNSPECIFIED=0 MESSAGE_ROLE_UNSPECIFIED value
             * @property {number} MESSAGE_ROLE_USER=1 MESSAGE_ROLE_USER value
             * @property {number} MESSAGE_ROLE_ASSISTANT=2 MESSAGE_ROLE_ASSISTANT value
             */
            v1.MessageRole = (function() {
                const valuesById = $Object.create(null), values = $Object.create(valuesById);
                values[valuesById[0] = "MESSAGE_ROLE_UNSPECIFIED"] = 0;
                values[valuesById[1] = "MESSAGE_ROLE_USER"] = 1;
                values[valuesById[2] = "MESSAGE_ROLE_ASSISTANT"] = 2;
                return values;
            })();

            /**
             * MessageStatus enum.
             * @name skynet.agent.v1.MessageStatus
             * @enum {number}
             * @property {number} MESSAGE_STATUS_UNSPECIFIED=0 MESSAGE_STATUS_UNSPECIFIED value
             * @property {number} MESSAGE_STATUS_STREAMING=1 MESSAGE_STATUS_STREAMING value
             * @property {number} MESSAGE_STATUS_COMPLETED=2 MESSAGE_STATUS_COMPLETED value
             * @property {number} MESSAGE_STATUS_CANCELLED=3 MESSAGE_STATUS_CANCELLED value
             * @property {number} MESSAGE_STATUS_FAILED=4 MESSAGE_STATUS_FAILED value
             */
            v1.MessageStatus = (function() {
                const valuesById = $Object.create(null), values = $Object.create(valuesById);
                values[valuesById[0] = "MESSAGE_STATUS_UNSPECIFIED"] = 0;
                values[valuesById[1] = "MESSAGE_STATUS_STREAMING"] = 1;
                values[valuesById[2] = "MESSAGE_STATUS_COMPLETED"] = 2;
                values[valuesById[3] = "MESSAGE_STATUS_CANCELLED"] = 3;
                values[valuesById[4] = "MESSAGE_STATUS_FAILED"] = 4;
                return values;
            })();

            v1.ChatMessage = (function() {

                /**
                 * Properties of a ChatMessage.
                 * @typedef {Object} skynet.agent.v1.ChatMessage.$Properties
                 * @property {string|null} [id] ChatMessage id
                 * @property {skynet.agent.v1.MessageRole|null} [role] ChatMessage role
                 * @property {string|null} [content] ChatMessage content
                 * @property {number|null} [createdAt] ChatMessage createdAt
                 * @property {skynet.agent.v1.MessageStatus|null} [status] ChatMessage status
                 * @property {string|null} [runId] ChatMessage runId
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] ChatMessage error
                 * @property {number|null} [ret] ChatMessage ret
                 * @property {Array.<skynet.agent.v1.ToolCall.$Properties>|null} [toolCalls] ChatMessage toolCalls
                 * @property {Array.<skynet.agent.v1.ReasoningBlock.$Properties>|null} [reasoning] ChatMessage reasoning
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a ChatMessage.
                 * @memberof skynet.agent.v1
                 * @interface IChatMessage
                 * @augments skynet.agent.v1.ChatMessage.$Properties
                 * @deprecated Use skynet.agent.v1.ChatMessage.$Properties instead.
                 */

                /**
                 * Shape of a ChatMessage.
                 * @typedef {skynet.agent.v1.ChatMessage.$Properties} skynet.agent.v1.ChatMessage.$Shape
                 */

                /**
                 * Constructs a new ChatMessage.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a ChatMessage.
                 * @constructor
                 * @param {skynet.agent.v1.ChatMessage.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const ChatMessage = function (properties) {
                    this.toolCalls = [];
                    this.reasoning = [];
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * ChatMessage id.
                 * @member {string} id
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.id = "";

                /**
                 * ChatMessage role.
                 * @member {skynet.agent.v1.MessageRole} role
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.role = 0;

                /**
                 * ChatMessage content.
                 * @member {string} content
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.content = "";

                /**
                 * ChatMessage createdAt.
                 * @member {number} createdAt
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.createdAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * ChatMessage status.
                 * @member {skynet.agent.v1.MessageStatus} status
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.status = 0;

                /**
                 * ChatMessage runId.
                 * @member {string} runId
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.runId = "";

                /**
                 * ChatMessage error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.error = null;

                /**
                 * ChatMessage ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.ret = 0;

                /**
                 * ChatMessage toolCalls.
                 * @member {Array.<skynet.agent.v1.ToolCall.$Properties>} toolCalls
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.toolCalls = $util.emptyArray;

                /**
                 * ChatMessage reasoning.
                 * @member {Array.<skynet.agent.v1.ReasoningBlock.$Properties>} reasoning
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 */
                ChatMessage.prototype.reasoning = $util.emptyArray;

                /**
                 * Creates a new ChatMessage instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {skynet.agent.v1.ChatMessage.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.ChatMessage} ChatMessage instance
                 * @type {{
                 *   (properties: skynet.agent.v1.ChatMessage.$Shape): skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape;
                 *   (properties?: skynet.agent.v1.ChatMessage.$Properties): skynet.agent.v1.ChatMessage;
                 * }}
                 */
                ChatMessage.create = function(properties) {
                    return new ChatMessage(properties);
                };

                /**
                 * Encodes the specified ChatMessage message. Does not implicitly {@link skynet.agent.v1.ChatMessage.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {skynet.agent.v1.ChatMessage.$Properties} message ChatMessage message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ChatMessage.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.role != null && $Object.hasOwnProperty.call(message, "role") && message.role !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.role);
                    if (message.content != null && $Object.hasOwnProperty.call(message, "content") && message.content !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.content);
                    if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt") && (typeof message.createdAt === "object" ? message.createdAt.low || message.createdAt.high : message.createdAt !== 0))
                        writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.createdAt);
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status") && message.status !== 0)
                        writer.uint32(/* id 5, wireType 0 =*/40).int32(message.status);
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId") && message.runId !== "")
                        writer.uint32(/* id 6, wireType 2 =*/50).string(message.runId);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        $root.skynet.agent.v1.ErrorInfo.encode(message.error, writer.uint32(/* id 7, wireType 2 =*/58).fork(), _depth + 1).ldelim();
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret") && message.ret !== 0)
                        writer.uint32(/* id 8, wireType 0 =*/64).int32(message.ret);
                    if (message.toolCalls != null && message.toolCalls.length)
                        for (let i = 0; i < message.toolCalls.length; ++i)
                            $root.skynet.agent.v1.ToolCall.encode(message.toolCalls[i], writer.uint32(/* id 9, wireType 2 =*/74).fork(), _depth + 1).ldelim();
                    if (message.reasoning != null && message.reasoning.length)
                        for (let i = 0; i < message.reasoning.length; ++i)
                            $root.skynet.agent.v1.ReasoningBlock.encode(message.reasoning[i], writer.uint32(/* id 10, wireType 2 =*/82).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified ChatMessage message, length delimited. Does not implicitly {@link skynet.agent.v1.ChatMessage.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {skynet.agent.v1.ChatMessage.$Properties} message ChatMessage message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ChatMessage.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a ChatMessage message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape} ChatMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ChatMessage.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.ChatMessage();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.id = value;
                                else
                                    delete message.id;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.role = value;
                                else
                                    delete message.role;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.content = value;
                                else
                                    delete message.content;
                                continue;
                            }
                        case 4: {
                                if (wireType !== 0)
                                    break;
                                if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                                    message.createdAt = value;
                                else
                                    delete message.createdAt;
                                continue;
                            }
                        case 5: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.status = value;
                                else
                                    delete message.status;
                                continue;
                            }
                        case 6: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.runId = value;
                                else
                                    delete message.runId;
                                continue;
                            }
                        case 7: {
                                if (wireType !== 2)
                                    break;
                                message.error = $root.skynet.agent.v1.ErrorInfo.decode(reader, reader.size(), $undefined, _depth + 1, message.error);
                                continue;
                            }
                        case 8: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.ret = value;
                                else
                                    delete message.ret;
                                continue;
                            }
                        case 9: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.toolCalls && message.toolCalls.length))
                                    message.toolCalls = [];
                                message.toolCalls.push($root.skynet.agent.v1.ToolCall.decode(reader, reader.size(), $undefined, _depth + 1));
                                continue;
                            }
                        case 10: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.reasoning && message.reasoning.length))
                                    message.reasoning = [];
                                message.reasoning.push($root.skynet.agent.v1.ReasoningBlock.decode(reader, reader.size(), $undefined, _depth + 1));
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a ChatMessage message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape} ChatMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ChatMessage.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a ChatMessage message.
                 * @function verify
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ChatMessage.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.role != null && $Object.hasOwnProperty.call(message, "role"))
                        if (typeof message.role !== "number" || (message.role | 0) !== message.role)
                            return "role: enum value expected";
                    if (message.content != null && $Object.hasOwnProperty.call(message, "content"))
                        if (!$util.isString(message.content))
                            return "content: string expected";
                    if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                        if (!$util.isInteger(message.createdAt) && !(message.createdAt && $util.isInteger(message.createdAt.low) && $util.isInteger(message.createdAt.high)))
                            return "createdAt: integer|Long expected";
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        if (typeof message.status !== "number" || (message.status | 0) !== message.status)
                            return "status: enum value expected";
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        if (!$util.isString(message.runId))
                            return "runId: string expected";
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                        let error = $root.skynet.agent.v1.ErrorInfo.verify(message.error, _depth + 1);
                        if (error)
                            return "error." + error;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        if (!$util.isInteger(message.ret))
                            return "ret: integer expected";
                    if (message.toolCalls != null && $Object.hasOwnProperty.call(message, "toolCalls")) {
                        if (!$Array.isArray(message.toolCalls))
                            return "toolCalls: array expected";
                        for (let i = 0; i < message.toolCalls.length; ++i) {
                            let error = $root.skynet.agent.v1.ToolCall.verify(message.toolCalls[i], _depth + 1);
                            if (error)
                                return "toolCalls." + error;
                        }
                    }
                    if (message.reasoning != null && $Object.hasOwnProperty.call(message, "reasoning")) {
                        if (!$Array.isArray(message.reasoning))
                            return "reasoning: array expected";
                        for (let i = 0; i < message.reasoning.length; ++i) {
                            let error = $root.skynet.agent.v1.ReasoningBlock.verify(message.reasoning[i], _depth + 1);
                            if (error)
                                return "reasoning." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a ChatMessage message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.ChatMessage} ChatMessage
                 */
                ChatMessage.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.ChatMessage)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.ChatMessage: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.ChatMessage();
                    if (object.id != null)
                        if (typeof object.id !== "string" || object.id.length)
                            message.id = $String(object.id);
                    if (object.role !== 0 && (typeof object.role !== "string" || $root.skynet.agent.v1.MessageRole[object.role] !== 0))
                        switch (object.role) {
                        case "MESSAGE_ROLE_UNSPECIFIED":
                        case 0:
                            message.role = 0;
                            break;
                        case "MESSAGE_ROLE_USER":
                        case 1:
                            message.role = 1;
                            break;
                        case "MESSAGE_ROLE_ASSISTANT":
                        case 2:
                            message.role = 2;
                            break;
                        default:
                            if (typeof object.role === "number" && (object.role | 0) === object.role)
                                message.role = object.role;
                        }
                    if (object.content != null)
                        if (typeof object.content !== "string" || object.content.length)
                            message.content = $String(object.content);
                    if (object.createdAt != null)
                        if (typeof object.createdAt === "object" ? object.createdAt.low || object.createdAt.high : $Number(object.createdAt) !== 0)
                            if ($util.Long)
                                message.createdAt = $util.Long.fromValue(object.createdAt, true);
                            else if (typeof object.createdAt === "string")
                                message.createdAt = $parseInt(object.createdAt, 10);
                            else if (typeof object.createdAt === "number")
                                message.createdAt = object.createdAt;
                            else if (typeof object.createdAt === "object")
                                message.createdAt = new $util.LongBits(object.createdAt.low >>> 0, object.createdAt.high >>> 0).toNumber(true);
                    if (object.status !== 0 && (typeof object.status !== "string" || $root.skynet.agent.v1.MessageStatus[object.status] !== 0))
                        switch (object.status) {
                        case "MESSAGE_STATUS_UNSPECIFIED":
                        case 0:
                            message.status = 0;
                            break;
                        case "MESSAGE_STATUS_STREAMING":
                        case 1:
                            message.status = 1;
                            break;
                        case "MESSAGE_STATUS_COMPLETED":
                        case 2:
                            message.status = 2;
                            break;
                        case "MESSAGE_STATUS_CANCELLED":
                        case 3:
                            message.status = 3;
                            break;
                        case "MESSAGE_STATUS_FAILED":
                        case 4:
                            message.status = 4;
                            break;
                        default:
                            if (typeof object.status === "number" && (object.status | 0) === object.status)
                                message.status = object.status;
                        }
                    if (object.runId != null)
                        if (typeof object.runId !== "string" || object.runId.length)
                            message.runId = $String(object.runId);
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.ChatMessage.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.toolCalls) {
                        if (!$Array.isArray(object.toolCalls))
                            throw $TypeError(".skynet.agent.v1.ChatMessage.toolCalls: array expected");
                        message.toolCalls = $Array(object.toolCalls.length);
                        for (let i = 0; i < object.toolCalls.length; ++i) {
                            if (!$util.isObject(object.toolCalls[i]))
                                throw $TypeError(".skynet.agent.v1.ChatMessage.toolCalls: object expected");
                            message.toolCalls[i] = $root.skynet.agent.v1.ToolCall.fromObject(object.toolCalls[i], _depth + 1);
                        }
                    }
                    if (object.reasoning) {
                        if (!$Array.isArray(object.reasoning))
                            throw $TypeError(".skynet.agent.v1.ChatMessage.reasoning: array expected");
                        message.reasoning = $Array(object.reasoning.length);
                        for (let i = 0; i < object.reasoning.length; ++i) {
                            if (!$util.isObject(object.reasoning[i]))
                                throw $TypeError(".skynet.agent.v1.ChatMessage.reasoning: object expected");
                            message.reasoning[i] = $root.skynet.agent.v1.ReasoningBlock.fromObject(object.reasoning[i], _depth + 1);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a ChatMessage message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.ChatMessage
                 * @static
                 * @param {skynet.agent.v1.ChatMessage} message ChatMessage
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ChatMessage.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.arrays || options.defaults) {
                        object.toolCalls = [];
                        object.reasoning = [];
                    }
                    if (options.defaults) {
                        object.id = "";
                        object.role = options.enums === $String ? "MESSAGE_ROLE_UNSPECIFIED" : 0;
                        object.content = "";
                        if ($util.Long) {
                            let long = new $util.Long(0, 0, true);
                            object.createdAt = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                        } else
                            object.createdAt = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                        object.status = options.enums === $String ? "MESSAGE_STATUS_UNSPECIFIED" : 0;
                        object.runId = "";
                        object.error = null;
                        object.ret = 0;
                    }
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        object.id = message.id;
                    if (message.role != null && $Object.hasOwnProperty.call(message, "role"))
                        object.role = options.enums === $String ? $root.skynet.agent.v1.MessageRole[message.role] === $undefined ? message.role : $root.skynet.agent.v1.MessageRole[message.role] : message.role;
                    if (message.content != null && $Object.hasOwnProperty.call(message, "content"))
                        object.content = message.content;
                    if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                        if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                            object.createdAt = typeof message.createdAt === "number" ? $BigInt(message.createdAt) : $util.Long.fromBits(message.createdAt.low >>> 0, message.createdAt.high >>> 0, true).toBigInt();
                        else if (typeof message.createdAt === "number")
                            object.createdAt = options.longs === $String ? $String(message.createdAt) : message.createdAt;
                        else
                            object.createdAt = options.longs === $String ? $util.Long.prototype.toString.call(message.createdAt) : options.longs === $Number ? new $util.LongBits(message.createdAt.low >>> 0, message.createdAt.high >>> 0).toNumber(true) : message.createdAt;
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        object.status = options.enums === $String ? $root.skynet.agent.v1.MessageStatus[message.status] === $undefined ? message.status : $root.skynet.agent.v1.MessageStatus[message.status] : message.status;
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        object.runId = message.runId;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.toolCalls && message.toolCalls.length) {
                        object.toolCalls = $Array(message.toolCalls.length);
                        for (let j = 0; j < message.toolCalls.length; ++j)
                            object.toolCalls[j] = $root.skynet.agent.v1.ToolCall.toObject(message.toolCalls[j], options, _depth + 1);
                    }
                    if (message.reasoning && message.reasoning.length) {
                        object.reasoning = $Array(message.reasoning.length);
                        for (let j = 0; j < message.reasoning.length; ++j)
                            object.reasoning[j] = $root.skynet.agent.v1.ReasoningBlock.toObject(message.reasoning[j], options, _depth + 1);
                    }
                    return object;
                };

                /**
                 * Converts this ChatMessage to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.ChatMessage
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ChatMessage.prototype.toJSON = function() {
                    return ChatMessage.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ChatMessage;
            })();

            v1.ReasoningBlock = (function() {

                /**
                 * Properties of a ReasoningBlock.
                 * @typedef {Object} skynet.agent.v1.ReasoningBlock.$Properties
                 * @property {string|null} [id] ReasoningBlock id
                 * @property {string|null} [runId] ReasoningBlock runId
                 * @property {string|null} [modelId] ReasoningBlock modelId
                 * @property {string|null} [text] ReasoningBlock text
                 * @property {string|null} [status] ReasoningBlock status
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a ReasoningBlock.
                 * @memberof skynet.agent.v1
                 * @interface IReasoningBlock
                 * @augments skynet.agent.v1.ReasoningBlock.$Properties
                 * @deprecated Use skynet.agent.v1.ReasoningBlock.$Properties instead.
                 */

                /**
                 * Shape of a ReasoningBlock.
                 * @typedef {skynet.agent.v1.ReasoningBlock.$Properties} skynet.agent.v1.ReasoningBlock.$Shape
                 */

                /**
                 * Constructs a new ReasoningBlock.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a ReasoningBlock.
                 * @constructor
                 * @param {skynet.agent.v1.ReasoningBlock.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const ReasoningBlock = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * ReasoningBlock id.
                 * @member {string} id
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @instance
                 */
                ReasoningBlock.prototype.id = "";

                /**
                 * ReasoningBlock runId.
                 * @member {string} runId
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @instance
                 */
                ReasoningBlock.prototype.runId = "";

                /**
                 * ReasoningBlock modelId.
                 * @member {string} modelId
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @instance
                 */
                ReasoningBlock.prototype.modelId = "";

                /**
                 * ReasoningBlock text.
                 * @member {string} text
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @instance
                 */
                ReasoningBlock.prototype.text = "";

                /**
                 * ReasoningBlock status.
                 * @member {string} status
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @instance
                 */
                ReasoningBlock.prototype.status = "";

                /**
                 * Creates a new ReasoningBlock instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {skynet.agent.v1.ReasoningBlock.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.ReasoningBlock} ReasoningBlock instance
                 * @type {{
                 *   (properties: skynet.agent.v1.ReasoningBlock.$Shape): skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape;
                 *   (properties?: skynet.agent.v1.ReasoningBlock.$Properties): skynet.agent.v1.ReasoningBlock;
                 * }}
                 */
                ReasoningBlock.create = function(properties) {
                    return new ReasoningBlock(properties);
                };

                /**
                 * Encodes the specified ReasoningBlock message. Does not implicitly {@link skynet.agent.v1.ReasoningBlock.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {skynet.agent.v1.ReasoningBlock.$Properties} message ReasoningBlock message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ReasoningBlock.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId") && message.runId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.runId);
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId") && message.modelId !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.modelId);
                    if (message.text != null && $Object.hasOwnProperty.call(message, "text") && message.text !== "")
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.text);
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status") && message.status !== "")
                        writer.uint32(/* id 5, wireType 2 =*/42).string(message.status);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified ReasoningBlock message, length delimited. Does not implicitly {@link skynet.agent.v1.ReasoningBlock.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {skynet.agent.v1.ReasoningBlock.$Properties} message ReasoningBlock message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ReasoningBlock.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a ReasoningBlock message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape} ReasoningBlock
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ReasoningBlock.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.ReasoningBlock();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.id = value;
                                else
                                    delete message.id;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.runId = value;
                                else
                                    delete message.runId;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.modelId = value;
                                else
                                    delete message.modelId;
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.text = value;
                                else
                                    delete message.text;
                                continue;
                            }
                        case 5: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.status = value;
                                else
                                    delete message.status;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a ReasoningBlock message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape} ReasoningBlock
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ReasoningBlock.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a ReasoningBlock message.
                 * @function verify
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ReasoningBlock.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        if (!$util.isString(message.runId))
                            return "runId: string expected";
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId"))
                        if (!$util.isString(message.modelId))
                            return "modelId: string expected";
                    if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                        if (!$util.isString(message.text))
                            return "text: string expected";
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        if (!$util.isString(message.status))
                            return "status: string expected";
                    return null;
                };

                /**
                 * Creates a ReasoningBlock message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.ReasoningBlock} ReasoningBlock
                 */
                ReasoningBlock.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.ReasoningBlock)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.ReasoningBlock: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.ReasoningBlock();
                    if (object.id != null)
                        if (typeof object.id !== "string" || object.id.length)
                            message.id = $String(object.id);
                    if (object.runId != null)
                        if (typeof object.runId !== "string" || object.runId.length)
                            message.runId = $String(object.runId);
                    if (object.modelId != null)
                        if (typeof object.modelId !== "string" || object.modelId.length)
                            message.modelId = $String(object.modelId);
                    if (object.text != null)
                        if (typeof object.text !== "string" || object.text.length)
                            message.text = $String(object.text);
                    if (object.status != null)
                        if (typeof object.status !== "string" || object.status.length)
                            message.status = $String(object.status);
                    return message;
                };

                /**
                 * Creates a plain object from a ReasoningBlock message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @static
                 * @param {skynet.agent.v1.ReasoningBlock} message ReasoningBlock
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ReasoningBlock.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.id = "";
                        object.runId = "";
                        object.modelId = "";
                        object.text = "";
                        object.status = "";
                    }
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        object.id = message.id;
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        object.runId = message.runId;
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId"))
                        object.modelId = message.modelId;
                    if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                        object.text = message.text;
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        object.status = message.status;
                    return object;
                };

                /**
                 * Converts this ReasoningBlock to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.ReasoningBlock
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ReasoningBlock.prototype.toJSON = function() {
                    return ReasoningBlock.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ReasoningBlock;
            })();

            v1.ModelOption = (function() {

                /**
                 * Properties of a ModelOption.
                 * @typedef {Object} skynet.agent.v1.ModelOption.$Properties
                 * @property {string|null} [id] ModelOption id
                 * @property {string|null} [name] ModelOption name
                 * @property {string|null} [model] ModelOption model
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a ModelOption.
                 * @memberof skynet.agent.v1
                 * @interface IModelOption
                 * @augments skynet.agent.v1.ModelOption.$Properties
                 * @deprecated Use skynet.agent.v1.ModelOption.$Properties instead.
                 */

                /**
                 * Shape of a ModelOption.
                 * @typedef {skynet.agent.v1.ModelOption.$Properties} skynet.agent.v1.ModelOption.$Shape
                 */

                /**
                 * Constructs a new ModelOption.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a ModelOption.
                 * @constructor
                 * @param {skynet.agent.v1.ModelOption.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const ModelOption = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * ModelOption id.
                 * @member {string} id
                 * @memberof skynet.agent.v1.ModelOption
                 * @instance
                 */
                ModelOption.prototype.id = "";

                /**
                 * ModelOption name.
                 * @member {string} name
                 * @memberof skynet.agent.v1.ModelOption
                 * @instance
                 */
                ModelOption.prototype.name = "";

                /**
                 * ModelOption model.
                 * @member {string} model
                 * @memberof skynet.agent.v1.ModelOption
                 * @instance
                 */
                ModelOption.prototype.model = "";

                /**
                 * Creates a new ModelOption instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {skynet.agent.v1.ModelOption.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.ModelOption} ModelOption instance
                 * @type {{
                 *   (properties: skynet.agent.v1.ModelOption.$Shape): skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape;
                 *   (properties?: skynet.agent.v1.ModelOption.$Properties): skynet.agent.v1.ModelOption;
                 * }}
                 */
                ModelOption.create = function(properties) {
                    return new ModelOption(properties);
                };

                /**
                 * Encodes the specified ModelOption message. Does not implicitly {@link skynet.agent.v1.ModelOption.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {skynet.agent.v1.ModelOption.$Properties} message ModelOption message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ModelOption.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name") && message.name !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
                    if (message.model != null && $Object.hasOwnProperty.call(message, "model") && message.model !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.model);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified ModelOption message, length delimited. Does not implicitly {@link skynet.agent.v1.ModelOption.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {skynet.agent.v1.ModelOption.$Properties} message ModelOption message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ModelOption.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a ModelOption message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape} ModelOption
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ModelOption.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.ModelOption();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.id = value;
                                else
                                    delete message.id;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.name = value;
                                else
                                    delete message.name;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.model = value;
                                else
                                    delete message.model;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a ModelOption message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape} ModelOption
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ModelOption.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a ModelOption message.
                 * @function verify
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ModelOption.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                        if (!$util.isString(message.name))
                            return "name: string expected";
                    if (message.model != null && $Object.hasOwnProperty.call(message, "model"))
                        if (!$util.isString(message.model))
                            return "model: string expected";
                    return null;
                };

                /**
                 * Creates a ModelOption message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.ModelOption} ModelOption
                 */
                ModelOption.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.ModelOption)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.ModelOption: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.ModelOption();
                    if (object.id != null)
                        if (typeof object.id !== "string" || object.id.length)
                            message.id = $String(object.id);
                    if (object.name != null)
                        if (typeof object.name !== "string" || object.name.length)
                            message.name = $String(object.name);
                    if (object.model != null)
                        if (typeof object.model !== "string" || object.model.length)
                            message.model = $String(object.model);
                    return message;
                };

                /**
                 * Creates a plain object from a ModelOption message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.ModelOption
                 * @static
                 * @param {skynet.agent.v1.ModelOption} message ModelOption
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ModelOption.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.id = "";
                        object.name = "";
                        object.model = "";
                    }
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        object.id = message.id;
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                        object.name = message.name;
                    if (message.model != null && $Object.hasOwnProperty.call(message, "model"))
                        object.model = message.model;
                    return object;
                };

                /**
                 * Converts this ModelOption to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.ModelOption
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ModelOption.prototype.toJSON = function() {
                    return ModelOption.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ModelOption;
            })();

            v1.ToolCall = (function() {

                /**
                 * Properties of a ToolCall.
                 * @typedef {Object} skynet.agent.v1.ToolCall.$Properties
                 * @property {string|null} [id] ToolCall id
                 * @property {string|null} [name] ToolCall name
                 * @property {string|null} ["arguments"] ToolCall arguments
                 * @property {string|null} [status] ToolCall status
                 * @property {string|null} [permissionReason] ToolCall permissionReason
                 * @property {string|null} [permissionMode] ToolCall permissionMode
                 * @property {string|null} [output] ToolCall output
                 * @property {number|null} [exitCode] ToolCall exitCode
                 * @property {boolean|null} [truncated] ToolCall truncated
                 * @property {Array.<string>|null} [changedFiles] ToolCall changedFiles
                 * @property {string|null} [error] ToolCall error
                 * @property {string|null} [processId] ToolCall processId
                 * @property {string|null} [runId] ToolCall runId
                 * @property {string|null} [workingDirectory] ToolCall workingDirectory
                 * @property {Array.<skynet.agent.v1.ReasoningBlock.$Properties>|null} [reasoning] ToolCall reasoning
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a ToolCall.
                 * @memberof skynet.agent.v1
                 * @interface IToolCall
                 * @augments skynet.agent.v1.ToolCall.$Properties
                 * @deprecated Use skynet.agent.v1.ToolCall.$Properties instead.
                 */

                /**
                 * Shape of a ToolCall.
                 * @typedef {skynet.agent.v1.ToolCall.$Properties} skynet.agent.v1.ToolCall.$Shape
                 */

                /**
                 * Constructs a new ToolCall.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a ToolCall.
                 * @constructor
                 * @param {skynet.agent.v1.ToolCall.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const ToolCall = function (properties) {
                    this.changedFiles = [];
                    this.reasoning = [];
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * ToolCall id.
                 * @member {string} id
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.id = "";

                /**
                 * ToolCall name.
                 * @member {string} name
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.name = "";

                /**
                 * ToolCall arguments.
                 * @member {string} arguments
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype["arguments"] = "";

                /**
                 * ToolCall status.
                 * @member {string} status
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.status = "";

                /**
                 * ToolCall permissionReason.
                 * @member {string} permissionReason
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.permissionReason = "";

                /**
                 * ToolCall permissionMode.
                 * @member {string} permissionMode
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.permissionMode = "";

                /**
                 * ToolCall output.
                 * @member {string} output
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.output = "";

                /**
                 * ToolCall exitCode.
                 * @member {number|null|undefined} exitCode
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.exitCode = null;

                /**
                 * ToolCall truncated.
                 * @member {boolean} truncated
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.truncated = false;

                /**
                 * ToolCall changedFiles.
                 * @member {Array.<string>} changedFiles
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.changedFiles = $util.emptyArray;

                /**
                 * ToolCall error.
                 * @member {string} error
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.error = "";

                /**
                 * ToolCall processId.
                 * @member {string} processId
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.processId = "";

                /**
                 * ToolCall runId.
                 * @member {string} runId
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.runId = "";

                /**
                 * ToolCall workingDirectory.
                 * @member {string} workingDirectory
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.workingDirectory = "";

                /**
                 * ToolCall reasoning.
                 * @member {Array.<skynet.agent.v1.ReasoningBlock.$Properties>} reasoning
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 */
                ToolCall.prototype.reasoning = $util.emptyArray;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                // Virtual OneOf for proto3 optional field
                $Object.defineProperty(ToolCall.prototype, "_exitCode", {
                    get: $util.oneOfGetter($oneOfFields = ["exitCode"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Creates a new ToolCall instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {skynet.agent.v1.ToolCall.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.ToolCall} ToolCall instance
                 * @type {{
                 *   (properties: skynet.agent.v1.ToolCall.$Shape): skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape;
                 *   (properties?: skynet.agent.v1.ToolCall.$Properties): skynet.agent.v1.ToolCall;
                 * }}
                 */
                ToolCall.create = function(properties) {
                    return new ToolCall(properties);
                };

                /**
                 * Encodes the specified ToolCall message. Does not implicitly {@link skynet.agent.v1.ToolCall.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {skynet.agent.v1.ToolCall.$Properties} message ToolCall message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ToolCall.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name") && message.name !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
                    if (message["arguments"] != null && $Object.hasOwnProperty.call(message, "arguments") && message["arguments"] !== "")
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message["arguments"]);
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status") && message.status !== "")
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.status);
                    if (message.permissionReason != null && $Object.hasOwnProperty.call(message, "permissionReason") && message.permissionReason !== "")
                        writer.uint32(/* id 5, wireType 2 =*/42).string(message.permissionReason);
                    if (message.permissionMode != null && $Object.hasOwnProperty.call(message, "permissionMode") && message.permissionMode !== "")
                        writer.uint32(/* id 6, wireType 2 =*/50).string(message.permissionMode);
                    if (message.output != null && $Object.hasOwnProperty.call(message, "output") && message.output !== "")
                        writer.uint32(/* id 7, wireType 2 =*/58).string(message.output);
                    if (message.exitCode != null && $Object.hasOwnProperty.call(message, "exitCode"))
                        writer.uint32(/* id 8, wireType 0 =*/64).int32(message.exitCode);
                    if (message.truncated != null && $Object.hasOwnProperty.call(message, "truncated") && message.truncated !== false)
                        writer.uint32(/* id 9, wireType 0 =*/72).bool(message.truncated);
                    if (message.changedFiles != null && message.changedFiles.length)
                        for (let i = 0; i < message.changedFiles.length; ++i)
                            writer.uint32(/* id 10, wireType 2 =*/82).string(message.changedFiles[i]);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error") && message.error !== "")
                        writer.uint32(/* id 11, wireType 2 =*/90).string(message.error);
                    if (message.processId != null && $Object.hasOwnProperty.call(message, "processId") && message.processId !== "")
                        writer.uint32(/* id 12, wireType 2 =*/98).string(message.processId);
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId") && message.runId !== "")
                        writer.uint32(/* id 13, wireType 2 =*/106).string(message.runId);
                    if (message.workingDirectory != null && $Object.hasOwnProperty.call(message, "workingDirectory") && message.workingDirectory !== "")
                        writer.uint32(/* id 14, wireType 2 =*/114).string(message.workingDirectory);
                    if (message.reasoning != null && message.reasoning.length)
                        for (let i = 0; i < message.reasoning.length; ++i)
                            $root.skynet.agent.v1.ReasoningBlock.encode(message.reasoning[i], writer.uint32(/* id 15, wireType 2 =*/122).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified ToolCall message, length delimited. Does not implicitly {@link skynet.agent.v1.ToolCall.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {skynet.agent.v1.ToolCall.$Properties} message ToolCall message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ToolCall.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a ToolCall message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape} ToolCall
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ToolCall.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.ToolCall();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.id = value;
                                else
                                    delete message.id;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.name = value;
                                else
                                    delete message.name;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message["arguments"] = value;
                                else
                                    delete message["arguments"];
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.status = value;
                                else
                                    delete message.status;
                                continue;
                            }
                        case 5: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.permissionReason = value;
                                else
                                    delete message.permissionReason;
                                continue;
                            }
                        case 6: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.permissionMode = value;
                                else
                                    delete message.permissionMode;
                                continue;
                            }
                        case 7: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.output = value;
                                else
                                    delete message.output;
                                continue;
                            }
                        case 8: {
                                if (wireType !== 0)
                                    break;
                                message.exitCode = reader.int32();
                                message._exitCode = "exitCode";
                                continue;
                            }
                        case 9: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.bool())
                                    message.truncated = value;
                                else
                                    delete message.truncated;
                                continue;
                            }
                        case 10: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.changedFiles && message.changedFiles.length))
                                    message.changedFiles = [];
                                message.changedFiles.push(reader.stringVerify());
                                continue;
                            }
                        case 11: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.error = value;
                                else
                                    delete message.error;
                                continue;
                            }
                        case 12: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.processId = value;
                                else
                                    delete message.processId;
                                continue;
                            }
                        case 13: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.runId = value;
                                else
                                    delete message.runId;
                                continue;
                            }
                        case 14: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.workingDirectory = value;
                                else
                                    delete message.workingDirectory;
                                continue;
                            }
                        case 15: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.reasoning && message.reasoning.length))
                                    message.reasoning = [];
                                message.reasoning.push($root.skynet.agent.v1.ReasoningBlock.decode(reader, reader.size(), $undefined, _depth + 1));
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a ToolCall message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape} ToolCall
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ToolCall.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a ToolCall message.
                 * @function verify
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ToolCall.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    let properties = {};
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                        if (!$util.isString(message.name))
                            return "name: string expected";
                    if (message["arguments"] != null && $Object.hasOwnProperty.call(message, "arguments"))
                        if (!$util.isString(message["arguments"]))
                            return "arguments: string expected";
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        if (!$util.isString(message.status))
                            return "status: string expected";
                    if (message.permissionReason != null && $Object.hasOwnProperty.call(message, "permissionReason"))
                        if (!$util.isString(message.permissionReason))
                            return "permissionReason: string expected";
                    if (message.permissionMode != null && $Object.hasOwnProperty.call(message, "permissionMode"))
                        if (!$util.isString(message.permissionMode))
                            return "permissionMode: string expected";
                    if (message.output != null && $Object.hasOwnProperty.call(message, "output"))
                        if (!$util.isString(message.output))
                            return "output: string expected";
                    if (message.exitCode != null && $Object.hasOwnProperty.call(message, "exitCode")) {
                        properties._exitCode = 1;
                        if (!$util.isInteger(message.exitCode))
                            return "exitCode: integer expected";
                    }
                    if (message.truncated != null && $Object.hasOwnProperty.call(message, "truncated"))
                        if (typeof message.truncated !== "boolean")
                            return "truncated: boolean expected";
                    if (message.changedFiles != null && $Object.hasOwnProperty.call(message, "changedFiles")) {
                        if (!$Array.isArray(message.changedFiles))
                            return "changedFiles: array expected";
                        for (let i = 0; i < message.changedFiles.length; ++i)
                            if (!$util.isString(message.changedFiles[i]))
                                return "changedFiles: string[] expected";
                    }
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        if (!$util.isString(message.error))
                            return "error: string expected";
                    if (message.processId != null && $Object.hasOwnProperty.call(message, "processId"))
                        if (!$util.isString(message.processId))
                            return "processId: string expected";
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        if (!$util.isString(message.runId))
                            return "runId: string expected";
                    if (message.workingDirectory != null && $Object.hasOwnProperty.call(message, "workingDirectory"))
                        if (!$util.isString(message.workingDirectory))
                            return "workingDirectory: string expected";
                    if (message.reasoning != null && $Object.hasOwnProperty.call(message, "reasoning")) {
                        if (!$Array.isArray(message.reasoning))
                            return "reasoning: array expected";
                        for (let i = 0; i < message.reasoning.length; ++i) {
                            let error = $root.skynet.agent.v1.ReasoningBlock.verify(message.reasoning[i], _depth + 1);
                            if (error)
                                return "reasoning." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a ToolCall message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.ToolCall} ToolCall
                 */
                ToolCall.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.ToolCall)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.ToolCall: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.ToolCall();
                    if (object.id != null)
                        if (typeof object.id !== "string" || object.id.length)
                            message.id = $String(object.id);
                    if (object.name != null)
                        if (typeof object.name !== "string" || object.name.length)
                            message.name = $String(object.name);
                    if (object["arguments"] != null)
                        if (typeof object["arguments"] !== "string" || object["arguments"].length)
                            message["arguments"] = $String(object["arguments"]);
                    if (object.status != null)
                        if (typeof object.status !== "string" || object.status.length)
                            message.status = $String(object.status);
                    if (object.permissionReason != null)
                        if (typeof object.permissionReason !== "string" || object.permissionReason.length)
                            message.permissionReason = $String(object.permissionReason);
                    if (object.permissionMode != null)
                        if (typeof object.permissionMode !== "string" || object.permissionMode.length)
                            message.permissionMode = $String(object.permissionMode);
                    if (object.output != null)
                        if (typeof object.output !== "string" || object.output.length)
                            message.output = $String(object.output);
                    if (object.exitCode != null)
                        message.exitCode = object.exitCode | 0;
                    if (object.truncated != null)
                        if (object.truncated)
                            message.truncated = $Boolean(object.truncated);
                    if (object.changedFiles) {
                        if (!$Array.isArray(object.changedFiles))
                            throw $TypeError(".skynet.agent.v1.ToolCall.changedFiles: array expected");
                        message.changedFiles = $Array(object.changedFiles.length);
                        for (let i = 0; i < object.changedFiles.length; ++i)
                            message.changedFiles[i] = $String(object.changedFiles[i]);
                    }
                    if (object.error != null)
                        if (typeof object.error !== "string" || object.error.length)
                            message.error = $String(object.error);
                    if (object.processId != null)
                        if (typeof object.processId !== "string" || object.processId.length)
                            message.processId = $String(object.processId);
                    if (object.runId != null)
                        if (typeof object.runId !== "string" || object.runId.length)
                            message.runId = $String(object.runId);
                    if (object.workingDirectory != null)
                        if (typeof object.workingDirectory !== "string" || object.workingDirectory.length)
                            message.workingDirectory = $String(object.workingDirectory);
                    if (object.reasoning) {
                        if (!$Array.isArray(object.reasoning))
                            throw $TypeError(".skynet.agent.v1.ToolCall.reasoning: array expected");
                        message.reasoning = $Array(object.reasoning.length);
                        for (let i = 0; i < object.reasoning.length; ++i) {
                            if (!$util.isObject(object.reasoning[i]))
                                throw $TypeError(".skynet.agent.v1.ToolCall.reasoning: object expected");
                            message.reasoning[i] = $root.skynet.agent.v1.ReasoningBlock.fromObject(object.reasoning[i], _depth + 1);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a ToolCall message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.ToolCall
                 * @static
                 * @param {skynet.agent.v1.ToolCall} message ToolCall
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                ToolCall.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.arrays || options.defaults) {
                        object.changedFiles = [];
                        object.reasoning = [];
                    }
                    if (options.defaults) {
                        object.id = "";
                        object.name = "";
                        object["arguments"] = "";
                        object.status = "";
                        object.permissionReason = "";
                        object.permissionMode = "";
                        object.output = "";
                        object.truncated = false;
                        object.error = "";
                        object.processId = "";
                        object.runId = "";
                        object.workingDirectory = "";
                    }
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        object.id = message.id;
                    if (message.name != null && $Object.hasOwnProperty.call(message, "name"))
                        object.name = message.name;
                    if (message["arguments"] != null && $Object.hasOwnProperty.call(message, "arguments"))
                        object["arguments"] = message["arguments"];
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        object.status = message.status;
                    if (message.permissionReason != null && $Object.hasOwnProperty.call(message, "permissionReason"))
                        object.permissionReason = message.permissionReason;
                    if (message.permissionMode != null && $Object.hasOwnProperty.call(message, "permissionMode"))
                        object.permissionMode = message.permissionMode;
                    if (message.output != null && $Object.hasOwnProperty.call(message, "output"))
                        object.output = message.output;
                    if (message.exitCode != null && $Object.hasOwnProperty.call(message, "exitCode"))
                        object.exitCode = message.exitCode;
                    if (message.truncated != null && $Object.hasOwnProperty.call(message, "truncated"))
                        object.truncated = message.truncated;
                    if (message.changedFiles && message.changedFiles.length) {
                        object.changedFiles = $Array(message.changedFiles.length);
                        for (let j = 0; j < message.changedFiles.length; ++j)
                            object.changedFiles[j] = message.changedFiles[j];
                    }
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = message.error;
                    if (message.processId != null && $Object.hasOwnProperty.call(message, "processId"))
                        object.processId = message.processId;
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        object.runId = message.runId;
                    if (message.workingDirectory != null && $Object.hasOwnProperty.call(message, "workingDirectory"))
                        object.workingDirectory = message.workingDirectory;
                    if (message.reasoning && message.reasoning.length) {
                        object.reasoning = $Array(message.reasoning.length);
                        for (let j = 0; j < message.reasoning.length; ++j)
                            object.reasoning[j] = $root.skynet.agent.v1.ReasoningBlock.toObject(message.reasoning[j], options, _depth + 1);
                    }
                    return object;
                };

                /**
                 * Converts this ToolCall to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.ToolCall
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                ToolCall.prototype.toJSON = function() {
                    return ToolCall.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ToolCall;
            })();

            v1.SessionState = (function() {

                /**
                 * Properties of a SessionState.
                 * @typedef {Object} skynet.agent.v1.SessionState.$Properties
                 * @property {string|null} [id] SessionState id
                 * @property {string|null} [title] SessionState title
                 * @property {number|null} [updatedAt] SessionState updatedAt
                 * @property {number|null} [revision] SessionState revision
                 * @property {Array.<skynet.agent.v1.ChatMessage.$Properties>|null} [messages] SessionState messages
                 * @property {string|null} [runId] SessionState runId
                 * @property {boolean|null} [cancelling] SessionState cancelling
                 * @property {string|null} [modelId] SessionState modelId
                 * @property {string|null} [permissionModelId] SessionState permissionModelId
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionState.
                 * @memberof skynet.agent.v1
                 * @interface ISessionState
                 * @augments skynet.agent.v1.SessionState.$Properties
                 * @deprecated Use skynet.agent.v1.SessionState.$Properties instead.
                 */

                /**
                 * Shape of a SessionState.
                 * @typedef {skynet.agent.v1.SessionState.$Properties} skynet.agent.v1.SessionState.$Shape
                 */

                /**
                 * Constructs a new SessionState.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionState.
                 * @constructor
                 * @param {skynet.agent.v1.SessionState.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionState = function (properties) {
                    this.messages = [];
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionState id.
                 * @member {string} id
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.id = "";

                /**
                 * SessionState title.
                 * @member {string} title
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.title = "";

                /**
                 * SessionState updatedAt.
                 * @member {number} updatedAt
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.updatedAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * SessionState revision.
                 * @member {number} revision
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.revision = 0;

                /**
                 * SessionState messages.
                 * @member {Array.<skynet.agent.v1.ChatMessage.$Properties>} messages
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.messages = $util.emptyArray;

                /**
                 * SessionState runId.
                 * @member {string} runId
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.runId = "";

                /**
                 * SessionState cancelling.
                 * @member {boolean} cancelling
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.cancelling = false;

                /**
                 * SessionState modelId.
                 * @member {string} modelId
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.modelId = "";

                /**
                 * SessionState permissionModelId.
                 * @member {string} permissionModelId
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 */
                SessionState.prototype.permissionModelId = "";

                /**
                 * Creates a new SessionState instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {skynet.agent.v1.SessionState.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionState} SessionState instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionState.$Shape): skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape;
                 *   (properties?: skynet.agent.v1.SessionState.$Properties): skynet.agent.v1.SessionState;
                 * }}
                 */
                SessionState.create = function(properties) {
                    return new SessionState(properties);
                };

                /**
                 * Encodes the specified SessionState message. Does not implicitly {@link skynet.agent.v1.SessionState.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {skynet.agent.v1.SessionState.$Properties} message SessionState message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionState.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
                    if (message.title != null && $Object.hasOwnProperty.call(message, "title") && message.title !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.title);
                    if (message.updatedAt != null && $Object.hasOwnProperty.call(message, "updatedAt") && (typeof message.updatedAt === "object" ? message.updatedAt.low || message.updatedAt.high : message.updatedAt !== 0))
                        writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.updatedAt);
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision") && message.revision !== 0)
                        writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.revision);
                    if (message.messages != null && message.messages.length)
                        for (let i = 0; i < message.messages.length; ++i)
                            $root.skynet.agent.v1.ChatMessage.encode(message.messages[i], writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId") && message.runId !== "")
                        writer.uint32(/* id 6, wireType 2 =*/50).string(message.runId);
                    if (message.cancelling != null && $Object.hasOwnProperty.call(message, "cancelling") && message.cancelling !== false)
                        writer.uint32(/* id 7, wireType 0 =*/56).bool(message.cancelling);
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId") && message.modelId !== "")
                        writer.uint32(/* id 8, wireType 2 =*/66).string(message.modelId);
                    if (message.permissionModelId != null && $Object.hasOwnProperty.call(message, "permissionModelId") && message.permissionModelId !== "")
                        writer.uint32(/* id 9, wireType 2 =*/74).string(message.permissionModelId);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionState message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionState.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {skynet.agent.v1.SessionState.$Properties} message SessionState message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionState.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionState message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape} SessionState
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionState.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.SessionState();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.id = value;
                                else
                                    delete message.id;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.title = value;
                                else
                                    delete message.title;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 0)
                                    break;
                                if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                                    message.updatedAt = value;
                                else
                                    delete message.updatedAt;
                                continue;
                            }
                        case 4: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.uint32())
                                    message.revision = value;
                                else
                                    delete message.revision;
                                continue;
                            }
                        case 5: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.messages && message.messages.length))
                                    message.messages = [];
                                message.messages.push($root.skynet.agent.v1.ChatMessage.decode(reader, reader.size(), $undefined, _depth + 1));
                                continue;
                            }
                        case 6: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.runId = value;
                                else
                                    delete message.runId;
                                continue;
                            }
                        case 7: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.bool())
                                    message.cancelling = value;
                                else
                                    delete message.cancelling;
                                continue;
                            }
                        case 8: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.modelId = value;
                                else
                                    delete message.modelId;
                                continue;
                            }
                        case 9: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.permissionModelId = value;
                                else
                                    delete message.permissionModelId;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a SessionState message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape} SessionState
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionState.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionState message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionState.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        if (!$util.isString(message.id))
                            return "id: string expected";
                    if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                        if (!$util.isString(message.title))
                            return "title: string expected";
                    if (message.updatedAt != null && $Object.hasOwnProperty.call(message, "updatedAt"))
                        if (!$util.isInteger(message.updatedAt) && !(message.updatedAt && $util.isInteger(message.updatedAt.low) && $util.isInteger(message.updatedAt.high)))
                            return "updatedAt: integer|Long expected";
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        if (!$util.isInteger(message.revision))
                            return "revision: integer expected";
                    if (message.messages != null && $Object.hasOwnProperty.call(message, "messages")) {
                        if (!$Array.isArray(message.messages))
                            return "messages: array expected";
                        for (let i = 0; i < message.messages.length; ++i) {
                            let error = $root.skynet.agent.v1.ChatMessage.verify(message.messages[i], _depth + 1);
                            if (error)
                                return "messages." + error;
                        }
                    }
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        if (!$util.isString(message.runId))
                            return "runId: string expected";
                    if (message.cancelling != null && $Object.hasOwnProperty.call(message, "cancelling"))
                        if (typeof message.cancelling !== "boolean")
                            return "cancelling: boolean expected";
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId"))
                        if (!$util.isString(message.modelId))
                            return "modelId: string expected";
                    if (message.permissionModelId != null && $Object.hasOwnProperty.call(message, "permissionModelId"))
                        if (!$util.isString(message.permissionModelId))
                            return "permissionModelId: string expected";
                    return null;
                };

                /**
                 * Creates a SessionState message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionState} SessionState
                 */
                SessionState.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionState)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionState: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionState();
                    if (object.id != null)
                        if (typeof object.id !== "string" || object.id.length)
                            message.id = $String(object.id);
                    if (object.title != null)
                        if (typeof object.title !== "string" || object.title.length)
                            message.title = $String(object.title);
                    if (object.updatedAt != null)
                        if (typeof object.updatedAt === "object" ? object.updatedAt.low || object.updatedAt.high : $Number(object.updatedAt) !== 0)
                            if ($util.Long)
                                message.updatedAt = $util.Long.fromValue(object.updatedAt, true);
                            else if (typeof object.updatedAt === "string")
                                message.updatedAt = $parseInt(object.updatedAt, 10);
                            else if (typeof object.updatedAt === "number")
                                message.updatedAt = object.updatedAt;
                            else if (typeof object.updatedAt === "object")
                                message.updatedAt = new $util.LongBits(object.updatedAt.low >>> 0, object.updatedAt.high >>> 0).toNumber(true);
                    if (object.revision != null)
                        if ($Number(object.revision) !== 0)
                            message.revision = object.revision >>> 0;
                    if (object.messages) {
                        if (!$Array.isArray(object.messages))
                            throw $TypeError(".skynet.agent.v1.SessionState.messages: array expected");
                        message.messages = $Array(object.messages.length);
                        for (let i = 0; i < object.messages.length; ++i) {
                            if (!$util.isObject(object.messages[i]))
                                throw $TypeError(".skynet.agent.v1.SessionState.messages: object expected");
                            message.messages[i] = $root.skynet.agent.v1.ChatMessage.fromObject(object.messages[i], _depth + 1);
                        }
                    }
                    if (object.runId != null)
                        if (typeof object.runId !== "string" || object.runId.length)
                            message.runId = $String(object.runId);
                    if (object.cancelling != null)
                        if (object.cancelling)
                            message.cancelling = $Boolean(object.cancelling);
                    if (object.modelId != null)
                        if (typeof object.modelId !== "string" || object.modelId.length)
                            message.modelId = $String(object.modelId);
                    if (object.permissionModelId != null)
                        if (typeof object.permissionModelId !== "string" || object.permissionModelId.length)
                            message.permissionModelId = $String(object.permissionModelId);
                    return message;
                };

                /**
                 * Creates a plain object from a SessionState message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionState
                 * @static
                 * @param {skynet.agent.v1.SessionState} message SessionState
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionState.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.arrays || options.defaults)
                        object.messages = [];
                    if (options.defaults) {
                        object.id = "";
                        object.title = "";
                        if ($util.Long) {
                            let long = new $util.Long(0, 0, true);
                            object.updatedAt = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                        } else
                            object.updatedAt = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                        object.revision = 0;
                        object.runId = "";
                        object.cancelling = false;
                        object.modelId = "";
                        object.permissionModelId = "";
                    }
                    if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                        object.id = message.id;
                    if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                        object.title = message.title;
                    if (message.updatedAt != null && $Object.hasOwnProperty.call(message, "updatedAt"))
                        if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                            object.updatedAt = typeof message.updatedAt === "number" ? $BigInt(message.updatedAt) : $util.Long.fromBits(message.updatedAt.low >>> 0, message.updatedAt.high >>> 0, true).toBigInt();
                        else if (typeof message.updatedAt === "number")
                            object.updatedAt = options.longs === $String ? $String(message.updatedAt) : message.updatedAt;
                        else
                            object.updatedAt = options.longs === $String ? $util.Long.prototype.toString.call(message.updatedAt) : options.longs === $Number ? new $util.LongBits(message.updatedAt.low >>> 0, message.updatedAt.high >>> 0).toNumber(true) : message.updatedAt;
                    if (message.revision != null && $Object.hasOwnProperty.call(message, "revision"))
                        object.revision = message.revision;
                    if (message.messages && message.messages.length) {
                        object.messages = $Array(message.messages.length);
                        for (let j = 0; j < message.messages.length; ++j)
                            object.messages[j] = $root.skynet.agent.v1.ChatMessage.toObject(message.messages[j], options, _depth + 1);
                    }
                    if (message.runId != null && $Object.hasOwnProperty.call(message, "runId"))
                        object.runId = message.runId;
                    if (message.cancelling != null && $Object.hasOwnProperty.call(message, "cancelling"))
                        object.cancelling = message.cancelling;
                    if (message.modelId != null && $Object.hasOwnProperty.call(message, "modelId"))
                        object.modelId = message.modelId;
                    if (message.permissionModelId != null && $Object.hasOwnProperty.call(message, "permissionModelId"))
                        object.permissionModelId = message.permissionModelId;
                    return object;
                };

                /**
                 * Converts this SessionState to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionState
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionState.prototype.toJSON = function() {
                    return SessionState.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionState;
            })();

            v1.UserSnapshot = (function() {

                /**
                 * Properties of a UserSnapshot.
                 * @typedef {Object} skynet.agent.v1.UserSnapshot.$Properties
                 * @property {string|null} [userId] UserSnapshot userId
                 * @property {string|null} [username] UserSnapshot username
                 * @property {Array.<skynet.agent.v1.SessionState.$Properties>|null} [sessions] UserSnapshot sessions
                 * @property {Array.<skynet.agent.v1.ModelOption.$Properties>|null} [models] UserSnapshot models
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a UserSnapshot.
                 * @memberof skynet.agent.v1
                 * @interface IUserSnapshot
                 * @augments skynet.agent.v1.UserSnapshot.$Properties
                 * @deprecated Use skynet.agent.v1.UserSnapshot.$Properties instead.
                 */

                /**
                 * Shape of a UserSnapshot.
                 * @typedef {skynet.agent.v1.UserSnapshot.$Properties} skynet.agent.v1.UserSnapshot.$Shape
                 */

                /**
                 * Constructs a new UserSnapshot.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a UserSnapshot.
                 * @constructor
                 * @param {skynet.agent.v1.UserSnapshot.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const UserSnapshot = function (properties) {
                    this.sessions = [];
                    this.models = [];
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * UserSnapshot userId.
                 * @member {string} userId
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @instance
                 */
                UserSnapshot.prototype.userId = "";

                /**
                 * UserSnapshot username.
                 * @member {string} username
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @instance
                 */
                UserSnapshot.prototype.username = "";

                /**
                 * UserSnapshot sessions.
                 * @member {Array.<skynet.agent.v1.SessionState.$Properties>} sessions
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @instance
                 */
                UserSnapshot.prototype.sessions = $util.emptyArray;

                /**
                 * UserSnapshot models.
                 * @member {Array.<skynet.agent.v1.ModelOption.$Properties>} models
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @instance
                 */
                UserSnapshot.prototype.models = $util.emptyArray;

                /**
                 * Creates a new UserSnapshot instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {skynet.agent.v1.UserSnapshot.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.UserSnapshot} UserSnapshot instance
                 * @type {{
                 *   (properties: skynet.agent.v1.UserSnapshot.$Shape): skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape;
                 *   (properties?: skynet.agent.v1.UserSnapshot.$Properties): skynet.agent.v1.UserSnapshot;
                 * }}
                 */
                UserSnapshot.create = function(properties) {
                    return new UserSnapshot(properties);
                };

                /**
                 * Encodes the specified UserSnapshot message. Does not implicitly {@link skynet.agent.v1.UserSnapshot.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {skynet.agent.v1.UserSnapshot.$Properties} message UserSnapshot message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UserSnapshot.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.userId != null && $Object.hasOwnProperty.call(message, "userId") && message.userId !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.userId);
                    if (message.username != null && $Object.hasOwnProperty.call(message, "username") && message.username !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.username);
                    if (message.sessions != null && message.sessions.length)
                        for (let i = 0; i < message.sessions.length; ++i)
                            $root.skynet.agent.v1.SessionState.encode(message.sessions[i], writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.models != null && message.models.length)
                        for (let i = 0; i < message.models.length; ++i)
                            $root.skynet.agent.v1.ModelOption.encode(message.models[i], writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified UserSnapshot message, length delimited. Does not implicitly {@link skynet.agent.v1.UserSnapshot.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {skynet.agent.v1.UserSnapshot.$Properties} message UserSnapshot message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UserSnapshot.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a UserSnapshot message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape} UserSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UserSnapshot.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.UserSnapshot();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.userId = value;
                                else
                                    delete message.userId;
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.username = value;
                                else
                                    delete message.username;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.sessions && message.sessions.length))
                                    message.sessions = [];
                                message.sessions.push($root.skynet.agent.v1.SessionState.decode(reader, reader.size(), $undefined, _depth + 1));
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.models && message.models.length))
                                    message.models = [];
                                message.models.push($root.skynet.agent.v1.ModelOption.decode(reader, reader.size(), $undefined, _depth + 1));
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a UserSnapshot message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape} UserSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UserSnapshot.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a UserSnapshot message.
                 * @function verify
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                UserSnapshot.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.userId != null && $Object.hasOwnProperty.call(message, "userId"))
                        if (!$util.isString(message.userId))
                            return "userId: string expected";
                    if (message.username != null && $Object.hasOwnProperty.call(message, "username"))
                        if (!$util.isString(message.username))
                            return "username: string expected";
                    if (message.sessions != null && $Object.hasOwnProperty.call(message, "sessions")) {
                        if (!$Array.isArray(message.sessions))
                            return "sessions: array expected";
                        for (let i = 0; i < message.sessions.length; ++i) {
                            let error = $root.skynet.agent.v1.SessionState.verify(message.sessions[i], _depth + 1);
                            if (error)
                                return "sessions." + error;
                        }
                    }
                    if (message.models != null && $Object.hasOwnProperty.call(message, "models")) {
                        if (!$Array.isArray(message.models))
                            return "models: array expected";
                        for (let i = 0; i < message.models.length; ++i) {
                            let error = $root.skynet.agent.v1.ModelOption.verify(message.models[i], _depth + 1);
                            if (error)
                                return "models." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a UserSnapshot message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.UserSnapshot} UserSnapshot
                 */
                UserSnapshot.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.UserSnapshot)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.UserSnapshot: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.UserSnapshot();
                    if (object.userId != null)
                        if (typeof object.userId !== "string" || object.userId.length)
                            message.userId = $String(object.userId);
                    if (object.username != null)
                        if (typeof object.username !== "string" || object.username.length)
                            message.username = $String(object.username);
                    if (object.sessions) {
                        if (!$Array.isArray(object.sessions))
                            throw $TypeError(".skynet.agent.v1.UserSnapshot.sessions: array expected");
                        message.sessions = $Array(object.sessions.length);
                        for (let i = 0; i < object.sessions.length; ++i) {
                            if (!$util.isObject(object.sessions[i]))
                                throw $TypeError(".skynet.agent.v1.UserSnapshot.sessions: object expected");
                            message.sessions[i] = $root.skynet.agent.v1.SessionState.fromObject(object.sessions[i], _depth + 1);
                        }
                    }
                    if (object.models) {
                        if (!$Array.isArray(object.models))
                            throw $TypeError(".skynet.agent.v1.UserSnapshot.models: array expected");
                        message.models = $Array(object.models.length);
                        for (let i = 0; i < object.models.length; ++i) {
                            if (!$util.isObject(object.models[i]))
                                throw $TypeError(".skynet.agent.v1.UserSnapshot.models: object expected");
                            message.models[i] = $root.skynet.agent.v1.ModelOption.fromObject(object.models[i], _depth + 1);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a UserSnapshot message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @static
                 * @param {skynet.agent.v1.UserSnapshot} message UserSnapshot
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                UserSnapshot.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.arrays || options.defaults) {
                        object.sessions = [];
                        object.models = [];
                    }
                    if (options.defaults) {
                        object.userId = "";
                        object.username = "";
                    }
                    if (message.userId != null && $Object.hasOwnProperty.call(message, "userId"))
                        object.userId = message.userId;
                    if (message.username != null && $Object.hasOwnProperty.call(message, "username"))
                        object.username = message.username;
                    if (message.sessions && message.sessions.length) {
                        object.sessions = $Array(message.sessions.length);
                        for (let j = 0; j < message.sessions.length; ++j)
                            object.sessions[j] = $root.skynet.agent.v1.SessionState.toObject(message.sessions[j], options, _depth + 1);
                    }
                    if (message.models && message.models.length) {
                        object.models = $Array(message.models.length);
                        for (let j = 0; j < message.models.length; ++j)
                            object.models[j] = $root.skynet.agent.v1.ModelOption.toObject(message.models[j], options, _depth + 1);
                    }
                    return object;
                };

                /**
                 * Converts this UserSnapshot to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.UserSnapshot
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                UserSnapshot.prototype.toJSON = function() {
                    return UserSnapshot.toObject(this, $protobuf.util.toJSONOptions);
                };

                return UserSnapshot;
            })();

            v1.LoginReq = (function() {

                /**
                 * Properties of a LoginReq.
                 * @typedef {Object} skynet.agent.v1.LoginReq.$Properties
                 * @property {string|null} [username] LoginReq username
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a LoginReq.
                 * @memberof skynet.agent.v1
                 * @interface ILoginReq
                 * @augments skynet.agent.v1.LoginReq.$Properties
                 * @deprecated Use skynet.agent.v1.LoginReq.$Properties instead.
                 */

                /**
                 * Shape of a LoginReq.
                 * @typedef {skynet.agent.v1.LoginReq.$Properties} skynet.agent.v1.LoginReq.$Shape
                 */

                /**
                 * Constructs a new LoginReq.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a LoginReq.
                 * @constructor
                 * @param {skynet.agent.v1.LoginReq.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const LoginReq = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * LoginReq username.
                 * @member {string} username
                 * @memberof skynet.agent.v1.LoginReq
                 * @instance
                 */
                LoginReq.prototype.username = "";

                /**
                 * Creates a new LoginReq instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {skynet.agent.v1.LoginReq.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.LoginReq} LoginReq instance
                 * @type {{
                 *   (properties: skynet.agent.v1.LoginReq.$Shape): skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape;
                 *   (properties?: skynet.agent.v1.LoginReq.$Properties): skynet.agent.v1.LoginReq;
                 * }}
                 */
                LoginReq.create = function(properties) {
                    return new LoginReq(properties);
                };

                /**
                 * Encodes the specified LoginReq message. Does not implicitly {@link skynet.agent.v1.LoginReq.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {skynet.agent.v1.LoginReq.$Properties} message LoginReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                LoginReq.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.username != null && $Object.hasOwnProperty.call(message, "username") && message.username !== "")
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.username);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified LoginReq message, length delimited. Does not implicitly {@link skynet.agent.v1.LoginReq.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {skynet.agent.v1.LoginReq.$Properties} message LoginReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                LoginReq.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a LoginReq message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape} LoginReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                LoginReq.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.LoginReq();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 1: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.username = value;
                                else
                                    delete message.username;
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a LoginReq message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape} LoginReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                LoginReq.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a LoginReq message.
                 * @function verify
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                LoginReq.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.username != null && $Object.hasOwnProperty.call(message, "username"))
                        if (!$util.isString(message.username))
                            return "username: string expected";
                    return null;
                };

                /**
                 * Creates a LoginReq message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.LoginReq} LoginReq
                 */
                LoginReq.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.LoginReq)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.LoginReq: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.LoginReq();
                    if (object.username != null)
                        if (typeof object.username !== "string" || object.username.length)
                            message.username = $String(object.username);
                    return message;
                };

                /**
                 * Creates a plain object from a LoginReq message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.LoginReq
                 * @static
                 * @param {skynet.agent.v1.LoginReq} message LoginReq
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                LoginReq.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults)
                        object.username = "";
                    if (message.username != null && $Object.hasOwnProperty.call(message, "username"))
                        object.username = message.username;
                    return object;
                };

                /**
                 * Converts this LoginReq to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.LoginReq
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                LoginReq.prototype.toJSON = function() {
                    return LoginReq.toObject(this, $protobuf.util.toJSONOptions);
                };

                return LoginReq;
            })();

            v1.LoginRes = (function() {

                /**
                 * Properties of a LoginRes.
                 * @typedef {Object} skynet.agent.v1.LoginRes.$Properties
                 * @property {number|null} [ret] LoginRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] LoginRes error
                 * @property {skynet.agent.v1.UserSnapshot.$Properties|null} [snapshot] LoginRes snapshot
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a LoginRes.
                 * @memberof skynet.agent.v1
                 * @interface ILoginRes
                 * @augments skynet.agent.v1.LoginRes.$Properties
                 * @deprecated Use skynet.agent.v1.LoginRes.$Properties instead.
                 */

                /**
                 * Shape of a LoginRes.
                 * @typedef {skynet.agent.v1.LoginRes.$Properties} skynet.agent.v1.LoginRes.$Shape
                 */

                /**
                 * Constructs a new LoginRes.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a LoginRes.
                 * @constructor
                 * @param {skynet.agent.v1.LoginRes.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const LoginRes = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * LoginRes ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.LoginRes
                 * @instance
                 */
                LoginRes.prototype.ret = 0;

                /**
                 * LoginRes error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.LoginRes
                 * @instance
                 */
                LoginRes.prototype.error = null;

                /**
                 * LoginRes snapshot.
                 * @member {skynet.agent.v1.UserSnapshot.$Properties|null|undefined} snapshot
                 * @memberof skynet.agent.v1.LoginRes
                 * @instance
                 */
                LoginRes.prototype.snapshot = null;

                /**
                 * Creates a new LoginRes instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {skynet.agent.v1.LoginRes.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.LoginRes} LoginRes instance
                 * @type {{
                 *   (properties: skynet.agent.v1.LoginRes.$Shape): skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape;
                 *   (properties?: skynet.agent.v1.LoginRes.$Properties): skynet.agent.v1.LoginRes;
                 * }}
                 */
                LoginRes.create = function(properties) {
                    return new LoginRes(properties);
                };

                /**
                 * Encodes the specified LoginRes message. Does not implicitly {@link skynet.agent.v1.LoginRes.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {skynet.agent.v1.LoginRes.$Properties} message LoginRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                LoginRes.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret") && message.ret !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.ret);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        $root.skynet.agent.v1.ErrorInfo.encode(message.error, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.snapshot != null && $Object.hasOwnProperty.call(message, "snapshot"))
                        $root.skynet.agent.v1.UserSnapshot.encode(message.snapshot, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified LoginRes message, length delimited. Does not implicitly {@link skynet.agent.v1.LoginRes.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {skynet.agent.v1.LoginRes.$Properties} message LoginRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                LoginRes.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a LoginRes message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape} LoginRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                LoginRes.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.LoginRes();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.ret = value;
                                else
                                    delete message.ret;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                message.error = $root.skynet.agent.v1.ErrorInfo.decode(reader, reader.size(), $undefined, _depth + 1, message.error);
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                message.snapshot = $root.skynet.agent.v1.UserSnapshot.decode(reader, reader.size(), $undefined, _depth + 1, message.snapshot);
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a LoginRes message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape} LoginRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                LoginRes.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a LoginRes message.
                 * @function verify
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                LoginRes.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        if (!$util.isInteger(message.ret))
                            return "ret: integer expected";
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                        let error = $root.skynet.agent.v1.ErrorInfo.verify(message.error, _depth + 1);
                        if (error)
                            return "error." + error;
                    }
                    if (message.snapshot != null && $Object.hasOwnProperty.call(message, "snapshot")) {
                        let error = $root.skynet.agent.v1.UserSnapshot.verify(message.snapshot, _depth + 1);
                        if (error)
                            return "snapshot." + error;
                    }
                    return null;
                };

                /**
                 * Creates a LoginRes message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.LoginRes} LoginRes
                 */
                LoginRes.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.LoginRes)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.LoginRes: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.LoginRes();
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.LoginRes.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    if (object.snapshot != null) {
                        if (!$util.isObject(object.snapshot))
                            throw $TypeError(".skynet.agent.v1.LoginRes.snapshot: object expected");
                        message.snapshot = $root.skynet.agent.v1.UserSnapshot.fromObject(object.snapshot, _depth + 1);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a LoginRes message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.LoginRes
                 * @static
                 * @param {skynet.agent.v1.LoginRes} message LoginRes
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                LoginRes.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.ret = 0;
                        object.error = null;
                        object.snapshot = null;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.snapshot != null && $Object.hasOwnProperty.call(message, "snapshot"))
                        object.snapshot = $root.skynet.agent.v1.UserSnapshot.toObject(message.snapshot, options, _depth + 1);
                    return object;
                };

                /**
                 * Converts this LoginRes to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.LoginRes
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                LoginRes.prototype.toJSON = function() {
                    return LoginRes.toObject(this, $protobuf.util.toJSONOptions);
                };

                return LoginRes;
            })();

            v1.UserSnapshotReq = (function() {

                /**
                 * Properties of a UserSnapshotReq.
                 * @typedef {Object} skynet.agent.v1.UserSnapshotReq.$Properties
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a UserSnapshotReq.
                 * @memberof skynet.agent.v1
                 * @interface IUserSnapshotReq
                 * @augments skynet.agent.v1.UserSnapshotReq.$Properties
                 * @deprecated Use skynet.agent.v1.UserSnapshotReq.$Properties instead.
                 */

                /**
                 * Shape of a UserSnapshotReq.
                 * @typedef {skynet.agent.v1.UserSnapshotReq.$Properties} skynet.agent.v1.UserSnapshotReq.$Shape
                 */

                /**
                 * Constructs a new UserSnapshotReq.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a UserSnapshotReq.
                 * @constructor
                 * @param {skynet.agent.v1.UserSnapshotReq.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const UserSnapshotReq = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * Creates a new UserSnapshotReq instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotReq.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.UserSnapshotReq} UserSnapshotReq instance
                 * @type {{
                 *   (properties: skynet.agent.v1.UserSnapshotReq.$Shape): skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape;
                 *   (properties?: skynet.agent.v1.UserSnapshotReq.$Properties): skynet.agent.v1.UserSnapshotReq;
                 * }}
                 */
                UserSnapshotReq.create = function(properties) {
                    return new UserSnapshotReq(properties);
                };

                /**
                 * Encodes the specified UserSnapshotReq message. Does not implicitly {@link skynet.agent.v1.UserSnapshotReq.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotReq.$Properties} message UserSnapshotReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UserSnapshotReq.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified UserSnapshotReq message, length delimited. Does not implicitly {@link skynet.agent.v1.UserSnapshotReq.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotReq.$Properties} message UserSnapshotReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UserSnapshotReq.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a UserSnapshotReq message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape} UserSnapshotReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UserSnapshotReq.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.UserSnapshotReq();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        reader.skipType(tag & 7, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a UserSnapshotReq message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape} UserSnapshotReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UserSnapshotReq.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a UserSnapshotReq message.
                 * @function verify
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                UserSnapshotReq.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    return null;
                };

                /**
                 * Creates a UserSnapshotReq message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.UserSnapshotReq} UserSnapshotReq
                 */
                UserSnapshotReq.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.UserSnapshotReq)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.UserSnapshotReq: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    return new $root.skynet.agent.v1.UserSnapshotReq();
                };

                /**
                 * Creates a plain object from a UserSnapshotReq message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotReq} message UserSnapshotReq
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                UserSnapshotReq.toObject = function () {
                    return {};
                };

                /**
                 * Converts this UserSnapshotReq to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.UserSnapshotReq
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                UserSnapshotReq.prototype.toJSON = function() {
                    return UserSnapshotReq.toObject(this, $protobuf.util.toJSONOptions);
                };

                return UserSnapshotReq;
            })();

            v1.UserSnapshotRes = (function() {

                /**
                 * Properties of a UserSnapshotRes.
                 * @typedef {Object} skynet.agent.v1.UserSnapshotRes.$Properties
                 * @property {number|null} [ret] UserSnapshotRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] UserSnapshotRes error
                 * @property {skynet.agent.v1.UserSnapshot.$Properties|null} [snapshot] UserSnapshotRes snapshot
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a UserSnapshotRes.
                 * @memberof skynet.agent.v1
                 * @interface IUserSnapshotRes
                 * @augments skynet.agent.v1.UserSnapshotRes.$Properties
                 * @deprecated Use skynet.agent.v1.UserSnapshotRes.$Properties instead.
                 */

                /**
                 * Shape of a UserSnapshotRes.
                 * @typedef {skynet.agent.v1.UserSnapshotRes.$Properties} skynet.agent.v1.UserSnapshotRes.$Shape
                 */

                /**
                 * Constructs a new UserSnapshotRes.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a UserSnapshotRes.
                 * @constructor
                 * @param {skynet.agent.v1.UserSnapshotRes.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const UserSnapshotRes = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * UserSnapshotRes ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @instance
                 */
                UserSnapshotRes.prototype.ret = 0;

                /**
                 * UserSnapshotRes error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @instance
                 */
                UserSnapshotRes.prototype.error = null;

                /**
                 * UserSnapshotRes snapshot.
                 * @member {skynet.agent.v1.UserSnapshot.$Properties|null|undefined} snapshot
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @instance
                 */
                UserSnapshotRes.prototype.snapshot = null;

                /**
                 * Creates a new UserSnapshotRes instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotRes.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.UserSnapshotRes} UserSnapshotRes instance
                 * @type {{
                 *   (properties: skynet.agent.v1.UserSnapshotRes.$Shape): skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape;
                 *   (properties?: skynet.agent.v1.UserSnapshotRes.$Properties): skynet.agent.v1.UserSnapshotRes;
                 * }}
                 */
                UserSnapshotRes.create = function(properties) {
                    return new UserSnapshotRes(properties);
                };

                /**
                 * Encodes the specified UserSnapshotRes message. Does not implicitly {@link skynet.agent.v1.UserSnapshotRes.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotRes.$Properties} message UserSnapshotRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UserSnapshotRes.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret") && message.ret !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.ret);
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        $root.skynet.agent.v1.ErrorInfo.encode(message.error, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.snapshot != null && $Object.hasOwnProperty.call(message, "snapshot"))
                        $root.skynet.agent.v1.UserSnapshot.encode(message.snapshot, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified UserSnapshotRes message, length delimited. Does not implicitly {@link skynet.agent.v1.UserSnapshotRes.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotRes.$Properties} message UserSnapshotRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UserSnapshotRes.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a UserSnapshotRes message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape} UserSnapshotRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UserSnapshotRes.decode = function (reader, length, _end, _depth, _target) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $Reader.recursionLimit)
                        throw $Error("max depth exceeded");
                    let end, message, value;
                    if (length === $undefined)
                        end = reader.len;
                    else {
                        end = reader.pos + length;
                        if (end > reader.len)
                            throw $RangeError("index out of range");
                        length = reader.len;
                        reader.len = end;
                    }
                    message = _target || new $root.skynet.agent.v1.UserSnapshotRes();
                    while (reader.pos < end) {
                        let start = reader.pos;
                        let tag = reader.tag();
                        if (tag === _end) {
                            _end = $undefined;
                            break;
                        }
                        let wireType = tag & 7;
                        switch (tag >>>= 3) {
                        case 2: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
                                    message.ret = value;
                                else
                                    delete message.ret;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                message.error = $root.skynet.agent.v1.ErrorInfo.decode(reader, reader.size(), $undefined, _depth + 1, message.error);
                                continue;
                            }
                        case 4: {
                                if (wireType !== 2)
                                    break;
                                message.snapshot = $root.skynet.agent.v1.UserSnapshot.decode(reader, reader.size(), $undefined, _depth + 1, message.snapshot);
                                continue;
                            }
                        }
                        reader.skipType(wireType, _depth, tag);
                        if (!reader.discardUnknown) {
                            $util.makeProp(message, "$unknowns", false);
                            (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                        }
                    }
                    if (length !== $undefined) {
                        if (reader.pos !== end)
                            throw $RangeError("index out of range");
                        reader.len = length;
                    }
                    if (_end !== $undefined)
                        throw $Error("missing end group");
                    return message;
                };

                /**
                 * Decodes a UserSnapshotRes message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape} UserSnapshotRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UserSnapshotRes.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a UserSnapshotRes message.
                 * @function verify
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                UserSnapshotRes.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        if (!$util.isInteger(message.ret))
                            return "ret: integer expected";
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                        let error = $root.skynet.agent.v1.ErrorInfo.verify(message.error, _depth + 1);
                        if (error)
                            return "error." + error;
                    }
                    if (message.snapshot != null && $Object.hasOwnProperty.call(message, "snapshot")) {
                        let error = $root.skynet.agent.v1.UserSnapshot.verify(message.snapshot, _depth + 1);
                        if (error)
                            return "snapshot." + error;
                    }
                    return null;
                };

                /**
                 * Creates a UserSnapshotRes message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.UserSnapshotRes} UserSnapshotRes
                 */
                UserSnapshotRes.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.UserSnapshotRes)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.UserSnapshotRes: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.UserSnapshotRes();
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.UserSnapshotRes.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    if (object.snapshot != null) {
                        if (!$util.isObject(object.snapshot))
                            throw $TypeError(".skynet.agent.v1.UserSnapshotRes.snapshot: object expected");
                        message.snapshot = $root.skynet.agent.v1.UserSnapshot.fromObject(object.snapshot, _depth + 1);
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a UserSnapshotRes message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @static
                 * @param {skynet.agent.v1.UserSnapshotRes} message UserSnapshotRes
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                UserSnapshotRes.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.ret = 0;
                        object.error = null;
                        object.snapshot = null;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.snapshot != null && $Object.hasOwnProperty.call(message, "snapshot"))
                        object.snapshot = $root.skynet.agent.v1.UserSnapshot.toObject(message.snapshot, options, _depth + 1);
                    return object;
                };

                /**
                 * Converts this UserSnapshotRes to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.UserSnapshotRes
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                UserSnapshotRes.prototype.toJSON = function() {
                    return UserSnapshotRes.toObject(this, $protobuf.util.toJSONOptions);
                };

                return UserSnapshotRes;
            })();

            return v1;
        })();

        return agent;
    })();

    return skynet;
})();

export {
  $root as default
};
