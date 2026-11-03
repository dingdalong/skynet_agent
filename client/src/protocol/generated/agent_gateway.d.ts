import * as $protobuf from "protobufjs/minimal.js";
import Long = require("long");

/** Namespace skynet. */
export namespace skynet {

    /** Namespace agent. */
    namespace agent {

        /** Namespace v1. */
        namespace v1 {

            /**
             * Properties of a SessionCreateReq.
             * @deprecated Use skynet.agent.v1.SessionCreateReq.$Properties instead.
             */
            interface ISessionCreateReq extends skynet.agent.v1.SessionCreateReq.$Properties {
            }

            /** Represents a SessionCreateReq. */
            class SessionCreateReq {

                /**
                 * Constructs a new SessionCreateReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionCreateReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /**
                 * Creates a new SessionCreateReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionCreateReq instance
                 */
                static create(properties: skynet.agent.v1.SessionCreateReq.$Shape): skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape;
                static create(properties?: skynet.agent.v1.SessionCreateReq.$Properties): skynet.agent.v1.SessionCreateReq;

                /**
                 * Encodes the specified SessionCreateReq message. Does not implicitly {@link skynet.agent.v1.SessionCreateReq.verify|verify} messages.
                 * @param message SessionCreateReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionCreateReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionCreateReq message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionCreateReq.verify|verify} messages.
                 * @param message SessionCreateReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionCreateReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionCreateReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape} SessionCreateReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape;

                /**
                 * Decodes a SessionCreateReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape} SessionCreateReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionCreateReq & skynet.agent.v1.SessionCreateReq.$Shape;

                /**
                 * Verifies a SessionCreateReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionCreateReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionCreateReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionCreateReq;

                /**
                 * Creates a plain object from a SessionCreateReq message. Also converts values to other types if specified.
                 * @param message SessionCreateReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionCreateReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionCreateReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionCreateReq {

                /** Properties of a SessionCreateReq. */
                interface $Properties {

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionCreateReq. */
                type $Shape = skynet.agent.v1.SessionCreateReq.$Properties;
            }

            /**
             * Properties of a SessionCreateRes.
             * @deprecated Use skynet.agent.v1.SessionCreateRes.$Properties instead.
             */
            interface ISessionCreateRes extends skynet.agent.v1.SessionCreateRes.$Properties {
            }

            /** Represents a SessionCreateRes. */
            class SessionCreateRes {

                /**
                 * Constructs a new SessionCreateRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionCreateRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionCreateRes ret. */
                ret: number;

                /** SessionCreateRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** SessionCreateRes session. */
                session?: (skynet.agent.v1.SessionSummary.$Properties|null);

                /** SessionCreateRes messages. */
                messages: skynet.agent.v1.ChatMessage.$Properties[];

                /**
                 * Creates a new SessionCreateRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionCreateRes instance
                 */
                static create(properties: skynet.agent.v1.SessionCreateRes.$Shape): skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape;
                static create(properties?: skynet.agent.v1.SessionCreateRes.$Properties): skynet.agent.v1.SessionCreateRes;

                /**
                 * Encodes the specified SessionCreateRes message. Does not implicitly {@link skynet.agent.v1.SessionCreateRes.verify|verify} messages.
                 * @param message SessionCreateRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionCreateRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionCreateRes message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionCreateRes.verify|verify} messages.
                 * @param message SessionCreateRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionCreateRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionCreateRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape} SessionCreateRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape;

                /**
                 * Decodes a SessionCreateRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape} SessionCreateRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionCreateRes & skynet.agent.v1.SessionCreateRes.$Shape;

                /**
                 * Verifies a SessionCreateRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionCreateRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionCreateRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionCreateRes;

                /**
                 * Creates a plain object from a SessionCreateRes message. Also converts values to other types if specified.
                 * @param message SessionCreateRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionCreateRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionCreateRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionCreateRes {

                /** Properties of a SessionCreateRes. */
                interface $Properties {

                    /** SessionCreateRes ret */
                    ret?: (number|null);

                    /** SessionCreateRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** SessionCreateRes session */
                    session?: (skynet.agent.v1.SessionSummary.$Properties|null);

