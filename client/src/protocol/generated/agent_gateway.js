/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $RangeError = $util.global.RangeError, $TypeError = $util.global.TypeError, $Array = $util.global.Array, $Number = $util.global.Number, $String = $util.global.String, $Boolean = $util.global.Boolean, $parseInt = $util.global.parseInt, $BigInt = $util.global.BigInt;

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
                 * @property {skynet.agent.v1.SessionSummary.$Properties|null} [session] SessionCreateRes session
                 * @property {Array.<skynet.agent.v1.ChatMessage.$Properties>|null} [messages] SessionCreateRes messages
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
                    this.messages = [];
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
                 * @member {skynet.agent.v1.SessionSummary.$Properties|null|undefined} session
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @instance
                 */
                SessionCreateRes.prototype.session = null;

                /**
                 * SessionCreateRes messages.
                 * @member {Array.<skynet.agent.v1.ChatMessage.$Properties>} messages
                 * @memberof skynet.agent.v1.SessionCreateRes
                 * @instance
                 */
                SessionCreateRes.prototype.messages = $util.emptyArray;

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
                        $root.skynet.agent.v1.SessionSummary.encode(message.session, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
                    if (message.messages != null && message.messages.length)
                        for (let i = 0; i < message.messages.length; ++i)
                            $root.skynet.agent.v1.ChatMessage.encode(message.messages[i], writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
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
                                message.session = $root.skynet.agent.v1.SessionSummary.decode(reader, reader.size(), $undefined, _depth + 1, message.session);
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
                        let error = $root.skynet.agent.v1.SessionSummary.verify(message.session, _depth + 1);
                        if (error)
                            return "session." + error;
                    }
                    if (message.messages != null && $Object.hasOwnProperty.call(message, "messages")) {
                        if (!$Array.isArray(message.messages))
                            return "messages: array expected";
                        for (let i = 0; i < message.messages.length; ++i) {
                            let error = $root.skynet.agent.v1.ChatMessage.verify(message.messages[i], _depth + 1);
                            if (error)
                                return "messages." + error;
                        }
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
                        message.session = $root.skynet.agent.v1.SessionSummary.fromObject(object.session, _depth + 1);
                    }
                    if (object.messages) {
                        if (!$Array.isArray(object.messages))
                            throw $TypeError(".skynet.agent.v1.SessionCreateRes.messages: array expected");
                        message.messages = $Array(object.messages.length);
                        for (let i = 0; i < object.messages.length; ++i) {
                            if (!$util.isObject(object.messages[i]))
                                throw $TypeError(".skynet.agent.v1.SessionCreateRes.messages: object expected");
                            message.messages[i] = $root.skynet.agent.v1.ChatMessage.fromObject(object.messages[i], _depth + 1);
                        }
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
                    if (options.arrays || options.defaults)
                        object.messages = [];
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
                        object.session = $root.skynet.agent.v1.SessionSummary.toObject(message.session, options, _depth + 1);
                    if (message.messages && message.messages.length) {
                        object.messages = $Array(message.messages.length);
                        for (let j = 0; j < message.messages.length; ++j)
                            object.messages[j] = $root.skynet.agent.v1.ChatMessage.toObject(message.messages[j], options, _depth + 1);
                    }
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

            v1.SessionSelectReq = (function() {

                /**
                 * Properties of a SessionSelectReq.
                 * @typedef {Object} skynet.agent.v1.SessionSelectReq.$Properties
                 * @property {string|null} [sessionId] SessionSelectReq sessionId
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionSelectReq.
                 * @memberof skynet.agent.v1
                 * @interface ISessionSelectReq
                 * @augments skynet.agent.v1.SessionSelectReq.$Properties
                 * @deprecated Use skynet.agent.v1.SessionSelectReq.$Properties instead.
                 */

                /**
                 * Shape of a SessionSelectReq.
                 * @typedef {skynet.agent.v1.SessionSelectReq.$Properties} skynet.agent.v1.SessionSelectReq.$Shape
                 */

                /**
                 * Constructs a new SessionSelectReq.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionSelectReq.
                 * @constructor
                 * @param {skynet.agent.v1.SessionSelectReq.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionSelectReq = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionSelectReq sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @instance
                 */
                SessionSelectReq.prototype.sessionId = "";

                /**
                 * Creates a new SessionSelectReq instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {skynet.agent.v1.SessionSelectReq.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionSelectReq} SessionSelectReq instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionSelectReq.$Shape): skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape;
                 *   (properties?: skynet.agent.v1.SessionSelectReq.$Properties): skynet.agent.v1.SessionSelectReq;
                 * }}
                 */
                SessionSelectReq.create = function(properties) {
                    return new SessionSelectReq(properties);
                };

                /**
                 * Encodes the specified SessionSelectReq message. Does not implicitly {@link skynet.agent.v1.SessionSelectReq.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {skynet.agent.v1.SessionSelectReq.$Properties} message SessionSelectReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSelectReq.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.sessionId);
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionSelectReq message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSelectReq.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {skynet.agent.v1.SessionSelectReq.$Properties} message SessionSelectReq message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSelectReq.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionSelectReq message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape} SessionSelectReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSelectReq.decode = function (reader, length, _end, _depth, _target) {
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
                    message = _target || new $root.skynet.agent.v1.SessionSelectReq();
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
                 * Decodes a SessionSelectReq message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape} SessionSelectReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSelectReq.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionSelectReq message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionSelectReq.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    return null;
                };

                /**
                 * Creates a SessionSelectReq message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionSelectReq} SessionSelectReq
                 */
                SessionSelectReq.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionSelectReq)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionSelectReq: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionSelectReq();
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    return message;
                };

                /**
                 * Creates a plain object from a SessionSelectReq message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @static
                 * @param {skynet.agent.v1.SessionSelectReq} message SessionSelectReq
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionSelectReq.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults)
                        object.sessionId = "";
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    return object;
                };

                /**
                 * Converts this SessionSelectReq to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionSelectReq
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionSelectReq.prototype.toJSON = function() {
                    return SessionSelectReq.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionSelectReq;
            })();

            v1.SessionSelectRes = (function() {

                /**
                 * Properties of a SessionSelectRes.
                 * @typedef {Object} skynet.agent.v1.SessionSelectRes.$Properties
                 * @property {number|null} [ret] SessionSelectRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] SessionSelectRes error
                 * @property {string|null} [sessionId] SessionSelectRes sessionId
                 * @property {Array.<skynet.agent.v1.ChatMessage.$Properties>|null} [messages] SessionSelectRes messages
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionSelectRes.
                 * @memberof skynet.agent.v1
                 * @interface ISessionSelectRes
                 * @augments skynet.agent.v1.SessionSelectRes.$Properties
                 * @deprecated Use skynet.agent.v1.SessionSelectRes.$Properties instead.
                 */

                /**
                 * Shape of a SessionSelectRes.
                 * @typedef {skynet.agent.v1.SessionSelectRes.$Properties} skynet.agent.v1.SessionSelectRes.$Shape
                 */

                /**
                 * Constructs a new SessionSelectRes.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionSelectRes.
                 * @constructor
                 * @param {skynet.agent.v1.SessionSelectRes.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionSelectRes = function (properties) {
                    this.messages = [];
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionSelectRes ret.
                 * @member {number} ret
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @instance
                 */
                SessionSelectRes.prototype.ret = 0;

                /**
                 * SessionSelectRes error.
                 * @member {skynet.agent.v1.ErrorInfo.$Properties|null|undefined} error
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @instance
                 */
                SessionSelectRes.prototype.error = null;

                /**
                 * SessionSelectRes sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @instance
                 */
                SessionSelectRes.prototype.sessionId = "";

                /**
                 * SessionSelectRes messages.
                 * @member {Array.<skynet.agent.v1.ChatMessage.$Properties>} messages
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @instance
                 */
                SessionSelectRes.prototype.messages = $util.emptyArray;

                /**
                 * Creates a new SessionSelectRes instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {skynet.agent.v1.SessionSelectRes.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionSelectRes} SessionSelectRes instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionSelectRes.$Shape): skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape;
                 *   (properties?: skynet.agent.v1.SessionSelectRes.$Properties): skynet.agent.v1.SessionSelectRes;
                 * }}
                 */
                SessionSelectRes.create = function(properties) {
                    return new SessionSelectRes(properties);
                };

                /**
                 * Encodes the specified SessionSelectRes message. Does not implicitly {@link skynet.agent.v1.SessionSelectRes.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {skynet.agent.v1.SessionSelectRes.$Properties} message SessionSelectRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSelectRes.encode = function (message, writer, _depth) {
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
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.sessionId);
                    if (message.messages != null && message.messages.length)
                        for (let i = 0; i < message.messages.length; ++i)
                            $root.skynet.agent.v1.ChatMessage.encode(message.messages[i], writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionSelectRes message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSelectRes.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {skynet.agent.v1.SessionSelectRes.$Properties} message SessionSelectRes message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSelectRes.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionSelectRes message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape} SessionSelectRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSelectRes.decode = function (reader, length, _end, _depth, _target) {
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
                    message = _target || new $root.skynet.agent.v1.SessionSelectRes();
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
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
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
                 * Decodes a SessionSelectRes message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape} SessionSelectRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSelectRes.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionSelectRes message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionSelectRes.verify = function (message, _depth) {
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
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.messages != null && $Object.hasOwnProperty.call(message, "messages")) {
                        if (!$Array.isArray(message.messages))
                            return "messages: array expected";
                        for (let i = 0; i < message.messages.length; ++i) {
                            let error = $root.skynet.agent.v1.ChatMessage.verify(message.messages[i], _depth + 1);
                            if (error)
                                return "messages." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a SessionSelectRes message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionSelectRes} SessionSelectRes
                 */
                SessionSelectRes.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionSelectRes)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionSelectRes: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionSelectRes();
                    if (object.ret != null)
                        if ($Number(object.ret) !== 0)
                            message.ret = object.ret | 0;
                    if (object.error != null) {
                        if (!$util.isObject(object.error))
                            throw $TypeError(".skynet.agent.v1.SessionSelectRes.error: object expected");
                        message.error = $root.skynet.agent.v1.ErrorInfo.fromObject(object.error, _depth + 1);
                    }
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.messages) {
                        if (!$Array.isArray(object.messages))
                            throw $TypeError(".skynet.agent.v1.SessionSelectRes.messages: array expected");
                        message.messages = $Array(object.messages.length);
                        for (let i = 0; i < object.messages.length; ++i) {
                            if (!$util.isObject(object.messages[i]))
                                throw $TypeError(".skynet.agent.v1.SessionSelectRes.messages: object expected");
                            message.messages[i] = $root.skynet.agent.v1.ChatMessage.fromObject(object.messages[i], _depth + 1);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a SessionSelectRes message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @static
                 * @param {skynet.agent.v1.SessionSelectRes} message SessionSelectRes
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionSelectRes.toObject = function (message, options, _depth) {
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
                        object.ret = 0;
                        object.error = null;
                        object.sessionId = "";
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.messages && message.messages.length) {
                        object.messages = $Array(message.messages.length);
                        for (let j = 0; j < message.messages.length; ++j)
                            object.messages[j] = $root.skynet.agent.v1.ChatMessage.toObject(message.messages[j], options, _depth + 1);
                    }
                    return object;
                };

                /**
                 * Converts this SessionSelectRes to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionSelectRes
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionSelectRes.prototype.toJSON = function() {
                    return SessionSelectRes.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionSelectRes;
            })();

            v1.MessageSendReq = (function() {

                /**
                 * Properties of a MessageSendReq.
                 * @typedef {Object} skynet.agent.v1.MessageSendReq.$Properties
                 * @property {string|null} [sessionId] MessageSendReq sessionId
                 * @property {string|null} [text] MessageSendReq text
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
                    }
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                        object.text = message.text;
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

            /**
             * MessageStatus enum.
             * @name skynet.agent.v1.MessageStatus
             * @enum {number}
             * @property {number} MESSAGE_STATUS_UNSPECIFIED=0 MESSAGE_STATUS_UNSPECIFIED value
             * @property {number} MESSAGE_STATUS_STREAMING=1 MESSAGE_STATUS_STREAMING value
             * @property {number} MESSAGE_STATUS_COMPLETED=2 MESSAGE_STATUS_COMPLETED value
             * @property {number} MESSAGE_STATUS_CANCELLED=3 MESSAGE_STATUS_CANCELLED value
             */
            v1.MessageStatus = (function() {
                const valuesById = $Object.create(null), values = $Object.create(valuesById);
                values[valuesById[0] = "MESSAGE_STATUS_UNSPECIFIED"] = 0;
                values[valuesById[1] = "MESSAGE_STATUS_STREAMING"] = 1;
                values[valuesById[2] = "MESSAGE_STATUS_COMPLETED"] = 2;
                values[valuesById[3] = "MESSAGE_STATUS_CANCELLED"] = 3;
                return values;
            })();

            v1.MessageSendRes = (function() {

                /**
                 * Properties of a MessageSendRes.
                 * @typedef {Object} skynet.agent.v1.MessageSendRes.$Properties
                 * @property {number|null} [ret] MessageSendRes ret
                 * @property {skynet.agent.v1.ErrorInfo.$Properties|null} [error] MessageSendRes error
                 * @property {string|null} [sessionId] MessageSendRes sessionId
                 * @property {string|null} [delta] MessageSendRes delta
                 * @property {skynet.agent.v1.ChatMessage.$Properties|null} [message] MessageSendRes message
                 * @property {skynet.agent.v1.MessageStatus|null} [status] MessageSendRes status
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
                 * MessageSendRes sessionId.
                 * @member {string} sessionId
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 */
                MessageSendRes.prototype.sessionId = "";

                /**
                 * MessageSendRes delta.
                 * @member {string} delta
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 */
                MessageSendRes.prototype.delta = "";

                /**
                 * MessageSendRes message.
                 * @member {skynet.agent.v1.ChatMessage.$Properties|null|undefined} message
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 */
                MessageSendRes.prototype.message = null;

                /**
                 * MessageSendRes status.
                 * @member {skynet.agent.v1.MessageStatus} status
                 * @memberof skynet.agent.v1.MessageSendRes
                 * @instance
                 */
                MessageSendRes.prototype.status = 0;

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
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.sessionId);
                    if (message.delta != null && $Object.hasOwnProperty.call(message, "delta") && message.delta !== "")
                        writer.uint32(/* id 5, wireType 2 =*/42).string(message.delta);
                    if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                        $root.skynet.agent.v1.ChatMessage.encode(message.message, writer.uint32(/* id 6, wireType 2 =*/50).fork(), _depth + 1).ldelim();
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status") && message.status !== 0)
                        writer.uint32(/* id 7, wireType 0 =*/56).int32(message.status);
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
                                if ((value = reader.stringVerify()).length)
                                    message.sessionId = value;
                                else
                                    delete message.sessionId;
                                continue;
                            }
                        case 5: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.delta = value;
                                else
                                    delete message.delta;
                                continue;
                            }
                        case 6: {
                                if (wireType !== 2)
                                    break;
                                message.message = $root.skynet.agent.v1.ChatMessage.decode(reader, reader.size(), $undefined, _depth + 1, message.message);
                                continue;
                            }
                        case 7: {
                                if (wireType !== 0)
                                    break;
                                if (value = reader.int32())
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
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        if (!$util.isString(message.sessionId))
                            return "sessionId: string expected";
                    if (message.delta != null && $Object.hasOwnProperty.call(message, "delta"))
                        if (!$util.isString(message.delta))
                            return "delta: string expected";
                    if (message.message != null && $Object.hasOwnProperty.call(message, "message")) {
                        let error = $root.skynet.agent.v1.ChatMessage.verify(message.message, _depth + 1);
                        if (error)
                            return "message." + error;
                    }
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        if (typeof message.status !== "number" || (message.status | 0) !== message.status)
                            return "status: enum value expected";
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
                    if (object.sessionId != null)
                        if (typeof object.sessionId !== "string" || object.sessionId.length)
                            message.sessionId = $String(object.sessionId);
                    if (object.delta != null)
                        if (typeof object.delta !== "string" || object.delta.length)
                            message.delta = $String(object.delta);
                    if (object.message != null) {
                        if (!$util.isObject(object.message))
                            throw $TypeError(".skynet.agent.v1.MessageSendRes.message: object expected");
                        message.message = $root.skynet.agent.v1.ChatMessage.fromObject(object.message, _depth + 1);
                    }
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
                        default:
                            if (typeof object.status === "number" && (object.status | 0) === object.status)
                                message.status = object.status;
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
                        object.sessionId = "";
                        object.delta = "";
                        object.message = null;
                        object.status = options.enums === $String ? "MESSAGE_STATUS_UNSPECIFIED" : 0;
                    }
                    if (message.ret != null && $Object.hasOwnProperty.call(message, "ret"))
                        object.ret = message.ret;
                    if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                        object.error = $root.skynet.agent.v1.ErrorInfo.toObject(message.error, options, _depth + 1);
                    if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                        object.sessionId = message.sessionId;
                    if (message.delta != null && $Object.hasOwnProperty.call(message, "delta"))
                        object.delta = message.delta;
                    if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                        object.message = $root.skynet.agent.v1.ChatMessage.toObject(message.message, options, _depth + 1);
                    if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                        object.status = options.enums === $String ? $root.skynet.agent.v1.MessageStatus[message.status] === $undefined ? message.status : $root.skynet.agent.v1.MessageStatus[message.status] : message.status;
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
                 * @property {number|null} [targetMessageId] MessageCancelReq targetMessageId
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
                 * MessageCancelReq targetMessageId.
                 * @member {number} targetMessageId
                 * @memberof skynet.agent.v1.MessageCancelReq
                 * @instance
                 */
                MessageCancelReq.prototype.targetMessageId = 0;

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
                    if (message.targetMessageId != null && $Object.hasOwnProperty.call(message, "targetMessageId") && message.targetMessageId !== 0)
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.targetMessageId);
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
                                if (wireType !== 0)
                                    break;
                                if (value = reader.uint32())
                                    message.targetMessageId = value;
                                else
                                    delete message.targetMessageId;
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
                    if (message.targetMessageId != null && $Object.hasOwnProperty.call(message, "targetMessageId"))
                        if (!$util.isInteger(message.targetMessageId))
                            return "targetMessageId: integer expected";
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
                    if (object.targetMessageId != null)
                        if ($Number(object.targetMessageId) !== 0)
                            message.targetMessageId = object.targetMessageId >>> 0;
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
                    if (options.defaults)
                        object.targetMessageId = 0;
                    if (message.targetMessageId != null && $Object.hasOwnProperty.call(message, "targetMessageId"))
                        object.targetMessageId = message.targetMessageId;
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

            v1.SessionSummary = (function() {

                /**
                 * Properties of a SessionSummary.
                 * @typedef {Object} skynet.agent.v1.SessionSummary.$Properties
                 * @property {string|null} [id] SessionSummary id
                 * @property {string|null} [title] SessionSummary title
                 * @property {number|null} [updatedAt] SessionSummary updatedAt
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionSummary.
                 * @memberof skynet.agent.v1
                 * @interface ISessionSummary
                 * @augments skynet.agent.v1.SessionSummary.$Properties
                 * @deprecated Use skynet.agent.v1.SessionSummary.$Properties instead.
                 */

                /**
                 * Shape of a SessionSummary.
                 * @typedef {skynet.agent.v1.SessionSummary.$Properties} skynet.agent.v1.SessionSummary.$Shape
                 */

                /**
                 * Constructs a new SessionSummary.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionSummary.
                 * @constructor
                 * @param {skynet.agent.v1.SessionSummary.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionSummary = function (properties) {
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionSummary id.
                 * @member {string} id
                 * @memberof skynet.agent.v1.SessionSummary
                 * @instance
                 */
                SessionSummary.prototype.id = "";

                /**
                 * SessionSummary title.
                 * @member {string} title
                 * @memberof skynet.agent.v1.SessionSummary
                 * @instance
                 */
                SessionSummary.prototype.title = "";

                /**
                 * SessionSummary updatedAt.
                 * @member {number} updatedAt
                 * @memberof skynet.agent.v1.SessionSummary
                 * @instance
                 */
                SessionSummary.prototype.updatedAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * Creates a new SessionSummary instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {skynet.agent.v1.SessionSummary.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionSummary} SessionSummary instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionSummary.$Shape): skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape;
                 *   (properties?: skynet.agent.v1.SessionSummary.$Properties): skynet.agent.v1.SessionSummary;
                 * }}
                 */
                SessionSummary.create = function(properties) {
                    return new SessionSummary(properties);
                };

                /**
                 * Encodes the specified SessionSummary message. Does not implicitly {@link skynet.agent.v1.SessionSummary.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {skynet.agent.v1.SessionSummary.$Properties} message SessionSummary message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSummary.encode = function (message, writer, _depth) {
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
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionSummary message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSummary.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {skynet.agent.v1.SessionSummary.$Properties} message SessionSummary message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSummary.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionSummary message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape} SessionSummary
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSummary.decode = function (reader, length, _end, _depth, _target) {
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
                    message = _target || new $root.skynet.agent.v1.SessionSummary();
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
                 * Decodes a SessionSummary message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape} SessionSummary
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSummary.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionSummary message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionSummary.verify = function (message, _depth) {
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
                    return null;
                };

                /**
                 * Creates a SessionSummary message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionSummary} SessionSummary
                 */
                SessionSummary.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionSummary)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionSummary: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionSummary();
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
                    return message;
                };

                /**
                 * Creates a plain object from a SessionSummary message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionSummary
                 * @static
                 * @param {skynet.agent.v1.SessionSummary} message SessionSummary
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionSummary.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.defaults) {
                        object.id = "";
                        object.title = "";
                        if ($util.Long) {
                            let long = new $util.Long(0, 0, true);
                            object.updatedAt = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                        } else
                            object.updatedAt = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
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
                    return object;
                };

                /**
                 * Converts this SessionSummary to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionSummary
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionSummary.prototype.toJSON = function() {
                    return SessionSummary.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionSummary;
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

            v1.ChatMessage = (function() {

                /**
                 * Properties of a ChatMessage.
                 * @typedef {Object} skynet.agent.v1.ChatMessage.$Properties
                 * @property {string|null} [id] ChatMessage id
                 * @property {skynet.agent.v1.MessageRole|null} [role] ChatMessage role
                 * @property {string|null} [content] ChatMessage content
                 * @property {number|null} [createdAt] ChatMessage createdAt
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
                    if (options.defaults) {
                        object.id = "";
                        object.role = options.enums === $String ? "MESSAGE_ROLE_UNSPECIFIED" : 0;
                        object.content = "";
                        if ($util.Long) {
                            let long = new $util.Long(0, 0, true);
                            object.createdAt = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                        } else
                            object.createdAt = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
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

            v1.SessionSnapshot = (function() {

                /**
                 * Properties of a SessionSnapshot.
                 * @typedef {Object} skynet.agent.v1.SessionSnapshot.$Properties
                 * @property {Array.<skynet.agent.v1.SessionSummary.$Properties>|null} [sessions] SessionSnapshot sessions
                 * @property {string|null} [activeSessionId] SessionSnapshot activeSessionId
                 * @property {Array.<skynet.agent.v1.ChatMessage.$Properties>|null} [messages] SessionSnapshot messages
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */

                /**
                 * Properties of a SessionSnapshot.
                 * @memberof skynet.agent.v1
                 * @interface ISessionSnapshot
                 * @augments skynet.agent.v1.SessionSnapshot.$Properties
                 * @deprecated Use skynet.agent.v1.SessionSnapshot.$Properties instead.
                 */

                /**
                 * Shape of a SessionSnapshot.
                 * @typedef {skynet.agent.v1.SessionSnapshot.$Properties} skynet.agent.v1.SessionSnapshot.$Shape
                 */

                /**
                 * Constructs a new SessionSnapshot.
                 * @memberof skynet.agent.v1
                 * @classdesc Represents a SessionSnapshot.
                 * @constructor
                 * @param {skynet.agent.v1.SessionSnapshot.$Properties=} [properties] Properties to set
                 * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
                 */
                const SessionSnapshot = function (properties) {
                    this.sessions = [];
                    this.messages = [];
                    if (properties)
                        for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null && keys[i] !== "__proto__")
                                this[keys[i]] = properties[keys[i]];
                };

                /**
                 * SessionSnapshot sessions.
                 * @member {Array.<skynet.agent.v1.SessionSummary.$Properties>} sessions
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @instance
                 */
                SessionSnapshot.prototype.sessions = $util.emptyArray;

                /**
                 * SessionSnapshot activeSessionId.
                 * @member {string} activeSessionId
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @instance
                 */
                SessionSnapshot.prototype.activeSessionId = "";

                /**
                 * SessionSnapshot messages.
                 * @member {Array.<skynet.agent.v1.ChatMessage.$Properties>} messages
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @instance
                 */
                SessionSnapshot.prototype.messages = $util.emptyArray;

                /**
                 * Creates a new SessionSnapshot instance using the specified properties.
                 * @function create
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {skynet.agent.v1.SessionSnapshot.$Properties=} [properties] Properties to set
                 * @returns {skynet.agent.v1.SessionSnapshot} SessionSnapshot instance
                 * @type {{
                 *   (properties: skynet.agent.v1.SessionSnapshot.$Shape): skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape;
                 *   (properties?: skynet.agent.v1.SessionSnapshot.$Properties): skynet.agent.v1.SessionSnapshot;
                 * }}
                 */
                SessionSnapshot.create = function(properties) {
                    return new SessionSnapshot(properties);
                };

                /**
                 * Encodes the specified SessionSnapshot message. Does not implicitly {@link skynet.agent.v1.SessionSnapshot.verify|verify} messages.
                 * @function encode
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {skynet.agent.v1.SessionSnapshot.$Properties} message SessionSnapshot message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSnapshot.encode = function (message, writer, _depth) {
                    if (!writer)
                        writer = $Writer.create();
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    if (message.sessions != null && message.sessions.length)
                        for (let i = 0; i < message.sessions.length; ++i)
                            $root.skynet.agent.v1.SessionSummary.encode(message.sessions[i], writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
                    if (message.activeSessionId != null && $Object.hasOwnProperty.call(message, "activeSessionId") && message.activeSessionId !== "")
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.activeSessionId);
                    if (message.messages != null && message.messages.length)
                        for (let i = 0; i < message.messages.length; ++i)
                            $root.skynet.agent.v1.ChatMessage.encode(message.messages[i], writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
                    if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                        for (let i = 0; i < message.$unknowns.length; ++i)
                            writer.raw(message.$unknowns[i]);
                    return writer;
                };

                /**
                 * Encodes the specified SessionSnapshot message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSnapshot.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {skynet.agent.v1.SessionSnapshot.$Properties} message SessionSnapshot message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SessionSnapshot.encodeDelimited = function(message, writer) {
                    return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
                };

                /**
                 * Decodes a SessionSnapshot message from the specified reader or buffer.
                 * @function decode
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape} SessionSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSnapshot.decode = function (reader, length, _end, _depth, _target) {
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
                    message = _target || new $root.skynet.agent.v1.SessionSnapshot();
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
                                if (!(message.sessions && message.sessions.length))
                                    message.sessions = [];
                                message.sessions.push($root.skynet.agent.v1.SessionSummary.decode(reader, reader.size(), $undefined, _depth + 1));
                                continue;
                            }
                        case 2: {
                                if (wireType !== 2)
                                    break;
                                if ((value = reader.stringVerify()).length)
                                    message.activeSessionId = value;
                                else
                                    delete message.activeSessionId;
                                continue;
                            }
                        case 3: {
                                if (wireType !== 2)
                                    break;
                                if (!(message.messages && message.messages.length))
                                    message.messages = [];
                                message.messages.push($root.skynet.agent.v1.ChatMessage.decode(reader, reader.size(), $undefined, _depth + 1));
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
                 * Decodes a SessionSnapshot message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape} SessionSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SessionSnapshot.decodeDelimited = function(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.size());
                };

                /**
                 * Verifies a SessionSnapshot message.
                 * @function verify
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SessionSnapshot.verify = function (message, _depth) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        return "max depth exceeded";
                    if (message.sessions != null && $Object.hasOwnProperty.call(message, "sessions")) {
                        if (!$Array.isArray(message.sessions))
                            return "sessions: array expected";
                        for (let i = 0; i < message.sessions.length; ++i) {
                            let error = $root.skynet.agent.v1.SessionSummary.verify(message.sessions[i], _depth + 1);
                            if (error)
                                return "sessions." + error;
                        }
                    }
                    if (message.activeSessionId != null && $Object.hasOwnProperty.call(message, "activeSessionId"))
                        if (!$util.isString(message.activeSessionId))
                            return "activeSessionId: string expected";
                    if (message.messages != null && $Object.hasOwnProperty.call(message, "messages")) {
                        if (!$Array.isArray(message.messages))
                            return "messages: array expected";
                        for (let i = 0; i < message.messages.length; ++i) {
                            let error = $root.skynet.agent.v1.ChatMessage.verify(message.messages[i], _depth + 1);
                            if (error)
                                return "messages." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Creates a SessionSnapshot message from a plain object. Also converts values to their respective internal types.
                 * @function fromObject
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {Object.<string,*>} object Plain object
                 * @returns {skynet.agent.v1.SessionSnapshot} SessionSnapshot
                 */
                SessionSnapshot.fromObject = function (object, _depth) {
                    if (object instanceof $root.skynet.agent.v1.SessionSnapshot)
                        return object;
                    if (!$util.isObject(object))
                        throw $TypeError(".skynet.agent.v1.SessionSnapshot: object expected");
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let message = new $root.skynet.agent.v1.SessionSnapshot();
                    if (object.sessions) {
                        if (!$Array.isArray(object.sessions))
                            throw $TypeError(".skynet.agent.v1.SessionSnapshot.sessions: array expected");
                        message.sessions = $Array(object.sessions.length);
                        for (let i = 0; i < object.sessions.length; ++i) {
                            if (!$util.isObject(object.sessions[i]))
                                throw $TypeError(".skynet.agent.v1.SessionSnapshot.sessions: object expected");
                            message.sessions[i] = $root.skynet.agent.v1.SessionSummary.fromObject(object.sessions[i], _depth + 1);
                        }
                    }
                    if (object.activeSessionId != null)
                        if (typeof object.activeSessionId !== "string" || object.activeSessionId.length)
                            message.activeSessionId = $String(object.activeSessionId);
                    if (object.messages) {
                        if (!$Array.isArray(object.messages))
                            throw $TypeError(".skynet.agent.v1.SessionSnapshot.messages: array expected");
                        message.messages = $Array(object.messages.length);
                        for (let i = 0; i < object.messages.length; ++i) {
                            if (!$util.isObject(object.messages[i]))
                                throw $TypeError(".skynet.agent.v1.SessionSnapshot.messages: object expected");
                            message.messages[i] = $root.skynet.agent.v1.ChatMessage.fromObject(object.messages[i], _depth + 1);
                        }
                    }
                    return message;
                };

                /**
                 * Creates a plain object from a SessionSnapshot message. Also converts values to other types if specified.
                 * @function toObject
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @static
                 * @param {skynet.agent.v1.SessionSnapshot} message SessionSnapshot
                 * @param {$protobuf.IConversionOptions} [options] Conversion options
                 * @returns {Object.<string,*>} Plain object
                 */
                SessionSnapshot.toObject = function (message, options, _depth) {
                    if (!options)
                        options = {};
                    if (_depth === $undefined)
                        _depth = 0;
                    if (_depth > $util.recursionLimit)
                        throw $Error("max depth exceeded");
                    let object = {};
                    if (options.arrays || options.defaults) {
                        object.sessions = [];
                        object.messages = [];
                    }
                    if (options.defaults)
                        object.activeSessionId = "";
                    if (message.sessions && message.sessions.length) {
                        object.sessions = $Array(message.sessions.length);
                        for (let j = 0; j < message.sessions.length; ++j)
                            object.sessions[j] = $root.skynet.agent.v1.SessionSummary.toObject(message.sessions[j], options, _depth + 1);
                    }
                    if (message.activeSessionId != null && $Object.hasOwnProperty.call(message, "activeSessionId"))
                        object.activeSessionId = message.activeSessionId;
                    if (message.messages && message.messages.length) {
                        object.messages = $Array(message.messages.length);
                        for (let j = 0; j < message.messages.length; ++j)
                            object.messages[j] = $root.skynet.agent.v1.ChatMessage.toObject(message.messages[j], options, _depth + 1);
                    }
                    return object;
                };

                /**
                 * Converts this SessionSnapshot to JSON.
                 * @function toJSON
                 * @memberof skynet.agent.v1.SessionSnapshot
                 * @instance
                 * @returns {Object.<string,*>} JSON object
                 */
                SessionSnapshot.prototype.toJSON = function() {
                    return SessionSnapshot.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SessionSnapshot;
            })();

            v1.LoginReq = (function() {

                /**
                 * Properties of a LoginReq.
                 * @typedef {Object} skynet.agent.v1.LoginReq.$Properties
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
                    message = _target || new $root.skynet.agent.v1.LoginReq();
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
                    return new $root.skynet.agent.v1.LoginReq();
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
                LoginReq.toObject = function () {
                    return {};
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
                 * @property {skynet.agent.v1.SessionSnapshot.$Properties|null} [snapshot] LoginRes snapshot
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
                 * @member {skynet.agent.v1.SessionSnapshot.$Properties|null|undefined} snapshot
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
                        $root.skynet.agent.v1.SessionSnapshot.encode(message.snapshot, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
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
                                message.snapshot = $root.skynet.agent.v1.SessionSnapshot.decode(reader, reader.size(), $undefined, _depth + 1, message.snapshot);
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
                        let error = $root.skynet.agent.v1.SessionSnapshot.verify(message.snapshot, _depth + 1);
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
                        message.snapshot = $root.skynet.agent.v1.SessionSnapshot.fromObject(object.snapshot, _depth + 1);
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
                        object.snapshot = $root.skynet.agent.v1.SessionSnapshot.toObject(message.snapshot, options, _depth + 1);
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

            return v1;
        })();

        return agent;
    })();

    return skynet;
})();

export {
  $root as default
};
