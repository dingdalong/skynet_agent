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
                session?: (skynet.agent.v1.SessionState.$Properties|null);

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
                    session?: (skynet.agent.v1.SessionState.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionCreateRes. */
                type $Shape = skynet.agent.v1.SessionCreateRes.$Properties;
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

                /** MessageSendReq retryRunId. */
                retryRunId: string;

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

                    /** MessageSendReq retryRunId */
                    retryRunId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a MessageSendReq. */
                type $Shape = skynet.agent.v1.MessageSendReq.$Properties;
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

                /** MessageSendRes session. */
                session?: (skynet.agent.v1.SessionState.$Properties|null);

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

                    /** MessageSendRes session */
                    session?: (skynet.agent.v1.SessionState.$Properties|null);

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

                /** MessageCancelReq sessionId. */
                sessionId: string;

                /** MessageCancelReq runId. */
                runId: string;

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

                    /** MessageCancelReq sessionId */
                    sessionId?: (string|null);

                    /** MessageCancelReq runId */
                    runId?: (string|null);

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
             * Properties of a SessionUpdatedNtf.
             * @deprecated Use skynet.agent.v1.SessionUpdatedNtf.$Properties instead.
             */
            interface ISessionUpdatedNtf extends skynet.agent.v1.SessionUpdatedNtf.$Properties {
            }

            /** Represents a SessionUpdatedNtf. */
            class SessionUpdatedNtf {

                /**
                 * Constructs a new SessionUpdatedNtf.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionUpdatedNtf.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionUpdatedNtf session. */
                session?: (skynet.agent.v1.SessionState.$Properties|null);

                /**
                 * Creates a new SessionUpdatedNtf instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionUpdatedNtf instance
                 */
                static create(properties: skynet.agent.v1.SessionUpdatedNtf.$Shape): skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape;
                static create(properties?: skynet.agent.v1.SessionUpdatedNtf.$Properties): skynet.agent.v1.SessionUpdatedNtf;

                /**
                 * Encodes the specified SessionUpdatedNtf message. Does not implicitly {@link skynet.agent.v1.SessionUpdatedNtf.verify|verify} messages.
                 * @param message SessionUpdatedNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionUpdatedNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionUpdatedNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionUpdatedNtf.verify|verify} messages.
                 * @param message SessionUpdatedNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionUpdatedNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionUpdatedNtf message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape} SessionUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape;

                /**
                 * Decodes a SessionUpdatedNtf message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape} SessionUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionUpdatedNtf & skynet.agent.v1.SessionUpdatedNtf.$Shape;

                /**
                 * Verifies a SessionUpdatedNtf message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionUpdatedNtf message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionUpdatedNtf
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionUpdatedNtf;

                /**
                 * Creates a plain object from a SessionUpdatedNtf message. Also converts values to other types if specified.
                 * @param message SessionUpdatedNtf
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionUpdatedNtf, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionUpdatedNtf to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionUpdatedNtf {

                /** Properties of a SessionUpdatedNtf. */
                interface $Properties {

                    /** SessionUpdatedNtf session */
                    session?: (skynet.agent.v1.SessionState.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionUpdatedNtf. */
                type $Shape = skynet.agent.v1.SessionUpdatedNtf.$Properties;
            }

            /**
             * Properties of a MessageDeltaNtf.
             * @deprecated Use skynet.agent.v1.MessageDeltaNtf.$Properties instead.
             */
            interface IMessageDeltaNtf extends skynet.agent.v1.MessageDeltaNtf.$Properties {
            }

            /** Represents a MessageDeltaNtf. */
            class MessageDeltaNtf {

                /**
                 * Constructs a new MessageDeltaNtf.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.MessageDeltaNtf.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** MessageDeltaNtf sessionId. */
                sessionId: string;

                /** MessageDeltaNtf runId. */
                runId: string;

                /** MessageDeltaNtf messageId. */
                messageId: string;

                /** MessageDeltaNtf delta. */
                delta: string;

                /** MessageDeltaNtf revision. */
                revision: number;

                /**
                 * Creates a new MessageDeltaNtf instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns MessageDeltaNtf instance
                 */
                static create(properties: skynet.agent.v1.MessageDeltaNtf.$Shape): skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape;
                static create(properties?: skynet.agent.v1.MessageDeltaNtf.$Properties): skynet.agent.v1.MessageDeltaNtf;

                /**
                 * Encodes the specified MessageDeltaNtf message. Does not implicitly {@link skynet.agent.v1.MessageDeltaNtf.verify|verify} messages.
                 * @param message MessageDeltaNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.MessageDeltaNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified MessageDeltaNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.MessageDeltaNtf.verify|verify} messages.
                 * @param message MessageDeltaNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.MessageDeltaNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a MessageDeltaNtf message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape} MessageDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape;

                /**
                 * Decodes a MessageDeltaNtf message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape} MessageDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.MessageDeltaNtf & skynet.agent.v1.MessageDeltaNtf.$Shape;

                /**
                 * Verifies a MessageDeltaNtf message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a MessageDeltaNtf message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns MessageDeltaNtf
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.MessageDeltaNtf;

                /**
                 * Creates a plain object from a MessageDeltaNtf message. Also converts values to other types if specified.
                 * @param message MessageDeltaNtf
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.MessageDeltaNtf, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this MessageDeltaNtf to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace MessageDeltaNtf {

                /** Properties of a MessageDeltaNtf. */
                interface $Properties {

                    /** MessageDeltaNtf sessionId */
                    sessionId?: (string|null);

                    /** MessageDeltaNtf runId */
                    runId?: (string|null);

                    /** MessageDeltaNtf messageId */
                    messageId?: (string|null);

                    /** MessageDeltaNtf delta */
                    delta?: (string|null);

                    /** MessageDeltaNtf revision */
                    revision?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a MessageDeltaNtf. */
                type $Shape = skynet.agent.v1.MessageDeltaNtf.$Properties;
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

            /** MessageRole enum. */
            enum MessageRole {

                /** MESSAGE_ROLE_UNSPECIFIED value */
                MESSAGE_ROLE_UNSPECIFIED = 0,

                /** MESSAGE_ROLE_USER value */
                MESSAGE_ROLE_USER = 1,

                /** MESSAGE_ROLE_ASSISTANT value */
                MESSAGE_ROLE_ASSISTANT = 2
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
                MESSAGE_STATUS_CANCELLED = 3,

                /** MESSAGE_STATUS_FAILED value */
                MESSAGE_STATUS_FAILED = 4
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

                /** ChatMessage status. */
                status: skynet.agent.v1.MessageStatus;

                /** ChatMessage runId. */
                runId: string;

                /** ChatMessage error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** ChatMessage ret. */
                ret: number;

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

                    /** ChatMessage status */
                    status?: (skynet.agent.v1.MessageStatus|null);

                    /** ChatMessage runId */
                    runId?: (string|null);

                    /** ChatMessage error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** ChatMessage ret */
                    ret?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ChatMessage. */
                type $Shape = skynet.agent.v1.ChatMessage.$Properties;
            }

            /**
             * Properties of a SessionState.
             * @deprecated Use skynet.agent.v1.SessionState.$Properties instead.
             */
            interface ISessionState extends skynet.agent.v1.SessionState.$Properties {
            }

            /** Represents a SessionState. */
            class SessionState {

                /**
                 * Constructs a new SessionState.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionState.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionState id. */
                id: string;

                /** SessionState title. */
                title: string;

                /** SessionState updatedAt. */
                updatedAt: number;

                /** SessionState revision. */
                revision: number;

                /** SessionState messages. */
                messages: skynet.agent.v1.ChatMessage.$Properties[];

                /** SessionState runId. */
                runId: string;

                /** SessionState cancelling. */
                cancelling: boolean;

                /**
                 * Creates a new SessionState instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionState instance
                 */
                static create(properties: skynet.agent.v1.SessionState.$Shape): skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape;
                static create(properties?: skynet.agent.v1.SessionState.$Properties): skynet.agent.v1.SessionState;

                /**
                 * Encodes the specified SessionState message. Does not implicitly {@link skynet.agent.v1.SessionState.verify|verify} messages.
                 * @param message SessionState message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionState.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionState message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionState.verify|verify} messages.
                 * @param message SessionState message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionState.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionState message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape} SessionState
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape;

                /**
                 * Decodes a SessionState message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape} SessionState
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionState & skynet.agent.v1.SessionState.$Shape;

                /**
                 * Verifies a SessionState message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionState message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionState
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionState;

                /**
                 * Creates a plain object from a SessionState message. Also converts values to other types if specified.
                 * @param message SessionState
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionState, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionState to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionState {

                /** Properties of a SessionState. */
                interface $Properties {

                    /** SessionState id */
                    id?: (string|null);

                    /** SessionState title */
                    title?: (string|null);

                    /** SessionState updatedAt */
                    updatedAt?: (number|null);

                    /** SessionState revision */
                    revision?: (number|null);

                    /** SessionState messages */
                    messages?: (skynet.agent.v1.ChatMessage.$Properties[]|null);

                    /** SessionState runId */
                    runId?: (string|null);

                    /** SessionState cancelling */
                    cancelling?: (boolean|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionState. */
                type $Shape = skynet.agent.v1.SessionState.$Properties;
            }

            /**
             * Properties of a UserSnapshot.
             * @deprecated Use skynet.agent.v1.UserSnapshot.$Properties instead.
             */
            interface IUserSnapshot extends skynet.agent.v1.UserSnapshot.$Properties {
            }

            /** Represents a UserSnapshot. */
            class UserSnapshot {

                /**
                 * Constructs a new UserSnapshot.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.UserSnapshot.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** UserSnapshot userId. */
                userId: string;

                /** UserSnapshot username. */
                username: string;

                /** UserSnapshot sessions. */
                sessions: skynet.agent.v1.SessionState.$Properties[];

                /**
                 * Creates a new UserSnapshot instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns UserSnapshot instance
                 */
                static create(properties: skynet.agent.v1.UserSnapshot.$Shape): skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape;
                static create(properties?: skynet.agent.v1.UserSnapshot.$Properties): skynet.agent.v1.UserSnapshot;

                /**
                 * Encodes the specified UserSnapshot message. Does not implicitly {@link skynet.agent.v1.UserSnapshot.verify|verify} messages.
                 * @param message UserSnapshot message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.UserSnapshot.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified UserSnapshot message, length delimited. Does not implicitly {@link skynet.agent.v1.UserSnapshot.verify|verify} messages.
                 * @param message UserSnapshot message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.UserSnapshot.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a UserSnapshot message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape} UserSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape;

                /**
                 * Decodes a UserSnapshot message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape} UserSnapshot
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.UserSnapshot & skynet.agent.v1.UserSnapshot.$Shape;

                /**
                 * Verifies a UserSnapshot message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a UserSnapshot message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns UserSnapshot
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.UserSnapshot;

                /**
                 * Creates a plain object from a UserSnapshot message. Also converts values to other types if specified.
                 * @param message UserSnapshot
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.UserSnapshot, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this UserSnapshot to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace UserSnapshot {

                /** Properties of a UserSnapshot. */
                interface $Properties {

                    /** UserSnapshot userId */
                    userId?: (string|null);

                    /** UserSnapshot username */
                    username?: (string|null);

                    /** UserSnapshot sessions */
                    sessions?: (skynet.agent.v1.SessionState.$Properties[]|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a UserSnapshot. */
                type $Shape = skynet.agent.v1.UserSnapshot.$Properties;
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

                /** LoginReq username. */
                username: string;

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

                    /** LoginReq username */
                    username?: (string|null);

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
                snapshot?: (skynet.agent.v1.UserSnapshot.$Properties|null);

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
                    snapshot?: (skynet.agent.v1.UserSnapshot.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a LoginRes. */
                type $Shape = skynet.agent.v1.LoginRes.$Properties;
            }

            /**
             * Properties of a UserSnapshotReq.
             * @deprecated Use skynet.agent.v1.UserSnapshotReq.$Properties instead.
             */
            interface IUserSnapshotReq extends skynet.agent.v1.UserSnapshotReq.$Properties {
            }

            /** Represents a UserSnapshotReq. */
            class UserSnapshotReq {

                /**
                 * Constructs a new UserSnapshotReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.UserSnapshotReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /**
                 * Creates a new UserSnapshotReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns UserSnapshotReq instance
                 */
                static create(properties: skynet.agent.v1.UserSnapshotReq.$Shape): skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape;
                static create(properties?: skynet.agent.v1.UserSnapshotReq.$Properties): skynet.agent.v1.UserSnapshotReq;

                /**
                 * Encodes the specified UserSnapshotReq message. Does not implicitly {@link skynet.agent.v1.UserSnapshotReq.verify|verify} messages.
                 * @param message UserSnapshotReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.UserSnapshotReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified UserSnapshotReq message, length delimited. Does not implicitly {@link skynet.agent.v1.UserSnapshotReq.verify|verify} messages.
                 * @param message UserSnapshotReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.UserSnapshotReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a UserSnapshotReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape} UserSnapshotReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape;

                /**
                 * Decodes a UserSnapshotReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape} UserSnapshotReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.UserSnapshotReq & skynet.agent.v1.UserSnapshotReq.$Shape;

                /**
                 * Verifies a UserSnapshotReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a UserSnapshotReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns UserSnapshotReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.UserSnapshotReq;

                /**
                 * Creates a plain object from a UserSnapshotReq message. Also converts values to other types if specified.
                 * @param message UserSnapshotReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.UserSnapshotReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this UserSnapshotReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace UserSnapshotReq {

                /** Properties of a UserSnapshotReq. */
                interface $Properties {

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a UserSnapshotReq. */
                type $Shape = skynet.agent.v1.UserSnapshotReq.$Properties;
            }

            /**
             * Properties of a UserSnapshotRes.
             * @deprecated Use skynet.agent.v1.UserSnapshotRes.$Properties instead.
             */
            interface IUserSnapshotRes extends skynet.agent.v1.UserSnapshotRes.$Properties {
            }

            /** Represents a UserSnapshotRes. */
            class UserSnapshotRes {

                /**
                 * Constructs a new UserSnapshotRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.UserSnapshotRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** UserSnapshotRes ret. */
                ret: number;

                /** UserSnapshotRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** UserSnapshotRes snapshot. */
                snapshot?: (skynet.agent.v1.UserSnapshot.$Properties|null);

                /**
                 * Creates a new UserSnapshotRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns UserSnapshotRes instance
                 */
                static create(properties: skynet.agent.v1.UserSnapshotRes.$Shape): skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape;
                static create(properties?: skynet.agent.v1.UserSnapshotRes.$Properties): skynet.agent.v1.UserSnapshotRes;

                /**
                 * Encodes the specified UserSnapshotRes message. Does not implicitly {@link skynet.agent.v1.UserSnapshotRes.verify|verify} messages.
                 * @param message UserSnapshotRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.UserSnapshotRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified UserSnapshotRes message, length delimited. Does not implicitly {@link skynet.agent.v1.UserSnapshotRes.verify|verify} messages.
                 * @param message UserSnapshotRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.UserSnapshotRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a UserSnapshotRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape} UserSnapshotRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape;

                /**
                 * Decodes a UserSnapshotRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape} UserSnapshotRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.UserSnapshotRes & skynet.agent.v1.UserSnapshotRes.$Shape;

                /**
                 * Verifies a UserSnapshotRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a UserSnapshotRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns UserSnapshotRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.UserSnapshotRes;

                /**
                 * Creates a plain object from a UserSnapshotRes message. Also converts values to other types if specified.
                 * @param message UserSnapshotRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.UserSnapshotRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this UserSnapshotRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace UserSnapshotRes {

                /** Properties of a UserSnapshotRes. */
                interface $Properties {

                    /** UserSnapshotRes ret */
                    ret?: (number|null);

                    /** UserSnapshotRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** UserSnapshotRes snapshot */
                    snapshot?: (skynet.agent.v1.UserSnapshot.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a UserSnapshotRes. */
                type $Shape = skynet.agent.v1.UserSnapshotRes.$Properties;
            }
        }
    }
}