                    /** SessionCreateRes messages */
                    messages?: (skynet.agent.v1.ChatMessage.$Properties[]|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionCreateRes. */
                type $Shape = skynet.agent.v1.SessionCreateRes.$Properties;
            }

            /**
             * Properties of a SessionSelectReq.
             * @deprecated Use skynet.agent.v1.SessionSelectReq.$Properties instead.
             */
            interface ISessionSelectReq extends skynet.agent.v1.SessionSelectReq.$Properties {
            }

            /** Represents a SessionSelectReq. */
            class SessionSelectReq {

                /**
                 * Constructs a new SessionSelectReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionSelectReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionSelectReq sessionId. */
                sessionId: string;

                /**
                 * Creates a new SessionSelectReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionSelectReq instance
                 */
                static create(properties: skynet.agent.v1.SessionSelectReq.$Shape): skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape;
                static create(properties?: skynet.agent.v1.SessionSelectReq.$Properties): skynet.agent.v1.SessionSelectReq;

                /**
                 * Encodes the specified SessionSelectReq message. Does not implicitly {@link skynet.agent.v1.SessionSelectReq.verify|verify} messages.
                 * @param message SessionSelectReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionSelectReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionSelectReq message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSelectReq.verify|verify} messages.
                 * @param message SessionSelectReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionSelectReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionSelectReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape} SessionSelectReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape;

                /**
                 * Decodes a SessionSelectReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape} SessionSelectReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionSelectReq & skynet.agent.v1.SessionSelectReq.$Shape;

                /**
                 * Verifies a SessionSelectReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionSelectReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionSelectReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionSelectReq;

                /**
                 * Creates a plain object from a SessionSelectReq message. Also converts values to other types if specified.
                 * @param message SessionSelectReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionSelectReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionSelectReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionSelectReq {

                /** Properties of a SessionSelectReq. */
                interface $Properties {

                    /** SessionSelectReq sessionId */
                    sessionId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionSelectReq. */
                type $Shape = skynet.agent.v1.SessionSelectReq.$Properties;
            }

            /**
             * Properties of a SessionSelectRes.
             * @deprecated Use skynet.agent.v1.SessionSelectRes.$Properties instead.
             */
            interface ISessionSelectRes extends skynet.agent.v1.SessionSelectRes.$Properties {
            }

            /** Represents a SessionSelectRes. */
            class SessionSelectRes {

                /**
                 * Constructs a new SessionSelectRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionSelectRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionSelectRes ret. */
                ret: number;

                /** SessionSelectRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** SessionSelectRes sessionId. */
                sessionId: string;

                /** SessionSelectRes messages. */
                messages: skynet.agent.v1.ChatMessage.$Properties[];

                /**
                 * Creates a new SessionSelectRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionSelectRes instance
                 */
                static create(properties: skynet.agent.v1.SessionSelectRes.$Shape): skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape;
                static create(properties?: skynet.agent.v1.SessionSelectRes.$Properties): skynet.agent.v1.SessionSelectRes;

                /**
                 * Encodes the specified SessionSelectRes message. Does not implicitly {@link skynet.agent.v1.SessionSelectRes.verify|verify} messages.
                 * @param message SessionSelectRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionSelectRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionSelectRes message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSelectRes.verify|verify} messages.
                 * @param message SessionSelectRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionSelectRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionSelectRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape} SessionSelectRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape;

                /**
                 * Decodes a SessionSelectRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape} SessionSelectRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionSelectRes & skynet.agent.v1.SessionSelectRes.$Shape;

                /**
                 * Verifies a SessionSelectRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionSelectRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionSelectRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionSelectRes;

                /**
                 * Creates a plain object from a SessionSelectRes message. Also converts values to other types if specified.
                 * @param message SessionSelectRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionSelectRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionSelectRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionSelectRes {

                /** Properties of a SessionSelectRes. */
                interface $Properties {

                    /** SessionSelectRes ret */
                    ret?: (number|null);

                    /** SessionSelectRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** SessionSelectRes sessionId */
                    sessionId?: (string|null);

                    /** SessionSelectRes messages */
                    messages?: (skynet.agent.v1.ChatMessage.$Properties[]|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionSelectRes. */
                type $Shape = skynet.agent.v1.SessionSelectRes.$Properties;
            }

            /**
             * Properties of a MessageSendReq.
             * @deprecated Use skynet.agent.v1.MessageSendReq.$Properties instead.
             */
            interface IMessageSendReq extends skynet.agent.v1.MessageSendReq.$Properties {
            }

            /** Represents a MessageSendReq. */
            class MessageSendReq {

                /**
                 * Constructs a new MessageSendReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.MessageSendReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** MessageSendReq sessionId. */
                sessionId: string;

                /** MessageSendReq text. */
                text: string;

                /**
                 * Creates a new MessageSendReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns MessageSendReq instance
                 */
                static create(properties: skynet.agent.v1.MessageSendReq.$Shape): skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape;
                static create(properties?: skynet.agent.v1.MessageSendReq.$Properties): skynet.agent.v1.MessageSendReq;

                /**
                 * Encodes the specified MessageSendReq message. Does not implicitly {@link skynet.agent.v1.MessageSendReq.verify|verify} messages.
                 * @param message MessageSendReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.MessageSendReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified MessageSendReq message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageSendReq.verify|verify} messages.
                 * @param message MessageSendReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.MessageSendReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a MessageSendReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape} MessageSendReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape;

                /**
                 * Decodes a MessageSendReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape} MessageSendReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.MessageSendReq & skynet.agent.v1.MessageSendReq.$Shape;

                /**
                 * Verifies a MessageSendReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a MessageSendReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns MessageSendReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.MessageSendReq;

                /**
                 * Creates a plain object from a MessageSendReq message. Also converts values to other types if specified.
                 * @param message MessageSendReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.MessageSendReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this MessageSendReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace MessageSendReq {

                /** Properties of a MessageSendReq. */
                interface $Properties {

                    /** MessageSendReq sessionId */
                    sessionId?: (string|null);

                    /** MessageSendReq text */
                    text?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a MessageSendReq. */
                type $Shape = skynet.agent.v1.MessageSendReq.$Properties;
            }

            /** MessageStatus enum. */
            enum MessageStatus {

                /** MESSAGE_STATUS_UNSPECIFIED value */
                MESSAGE_STATUS_UNSPECIFIED = 0,

                /** MESSAGE_STATUS_STREAMING value */
                MESSAGE_STATUS_STREAMING = 1,

                /** MESSAGE_STATUS_COMPLETED value */
                MESSAGE_STATUS_COMPLETED = 2,

                /** MESSAGE_STATUS_CANCELLED value */
                MESSAGE_STATUS_CANCELLED = 3
            }

            /**
             * Properties of a MessageSendRes.
             * @deprecated Use skynet.agent.v1.MessageSendRes.$Properties instead.
             */
            interface IMessageSendRes extends skynet.agent.v1.MessageSendRes.$Properties {
            }

            /** Represents a MessageSendRes. */
            class MessageSendRes {

                /**
                 * Constructs a new MessageSendRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.MessageSendRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** MessageSendRes ret. */
                ret: number;

                /** MessageSendRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** MessageSendRes sessionId. */
                sessionId: string;

                /** MessageSendRes delta. */
                delta: string;

                /** MessageSendRes message. */
                message?: (skynet.agent.v1.ChatMessage.$Properties|null);

                /** MessageSendRes status. */
                status: skynet.agent.v1.MessageStatus;

                /**
                 * Creates a new MessageSendRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns MessageSendRes instance
                 */
                static create(properties: skynet.agent.v1.MessageSendRes.$Shape): skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape;
                static create(properties?: skynet.agent.v1.MessageSendRes.$Properties): skynet.agent.v1.MessageSendRes;

                /**
                 * Encodes the specified MessageSendRes message. Does not implicitly {@link skynet.agent.v1.MessageSendRes.verify|verify} messages.
                 * @param message MessageSendRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.MessageSendRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified MessageSendRes message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageSendRes.verify|verify} messages.
                 * @param message MessageSendRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.MessageSendRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a MessageSendRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape} MessageSendRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape;

                /**
                 * Decodes a MessageSendRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape} MessageSendRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.MessageSendRes & skynet.agent.v1.MessageSendRes.$Shape;

                /**
                 * Verifies a MessageSendRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a MessageSendRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns MessageSendRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.MessageSendRes;

                /**
                 * Creates a plain object from a MessageSendRes message. Also converts values to other types if specified.
                 * @param message MessageSendRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.MessageSendRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this MessageSendRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace MessageSendRes {

                /** Properties of a MessageSendRes. */
                interface $Properties {

                    /** MessageSendRes ret */
                    ret?: (number|null);

                    /** MessageSendRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** MessageSendRes sessionId */
                    sessionId?: (string|null);

                    /** MessageSendRes delta */
                    delta?: (string|null);

                    /** MessageSendRes message */
                    message?: (skynet.agent.v1.ChatMessage.$Properties|null);

                    /** MessageSendRes status */
                    status?: (skynet.agent.v1.MessageStatus|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a MessageSendRes. */
                type $Shape = skynet.agent.v1.MessageSendRes.$Properties;
            }

            /**
             * Properties of a MessageCancelReq.
             * @deprecated Use skynet.agent.v1.MessageCancelReq.$Properties instead.
             */
            interface IMessageCancelReq extends skynet.agent.v1.MessageCancelReq.$Properties {
            }

            /** Represents a MessageCancelReq. */
            class MessageCancelReq {

                /**
                 * Constructs a new MessageCancelReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.MessageCancelReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** MessageCancelReq targetMessageId. */
                targetMessageId: number;

                /**
                 * Creates a new MessageCancelReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns MessageCancelReq instance
                 */
                static create(properties: skynet.agent.v1.MessageCancelReq.$Shape): skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape;
                static create(properties?: skynet.agent.v1.MessageCancelReq.$Properties): skynet.agent.v1.MessageCancelReq;

                /**
                 * Encodes the specified MessageCancelReq message. Does not implicitly {@link skynet.agent.v1.MessageCancelReq.verify|verify} messages.
                 * @param message MessageCancelReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.MessageCancelReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified MessageCancelReq message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageCancelReq.verify|verify} messages.
                 * @param message MessageCancelReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.MessageCancelReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a MessageCancelReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape} MessageCancelReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape;

                /**
                 * Decodes a MessageCancelReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape} MessageCancelReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.MessageCancelReq & skynet.agent.v1.MessageCancelReq.$Shape;

                /**
                 * Verifies a MessageCancelReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a MessageCancelReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns MessageCancelReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.MessageCancelReq;

                /**
                 * Creates a plain object from a MessageCancelReq message. Also converts values to other types if specified.
                 * @param message MessageCancelReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.MessageCancelReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this MessageCancelReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace MessageCancelReq {

                /** Properties of a MessageCancelReq. */
                interface $Properties {

                    /** MessageCancelReq targetMessageId */
                    targetMessageId?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a MessageCancelReq. */
                type $Shape = skynet.agent.v1.MessageCancelReq.$Properties;
            }

            /**
             * Properties of a MessageCancelRes.
             * @deprecated Use skynet.agent.v1.MessageCancelRes.$Properties instead.
             */
            interface IMessageCancelRes extends skynet.agent.v1.MessageCancelRes.$Properties {
            }

            /** Represents a MessageCancelRes. */
            class MessageCancelRes {

                /**
                 * Constructs a new MessageCancelRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.MessageCancelRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** MessageCancelRes ret. */
                ret: number;

                /** MessageCancelRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /**
                 * Creates a new MessageCancelRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns MessageCancelRes instance
                 */
                static create(properties: skynet.agent.v1.MessageCancelRes.$Shape): skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape;
                static create(properties?: skynet.agent.v1.MessageCancelRes.$Properties): skynet.agent.v1.MessageCancelRes;

                /**
                 * Encodes the specified MessageCancelRes message. Does not implicitly {@link skynet.agent.v1.MessageCancelRes.verify|verify} messages.
                 * @param message MessageCancelRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.MessageCancelRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified MessageCancelRes message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageCancelRes.verify|verify} messages.
                 * @param message MessageCancelRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.MessageCancelRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a MessageCancelRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape} MessageCancelRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape;

                /**
                 * Decodes a MessageCancelRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape} MessageCancelRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.MessageCancelRes & skynet.agent.v1.MessageCancelRes.$Shape;

                /**
                 * Verifies a MessageCancelRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a MessageCancelRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns MessageCancelRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.MessageCancelRes;

                /**
                 * Creates a plain object from a MessageCancelRes message. Also converts values to other types if specified.
                 * @param message MessageCancelRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.MessageCancelRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this MessageCancelRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace MessageCancelRes {

                /** Properties of a MessageCancelRes. */
                interface $Properties {

                    /** MessageCancelRes ret */
                    ret?: (number|null);

                    /** MessageCancelRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a MessageCancelRes. */
                type $Shape = skynet.agent.v1.MessageCancelRes.$Properties;
            }

            /**
             * Properties of an ErrorInfo.
             * @deprecated Use skynet.agent.v1.ErrorInfo.$Properties instead.
             */
            interface IErrorInfo extends skynet.agent.v1.ErrorInfo.$Properties {
            }

            /** Represents an ErrorInfo. */
            class ErrorInfo {

                /**
                 * Constructs a new ErrorInfo.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ErrorInfo.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ErrorInfo message. */
                message: string;

                /** ErrorInfo retryable. */
                retryable: boolean;

                /**
                 * Creates a new ErrorInfo instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ErrorInfo instance
                 */
                static create(properties: skynet.agent.v1.ErrorInfo.$Shape): skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape;
                static create(properties?: skynet.agent.v1.ErrorInfo.$Properties): skynet.agent.v1.ErrorInfo;

                /**
                 * Encodes the specified ErrorInfo message. Does not implicitly {@link skynet.agent.v1.ErrorInfo.verify|verify} messages.
                 * @param message ErrorInfo message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ErrorInfo.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ErrorInfo message, length delimited. Does not implicitly {@link skynet.agent.v1.ErrorInfo.verify|verify} messages.
                 * @param message ErrorInfo message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ErrorInfo.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ErrorInfo message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape} ErrorInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape;

                /**
                 * Decodes an ErrorInfo message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape} ErrorInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ErrorInfo & skynet.agent.v1.ErrorInfo.$Shape;

                /**
                 * Verifies an ErrorInfo message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ErrorInfo message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ErrorInfo
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ErrorInfo;

                /**
                 * Creates a plain object from an ErrorInfo message. Also converts values to other types if specified.
                 * @param message ErrorInfo
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ErrorInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ErrorInfo to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ErrorInfo {

                /** Properties of an ErrorInfo. */
                interface $Properties {

                    /** ErrorInfo message */
                    message?: (string|null);

                    /** ErrorInfo retryable */
                    retryable?: (boolean|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of an ErrorInfo. */
                type $Shape = skynet.agent.v1.ErrorInfo.$Properties;
            }

            /**
             * Properties of a SessionSummary.
             * @deprecated Use skynet.agent.v1.SessionSummary.$Properties instead.
             */
            interface ISessionSummary extends skynet.agent.v1.SessionSummary.$Properties {
            }

            /** Represents a SessionSummary. */
            class SessionSummary {

                /**
                 * Constructs a new SessionSummary.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionSummary.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionSummary id. */
                id: string;

                /** SessionSummary title. */
                title: string;

                /** SessionSummary updatedAt. */
                updatedAt: number;

                /**
                 * Creates a new SessionSummary instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionSummary instance
                 */
                static create(properties: skynet.agent.v1.SessionSummary.$Shape): skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape;
                static create(properties?: skynet.agent.v1.SessionSummary.$Properties): skynet.agent.v1.SessionSummary;

                /**
                 * Encodes the specified SessionSummary message. Does not implicitly {@link skynet.agent.v1.SessionSummary.verify|verify} messages.
                 * @param message SessionSummary message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionSummary.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionSummary message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSummary.verify|verify} messages.
                 * @param message SessionSummary message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionSummary.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionSummary message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape} SessionSummary
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape;

                /**
                 * Decodes a SessionSummary message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape} SessionSummary
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionSummary & skynet.agent.v1.SessionSummary.$Shape;

                /**
                 * Verifies a SessionSummary message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionSummary message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionSummary
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionSummary;

                /**
                 * Creates a plain object from a SessionSummary message. Also converts values to other types if specified.
                 * @param message SessionSummary
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionSummary, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionSummary to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionSummary {

                /** Properties of a SessionSummary. */
                interface $Properties {

                    /** SessionSummary id */
                    id?: (string|null);

                    /** SessionSummary title */
                    title?: (string|null);

                    /** SessionSummary updatedAt */
                    updatedAt?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionSummary. */
                type $Shape = skynet.agent.v1.SessionSummary.$Properties;
            }

            /** MessageRole enum. */
            enum MessageRole {

                /** MESSAGE_ROLE_UNSPECIFIED value */
                MESSAGE_ROLE_UNSPECIFIED = 0,

                /** MESSAGE_ROLE_USER value */
                MESSAGE_ROLE_USER = 1,

                /** MESSAGE_ROLE_ASSISTANT value */
                MESSAGE_ROLE_ASSISTANT = 2
            }

            /**
             * Properties of a ChatMessage.
             * @deprecated Use skynet.agent.v1.ChatMessage.$Properties instead.
             */
            interface IChatMessage extends skynet.agent.v1.ChatMessage.$Properties {
            }

            /** Represents a ChatMessage. */
            class ChatMessage {

                /**
                 * Constructs a new ChatMessage.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ChatMessage.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ChatMessage id. */
                id: string;

                /** ChatMessage role. */
                role: skynet.agent.v1.MessageRole;

                /** ChatMessage content. */
                content: string;

                /** ChatMessage createdAt. */
                createdAt: number;

                /**
                 * Creates a new ChatMessage instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ChatMessage instance
                 */
                static create(properties: skynet.agent.v1.ChatMessage.$Shape): skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape;
                static create(properties?: skynet.agent.v1.ChatMessage.$Properties): skynet.agent.v1.ChatMessage;

                /**
                 * Encodes the specified ChatMessage message. Does not implicitly {@link skynet.agent.v1.ChatMessage.verify|verify} messages.
                 * @param message ChatMessage message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ChatMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ChatMessage message, length delimited. Does not implicitly {@link skynet.agent.v1.ChatMessage.verify|verify} messages.
                 * @param message ChatMessage message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ChatMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ChatMessage message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape} ChatMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape;

                /**
                 * Decodes a ChatMessage message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape} ChatMessage
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ChatMessage & skynet.agent.v1.ChatMessage.$Shape;

                /**
                 * Verifies a ChatMessage message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ChatMessage message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ChatMessage
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ChatMessage;

                /**
                 * Creates a plain object from a ChatMessage message. Also converts values to other types if specified.
                 * @param message ChatMessage
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ChatMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ChatMessage to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ChatMessage {

                /** Properties of a ChatMessage. */
                interface $Properties {

                    /** ChatMessage id */
                    id?: (string|null);

                    /** ChatMessage role */
                    role?: (skynet.agent.v1.MessageRole|null);

                    /** ChatMessage content */
                    content?: (string|null);

                    /** ChatMessage createdAt */
                    createdAt?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ChatMessage. */
                type $Shape = skynet.agent.v1.ChatMessage.$Properties;
            }

            /**
             * Properties of a SessionSnapshot.
             * @deprecated Use skynet.agent.v1.SessionSnapshot.$Properties instead.
             */
            interface ISessionSnapshot extends skynet.agent.v1.SessionSnapshot.$Properties {
            }

            /** Represents a SessionSnapshot. */
            class SessionSnapshot {

                /**
                 * Constructs a new SessionSnapshot.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionSnapshot.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionSnapshot sessions. */
                sessions: skynet.agent.v1.SessionSummary.$Properties[];

                /** SessionSnapshot activeSessionId. */
                activeSessionId: string;

                /** SessionSnapshot messages. */
                messages: skynet.agent.v1.ChatMessage.$Properties[];

                /**
                 * Creates a new SessionSnapshot instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionSnapshot instance
                 */
                static create(properties: skynet.agent.v1.SessionSnapshot.$Shape): skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape;
                static create(properties?: skynet.agent.v1.SessionSnapshot.$Properties): skynet.agent.v1.SessionSnapshot;

                /**
                 * Encodes the specified SessionSnapshot message. Does not implicitly {@link skynet.agent.v1.SessionSnapshot.verify|verify} messages.
                 * @param message SessionSnapshot message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionSnapshot.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionSnapshot message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionSnapshot.verify|verify} messages.
                 * @param message SessionSnapshot message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionSnapshot.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionSnapshot message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape} SessionSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape;

                /**
                 * Decodes a SessionSnapshot message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape} SessionSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionSnapshot & skynet.agent.v1.SessionSnapshot.$Shape;

                /**
                 * Verifies a SessionSnapshot message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionSnapshot message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionSnapshot
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionSnapshot;

                /**
                 * Creates a plain object from a SessionSnapshot message. Also converts values to other types if specified.
                 * @param message SessionSnapshot
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionSnapshot, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionSnapshot to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionSnapshot {

                /** Properties of a SessionSnapshot. */
                interface $Properties {

                    /** SessionSnapshot sessions */
                    sessions?: (skynet.agent.v1.SessionSummary.$Properties[]|null);

                    /** SessionSnapshot activeSessionId */
                    activeSessionId?: (string|null);

                    /** SessionSnapshot messages */
                    messages?: (skynet.agent.v1.ChatMessage.$Properties[]|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionSnapshot. */
                type $Shape = skynet.agent.v1.SessionSnapshot.$Properties;
            }

            /**
             * Properties of a LoginReq.
             * @deprecated Use skynet.agent.v1.LoginReq.$Properties instead.
             */
            interface ILoginReq extends skynet.agent.v1.LoginReq.$Properties {
            }

            /** Represents a LoginReq. */
            class LoginReq {

                /**
                 * Constructs a new LoginReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.LoginReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /**
                 * Creates a new LoginReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns LoginReq instance
                 */
                static create(properties: skynet.agent.v1.LoginReq.$Shape): skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape;
                static create(properties?: skynet.agent.v1.LoginReq.$Properties): skynet.agent.v1.LoginReq;

                /**
                 * Encodes the specified LoginReq message. Does not implicitly {@link skynet.agent.v1.LoginReq.verify|verify} messages.
                 * @param message LoginReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.LoginReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified LoginReq message, length delimited. Does not implicitly {@link skynet.agent.v1.LoginReq.verify|verify} messages.
                 * @param message LoginReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.LoginReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a LoginReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape} LoginReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape;

                /**
                 * Decodes a LoginReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape} LoginReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.LoginReq & skynet.agent.v1.LoginReq.$Shape;

                /**
                 * Verifies a LoginReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a LoginReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns LoginReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.LoginReq;

                /**
                 * Creates a plain object from a LoginReq message. Also converts values to other types if specified.
                 * @param message LoginReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.LoginReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this LoginReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace LoginReq {

                /** Properties of a LoginReq. */
                interface $Properties {

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a LoginReq. */
                type $Shape = skynet.agent.v1.LoginReq.$Properties;
            }

            /**
             * Properties of a LoginRes.
             * @deprecated Use skynet.agent.v1.LoginRes.$Properties instead.
             */
            interface ILoginRes extends skynet.agent.v1.LoginRes.$Properties {
            }

            /** Represents a LoginRes. */
            class LoginRes {

                /**
                 * Constructs a new LoginRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.LoginRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** LoginRes ret. */
                ret: number;

                /** LoginRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** LoginRes snapshot. */
                snapshot?: (skynet.agent.v1.SessionSnapshot.$Properties|null);

                /**
                 * Creates a new LoginRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns LoginRes instance
                 */
                static create(properties: skynet.agent.v1.LoginRes.$Shape): skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape;
                static create(properties?: skynet.agent.v1.LoginRes.$Properties): skynet.agent.v1.LoginRes;

                /**
                 * Encodes the specified LoginRes message. Does not implicitly {@link skynet.agent.v1.LoginRes.verify|verify} messages.
                 * @param message LoginRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.LoginRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified LoginRes message, length delimited. Does not implicitly {@link skynet.agent.v1.LoginRes.verify|verify} messages.
                 * @param message LoginRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.LoginRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a LoginRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape} LoginRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape;

                /**
                 * Decodes a LoginRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape} LoginRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.LoginRes & skynet.agent.v1.LoginRes.$Shape;

                /**
                 * Verifies a LoginRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a LoginRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns LoginRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.LoginRes;

                /**
                 * Creates a plain object from a LoginRes message. Also converts values to other types if specified.
                 * @param message LoginRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.LoginRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this LoginRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace LoginRes {

                /** Properties of a LoginRes. */
                interface $Properties {

                    /** LoginRes ret */
                    ret?: (number|null);

                    /** LoginRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** LoginRes snapshot */
                    snapshot?: (skynet.agent.v1.SessionSnapshot.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a LoginRes. */
                type $Shape = skynet.agent.v1.LoginRes.$Properties;
            }
        }
    }
}
