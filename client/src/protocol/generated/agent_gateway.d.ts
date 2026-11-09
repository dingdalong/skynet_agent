import * as $protobuf from "protobufjs/minimal.js";
import Long = require("long");

/** Namespace skynet. */
export namespace skynet {

    /** Namespace agent. */
    namespace agent {

        /** Namespace v1. */
        namespace v1 {

            /**
             * Properties of a SessionModelSetReq.
             * @deprecated Use skynet.agent.v1.SessionModelSetReq.$Properties instead.
             */
            interface ISessionModelSetReq extends skynet.agent.v1.SessionModelSetReq.$Properties {
            }

            /** Represents a SessionModelSetReq. */
            class SessionModelSetReq {

                /**
                 * Constructs a new SessionModelSetReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionModelSetReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionModelSetReq sessionId. */
                sessionId: string;

                /** SessionModelSetReq modelId. */
                modelId: string;

                /**
                 * Creates a new SessionModelSetReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionModelSetReq instance
                 */
                static create(properties: skynet.agent.v1.SessionModelSetReq.$Shape): skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape;
                static create(properties?: skynet.agent.v1.SessionModelSetReq.$Properties): skynet.agent.v1.SessionModelSetReq;

                /**
                 * Encodes the specified SessionModelSetReq message. Does not implicitly {@link skynet.agent.v1.SessionModelSetReq.verify|verify} messages.
                 * @param message SessionModelSetReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionModelSetReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionModelSetReq message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionModelSetReq.verify|verify} messages.
                 * @param message SessionModelSetReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionModelSetReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionModelSetReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape} SessionModelSetReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape;

                /**
                 * Decodes a SessionModelSetReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape} SessionModelSetReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionModelSetReq & skynet.agent.v1.SessionModelSetReq.$Shape;

                /**
                 * Verifies a SessionModelSetReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionModelSetReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionModelSetReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionModelSetReq;

                /**
                 * Creates a plain object from a SessionModelSetReq message. Also converts values to other types if specified.
                 * @param message SessionModelSetReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionModelSetReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionModelSetReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionModelSetReq {

                /** Properties of a SessionModelSetReq. */
                interface $Properties {

                    /** SessionModelSetReq sessionId */
                    sessionId?: (string|null);

                    /** SessionModelSetReq modelId */
                    modelId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionModelSetReq. */
                type $Shape = skynet.agent.v1.SessionModelSetReq.$Properties;
            }

            /**
             * Properties of a SessionModelSetRes.
             * @deprecated Use skynet.agent.v1.SessionModelSetRes.$Properties instead.
             */
            interface ISessionModelSetRes extends skynet.agent.v1.SessionModelSetRes.$Properties {
            }

            /** Represents a SessionModelSetRes. */
            class SessionModelSetRes {

                /**
                 * Constructs a new SessionModelSetRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionModelSetRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionModelSetRes ret. */
                ret: number;

                /** SessionModelSetRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** SessionModelSetRes chatSession. */
                chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

                /**
                 * Creates a new SessionModelSetRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionModelSetRes instance
                 */
                static create(properties: skynet.agent.v1.SessionModelSetRes.$Shape): skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape;
                static create(properties?: skynet.agent.v1.SessionModelSetRes.$Properties): skynet.agent.v1.SessionModelSetRes;

                /**
                 * Encodes the specified SessionModelSetRes message. Does not implicitly {@link skynet.agent.v1.SessionModelSetRes.verify|verify} messages.
                 * @param message SessionModelSetRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionModelSetRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionModelSetRes message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionModelSetRes.verify|verify} messages.
                 * @param message SessionModelSetRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionModelSetRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionModelSetRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape} SessionModelSetRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape;

                /**
                 * Decodes a SessionModelSetRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape} SessionModelSetRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionModelSetRes & skynet.agent.v1.SessionModelSetRes.$Shape;

                /**
                 * Verifies a SessionModelSetRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionModelSetRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionModelSetRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionModelSetRes;

                /**
                 * Creates a plain object from a SessionModelSetRes message. Also converts values to other types if specified.
                 * @param message SessionModelSetRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionModelSetRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionModelSetRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionModelSetRes {

                /** Properties of a SessionModelSetRes. */
                interface $Properties {

                    /** SessionModelSetRes ret */
                    ret?: (number|null);

                    /** SessionModelSetRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** SessionModelSetRes chatSession */
                    chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionModelSetRes. */
                type $Shape = skynet.agent.v1.SessionModelSetRes.$Properties;
            }

            /**
             * Properties of a ReasoningDeltaNtf.
             * @deprecated Use skynet.agent.v1.ReasoningDeltaNtf.$Properties instead.
             */
            interface IReasoningDeltaNtf extends skynet.agent.v1.ReasoningDeltaNtf.$Properties {
            }

            /** Represents a ReasoningDeltaNtf. */
            class ReasoningDeltaNtf {

                /**
                 * Constructs a new ReasoningDeltaNtf.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ReasoningDeltaNtf.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ReasoningDeltaNtf sessionId. */
                sessionId: string;

                /** ReasoningDeltaNtf messageId. */
                messageId: string;

                /** ReasoningDeltaNtf toolCallId. */
                toolCallId: string;

                /** ReasoningDeltaNtf block. */
                block?: (skynet.agent.v1.ReasoningBlock.$Properties|null);

                /** ReasoningDeltaNtf revision. */
                revision: number;

                /**
                 * Creates a new ReasoningDeltaNtf instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ReasoningDeltaNtf instance
                 */
                static create(properties: skynet.agent.v1.ReasoningDeltaNtf.$Shape): skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape;
                static create(properties?: skynet.agent.v1.ReasoningDeltaNtf.$Properties): skynet.agent.v1.ReasoningDeltaNtf;

                /**
                 * Encodes the specified ReasoningDeltaNtf message. Does not implicitly {@link skynet.agent.v1.ReasoningDeltaNtf.verify|verify} messages.
                 * @param message ReasoningDeltaNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ReasoningDeltaNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ReasoningDeltaNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.ReasoningDeltaNtf.verify|verify} messages.
                 * @param message ReasoningDeltaNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ReasoningDeltaNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ReasoningDeltaNtf message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape} ReasoningDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape;

                /**
                 * Decodes a ReasoningDeltaNtf message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape} ReasoningDeltaNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ReasoningDeltaNtf & skynet.agent.v1.ReasoningDeltaNtf.$Shape;

                /**
                 * Verifies a ReasoningDeltaNtf message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ReasoningDeltaNtf message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ReasoningDeltaNtf
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ReasoningDeltaNtf;

                /**
                 * Creates a plain object from a ReasoningDeltaNtf message. Also converts values to other types if specified.
                 * @param message ReasoningDeltaNtf
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ReasoningDeltaNtf, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ReasoningDeltaNtf to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ReasoningDeltaNtf {

                /** Properties of a ReasoningDeltaNtf. */
                interface $Properties {

                    /** ReasoningDeltaNtf sessionId */
                    sessionId?: (string|null);

                    /** ReasoningDeltaNtf messageId */
                    messageId?: (string|null);

                    /** ReasoningDeltaNtf toolCallId */
                    toolCallId?: (string|null);

                    /** ReasoningDeltaNtf block */
                    block?: (skynet.agent.v1.ReasoningBlock.$Properties|null);

                    /** ReasoningDeltaNtf revision */
                    revision?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ReasoningDeltaNtf. */
                type $Shape = skynet.agent.v1.ReasoningDeltaNtf.$Properties;
            }

            /**
             * Properties of a ChatReq.
             * @deprecated Use skynet.agent.v1.ChatReq.$Properties instead.
             */
            interface IChatReq extends skynet.agent.v1.ChatReq.$Properties {
            }

            /** Represents a ChatReq. */
            class ChatReq {

                /**
                 * Constructs a new ChatReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ChatReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ChatReq executionTarget. */
                executionTarget?: (skynet.agent.v1.ExecutionTarget.$Properties|null);

                /** ChatReq sessionId. */
                sessionId: string;

                /** ChatReq text. */
                text: string;

                /** ChatReq retryRunId. */
                retryRunId: string;

                /** ChatReq modelId. */
                modelId: string;

                /**
                 * Creates a new ChatReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ChatReq instance
                 */
                static create(properties: skynet.agent.v1.ChatReq.$Shape): skynet.agent.v1.ChatReq & skynet.agent.v1.ChatReq.$Shape;
                static create(properties?: skynet.agent.v1.ChatReq.$Properties): skynet.agent.v1.ChatReq;

                /**
                 * Encodes the specified ChatReq message. Does not implicitly {@link skynet.agent.v1.ChatReq.verify|verify} messages.
                 * @param message ChatReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ChatReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ChatReq message, length delimited. Does not implicitly {@link skynet.agent.v1.ChatReq.verify|verify} messages.
                 * @param message ChatReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ChatReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ChatReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ChatReq & skynet.agent.v1.ChatReq.$Shape} ChatReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ChatReq & skynet.agent.v1.ChatReq.$Shape;

                /**
                 * Decodes a ChatReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ChatReq & skynet.agent.v1.ChatReq.$Shape} ChatReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ChatReq & skynet.agent.v1.ChatReq.$Shape;

                /**
                 * Verifies a ChatReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ChatReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ChatReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ChatReq;

                /**
                 * Creates a plain object from a ChatReq message. Also converts values to other types if specified.
                 * @param message ChatReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ChatReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ChatReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ChatReq {

                /** Properties of a ChatReq. */
                interface $Properties {

                    /** ChatReq executionTarget */
                    executionTarget?: (skynet.agent.v1.ExecutionTarget.$Properties|null);

                    /** ChatReq sessionId */
                    sessionId?: (string|null);

                    /** ChatReq text */
                    text?: (string|null);

                    /** ChatReq retryRunId */
                    retryRunId?: (string|null);

                    /** ChatReq modelId */
                    modelId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ChatReq. */
                type $Shape = skynet.agent.v1.ChatReq.$Properties;
            }

            /**
             * Properties of a ChatRes.
             * @deprecated Use skynet.agent.v1.ChatRes.$Properties instead.
             */
            interface IChatRes extends skynet.agent.v1.ChatRes.$Properties {
            }

            /** Represents a ChatRes. */
            class ChatRes {

                /**
                 * Constructs a new ChatRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ChatRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ChatRes ret. */
                ret: number;

                /** ChatRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** ChatRes chatSession. */
                chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

                /**
                 * Creates a new ChatRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ChatRes instance
                 */
                static create(properties: skynet.agent.v1.ChatRes.$Shape): skynet.agent.v1.ChatRes & skynet.agent.v1.ChatRes.$Shape;
                static create(properties?: skynet.agent.v1.ChatRes.$Properties): skynet.agent.v1.ChatRes;

                /**
                 * Encodes the specified ChatRes message. Does not implicitly {@link skynet.agent.v1.ChatRes.verify|verify} messages.
                 * @param message ChatRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ChatRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ChatRes message, length delimited. Does not implicitly {@link skynet.agent.v1.ChatRes.verify|verify} messages.
                 * @param message ChatRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ChatRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ChatRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ChatRes & skynet.agent.v1.ChatRes.$Shape} ChatRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ChatRes & skynet.agent.v1.ChatRes.$Shape;

                /**
                 * Decodes a ChatRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ChatRes & skynet.agent.v1.ChatRes.$Shape} ChatRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ChatRes & skynet.agent.v1.ChatRes.$Shape;

                /**
                 * Verifies a ChatRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ChatRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ChatRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ChatRes;

                /**
                 * Creates a plain object from a ChatRes message. Also converts values to other types if specified.
                 * @param message ChatRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ChatRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ChatRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ChatRes {

                /** Properties of a ChatRes. */
                interface $Properties {

                    /** ChatRes ret */
                    ret?: (number|null);

                    /** ChatRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** ChatRes chatSession */
                    chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ChatRes. */
                type $Shape = skynet.agent.v1.ChatRes.$Properties;
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

                /** SessionUpdatedNtf chatSession. */
                chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

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

                    /** SessionUpdatedNtf chatSession */
                    chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

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
             * Properties of a ToolUpdatedNtf.
             * @deprecated Use skynet.agent.v1.ToolUpdatedNtf.$Properties instead.
             */
            interface IToolUpdatedNtf extends skynet.agent.v1.ToolUpdatedNtf.$Properties {
            }

            /** Represents a ToolUpdatedNtf. */
            class ToolUpdatedNtf {

                /**
                 * Constructs a new ToolUpdatedNtf.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ToolUpdatedNtf.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ToolUpdatedNtf sessionId. */
                sessionId: string;

                /** ToolUpdatedNtf messageId. */
                messageId: string;

                /** ToolUpdatedNtf tool. */
                tool?: (skynet.agent.v1.ToolCall.$Properties|null);

                /** ToolUpdatedNtf revision. */
                revision: number;

                /**
                 * Creates a new ToolUpdatedNtf instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ToolUpdatedNtf instance
                 */
                static create(properties: skynet.agent.v1.ToolUpdatedNtf.$Shape): skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape;
                static create(properties?: skynet.agent.v1.ToolUpdatedNtf.$Properties): skynet.agent.v1.ToolUpdatedNtf;

                /**
                 * Encodes the specified ToolUpdatedNtf message. Does not implicitly {@link skynet.agent.v1.ToolUpdatedNtf.verify|verify} messages.
                 * @param message ToolUpdatedNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ToolUpdatedNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ToolUpdatedNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.ToolUpdatedNtf.verify|verify} messages.
                 * @param message ToolUpdatedNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ToolUpdatedNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ToolUpdatedNtf message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape} ToolUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape;

                /**
                 * Decodes a ToolUpdatedNtf message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape} ToolUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ToolUpdatedNtf & skynet.agent.v1.ToolUpdatedNtf.$Shape;

                /**
                 * Verifies a ToolUpdatedNtf message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ToolUpdatedNtf message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ToolUpdatedNtf
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ToolUpdatedNtf;

                /**
                 * Creates a plain object from a ToolUpdatedNtf message. Also converts values to other types if specified.
                 * @param message ToolUpdatedNtf
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ToolUpdatedNtf, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ToolUpdatedNtf to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ToolUpdatedNtf {

                /** Properties of a ToolUpdatedNtf. */
                interface $Properties {

                    /** ToolUpdatedNtf sessionId */
                    sessionId?: (string|null);

                    /** ToolUpdatedNtf messageId */
                    messageId?: (string|null);

                    /** ToolUpdatedNtf tool */
                    tool?: (skynet.agent.v1.ToolCall.$Properties|null);

                    /** ToolUpdatedNtf revision */
                    revision?: (number|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ToolUpdatedNtf. */
                type $Shape = skynet.agent.v1.ToolUpdatedNtf.$Properties;
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

                /** ChatMessage toolCalls. */
                toolCalls: skynet.agent.v1.ToolCall.$Properties[];

                /** ChatMessage reasoning. */
                reasoning: skynet.agent.v1.ReasoningBlock.$Properties[];

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

                    /** ChatMessage toolCalls */
                    toolCalls?: (skynet.agent.v1.ToolCall.$Properties[]|null);

                    /** ChatMessage reasoning */
                    reasoning?: (skynet.agent.v1.ReasoningBlock.$Properties[]|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ChatMessage. */
                type $Shape = skynet.agent.v1.ChatMessage.$Properties;
            }

            /**
             * Properties of a ReasoningBlock.
             * @deprecated Use skynet.agent.v1.ReasoningBlock.$Properties instead.
             */
            interface IReasoningBlock extends skynet.agent.v1.ReasoningBlock.$Properties {
            }

            /** Represents a ReasoningBlock. */
            class ReasoningBlock {

                /**
                 * Constructs a new ReasoningBlock.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ReasoningBlock.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ReasoningBlock id. */
                id: string;

                /** ReasoningBlock runId. */
                runId: string;

                /** ReasoningBlock modelId. */
                modelId: string;

                /** ReasoningBlock text. */
                text: string;

                /** ReasoningBlock status. */
                status: string;

                /**
                 * Creates a new ReasoningBlock instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ReasoningBlock instance
                 */
                static create(properties: skynet.agent.v1.ReasoningBlock.$Shape): skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape;
                static create(properties?: skynet.agent.v1.ReasoningBlock.$Properties): skynet.agent.v1.ReasoningBlock;

                /**
                 * Encodes the specified ReasoningBlock message. Does not implicitly {@link skynet.agent.v1.ReasoningBlock.verify|verify} messages.
                 * @param message ReasoningBlock message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ReasoningBlock.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ReasoningBlock message, length delimited. Does not implicitly {@link skynet.agent.v1.ReasoningBlock.verify|verify} messages.
                 * @param message ReasoningBlock message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ReasoningBlock.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ReasoningBlock message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape} ReasoningBlock
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape;

                /**
                 * Decodes a ReasoningBlock message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape} ReasoningBlock
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ReasoningBlock & skynet.agent.v1.ReasoningBlock.$Shape;

                /**
                 * Verifies a ReasoningBlock message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ReasoningBlock message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ReasoningBlock
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ReasoningBlock;

                /**
                 * Creates a plain object from a ReasoningBlock message. Also converts values to other types if specified.
                 * @param message ReasoningBlock
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ReasoningBlock, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ReasoningBlock to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ReasoningBlock {

                /** Properties of a ReasoningBlock. */
                interface $Properties {

                    /** ReasoningBlock id */
                    id?: (string|null);

                    /** ReasoningBlock runId */
                    runId?: (string|null);

                    /** ReasoningBlock modelId */
                    modelId?: (string|null);

                    /** ReasoningBlock text */
                    text?: (string|null);

                    /** ReasoningBlock status */
                    status?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ReasoningBlock. */
                type $Shape = skynet.agent.v1.ReasoningBlock.$Properties;
            }

            /**
             * Properties of a ModelOption.
             * @deprecated Use skynet.agent.v1.ModelOption.$Properties instead.
             */
            interface IModelOption extends skynet.agent.v1.ModelOption.$Properties {
            }

            /** Represents a ModelOption. */
            class ModelOption {

                /**
                 * Constructs a new ModelOption.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ModelOption.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ModelOption id. */
                id: string;

                /** ModelOption name. */
                name: string;

                /** ModelOption model. */
                model: string;

                /**
                 * Creates a new ModelOption instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ModelOption instance
                 */
                static create(properties: skynet.agent.v1.ModelOption.$Shape): skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape;
                static create(properties?: skynet.agent.v1.ModelOption.$Properties): skynet.agent.v1.ModelOption;

                /**
                 * Encodes the specified ModelOption message. Does not implicitly {@link skynet.agent.v1.ModelOption.verify|verify} messages.
                 * @param message ModelOption message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ModelOption.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ModelOption message, length delimited. Does not implicitly {@link skynet.agent.v1.ModelOption.verify|verify} messages.
                 * @param message ModelOption message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ModelOption.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ModelOption message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape} ModelOption
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape;

                /**
                 * Decodes a ModelOption message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape} ModelOption
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ModelOption & skynet.agent.v1.ModelOption.$Shape;

                /**
                 * Verifies a ModelOption message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ModelOption message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ModelOption
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ModelOption;

                /**
                 * Creates a plain object from a ModelOption message. Also converts values to other types if specified.
                 * @param message ModelOption
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ModelOption, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ModelOption to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ModelOption {

                /** Properties of a ModelOption. */
                interface $Properties {

                    /** ModelOption id */
                    id?: (string|null);

                    /** ModelOption name */
                    name?: (string|null);

                    /** ModelOption model */
                    model?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ModelOption. */
                type $Shape = skynet.agent.v1.ModelOption.$Properties;
            }

            /**
             * Properties of a ToolCall.
             * @deprecated Use skynet.agent.v1.ToolCall.$Properties instead.
             */
            interface IToolCall extends skynet.agent.v1.ToolCall.$Properties {
            }

            /** Represents a ToolCall. */
            class ToolCall {

                /**
                 * Constructs a new ToolCall.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ToolCall.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ToolCall id. */
                id: string;

                /** ToolCall name. */
                name: string;

                /** ToolCall arguments. */
                arguments: string;

                /** ToolCall status. */
                status: string;

                /** ToolCall permissionReason. */
                permissionReason: string;

                /** ToolCall permissionMode. */
                permissionMode: string;

                /** ToolCall output. */
                output: string;

                /** ToolCall exitCode. */
                exitCode?: (number|null);

                /** ToolCall truncated. */
                truncated: boolean;

                /** ToolCall changedFiles. */
                changedFiles: string[];

                /** ToolCall error. */
                error: string;

                /** ToolCall processId. */
                processId: string;

                /** ToolCall runId. */
                runId: string;

                /** ToolCall workingDirectory. */
                workingDirectory: string;

                /** ToolCall reasoning. */
                reasoning: skynet.agent.v1.ReasoningBlock.$Properties[];

                /**
                 * Creates a new ToolCall instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ToolCall instance
                 */
                static create(properties: skynet.agent.v1.ToolCall.$Shape): skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape;
                static create(properties?: skynet.agent.v1.ToolCall.$Properties): skynet.agent.v1.ToolCall;

                /**
                 * Encodes the specified ToolCall message. Does not implicitly {@link skynet.agent.v1.ToolCall.verify|verify} messages.
                 * @param message ToolCall message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ToolCall.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ToolCall message, length delimited. Does not implicitly {@link skynet.agent.v1.ToolCall.verify|verify} messages.
                 * @param message ToolCall message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ToolCall.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ToolCall message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape} ToolCall
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape;

                /**
                 * Decodes a ToolCall message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape} ToolCall
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ToolCall & skynet.agent.v1.ToolCall.$Shape;

                /**
                 * Verifies a ToolCall message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ToolCall message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ToolCall
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ToolCall;

                /**
                 * Creates a plain object from a ToolCall message. Also converts values to other types if specified.
                 * @param message ToolCall
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ToolCall, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ToolCall to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ToolCall {

                /** Properties of a ToolCall. */
                interface $Properties {

                    /** ToolCall id */
                    id?: (string|null);

                    /** ToolCall name */
                    name?: (string|null);

                    /** ToolCall arguments */
                    "arguments"?: (string|null);

                    /** ToolCall status */
                    status?: (string|null);

                    /** ToolCall permissionReason */
                    permissionReason?: (string|null);

                    /** ToolCall permissionMode */
                    permissionMode?: (string|null);

                    /** ToolCall output */
                    output?: (string|null);

                    /** ToolCall exitCode */
                    exitCode?: (number|null);

                    /** ToolCall truncated */
                    truncated?: (boolean|null);

                    /** ToolCall changedFiles */
                    changedFiles?: (string[]|null);

                    /** ToolCall error */
                    error?: (string|null);

                    /** ToolCall processId */
                    processId?: (string|null);

                    /** ToolCall runId */
                    runId?: (string|null);

                    /** ToolCall workingDirectory */
                    workingDirectory?: (string|null);

                    /** ToolCall reasoning */
                    reasoning?: (skynet.agent.v1.ReasoningBlock.$Properties[]|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ToolCall. */
                type $Shape = skynet.agent.v1.ToolCall.$Properties;
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
             * Properties of a ChatSession.
             * @deprecated Use skynet.agent.v1.ChatSession.$Properties instead.
             */
            interface IChatSession extends skynet.agent.v1.ChatSession.$Properties {
            }

            /** Represents a ChatSession. */
            class ChatSession {

                /**
                 * Constructs a new ChatSession.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ChatSession.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ChatSession executionTarget. */
                executionTarget?: (skynet.agent.v1.ExecutionTarget.$Properties|null);

                /** ChatSession session. */
                session?: (skynet.agent.v1.SessionState.$Properties|null);

                /** ChatSession modelId. */
                modelId: string;

                /** ChatSession permissionModelId. */
                permissionModelId: string;

                /**
                 * Creates a new ChatSession instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ChatSession instance
                 */
                static create(properties: skynet.agent.v1.ChatSession.$Shape): skynet.agent.v1.ChatSession & skynet.agent.v1.ChatSession.$Shape;
                static create(properties?: skynet.agent.v1.ChatSession.$Properties): skynet.agent.v1.ChatSession;

                /**
                 * Encodes the specified ChatSession message. Does not implicitly {@link skynet.agent.v1.ChatSession.verify|verify} messages.
                 * @param message ChatSession message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ChatSession.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ChatSession message, length delimited. Does not implicitly {@link skynet.agent.v1.ChatSession.verify|verify} messages.
                 * @param message ChatSession message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ChatSession.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ChatSession message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ChatSession & skynet.agent.v1.ChatSession.$Shape} ChatSession
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ChatSession & skynet.agent.v1.ChatSession.$Shape;

                /**
                 * Decodes a ChatSession message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ChatSession & skynet.agent.v1.ChatSession.$Shape} ChatSession
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ChatSession & skynet.agent.v1.ChatSession.$Shape;

                /**
                 * Verifies a ChatSession message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a ChatSession message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ChatSession
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ChatSession;

                /**
                 * Creates a plain object from a ChatSession message. Also converts values to other types if specified.
                 * @param message ChatSession
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ChatSession, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ChatSession to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ChatSession {

                /** Properties of a ChatSession. */
                interface $Properties {

                    /** ChatSession executionTarget */
                    executionTarget?: (skynet.agent.v1.ExecutionTarget.$Properties|null);

                    /** ChatSession session */
                    session?: (skynet.agent.v1.SessionState.$Properties|null);

                    /** ChatSession modelId */
                    modelId?: (string|null);

                    /** ChatSession permissionModelId */
                    permissionModelId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a ChatSession. */
                type $Shape = skynet.agent.v1.ChatSession.$Properties;
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

                /** UserSnapshot desktops. */
                desktops: skynet.agent.v1.DesktopDevice.$Properties[];

                /** UserSnapshot userId. */
                userId: string;

                /** UserSnapshot username. */
                username: string;

                /** UserSnapshot chatSessions. */
                chatSessions: skynet.agent.v1.ChatSession.$Properties[];

                /** UserSnapshot models. */
                models: skynet.agent.v1.ModelOption.$Properties[];

                /** UserSnapshot defaultModelId. */
                defaultModelId: string;

                /** UserSnapshot permissionModelId. */
                permissionModelId: string;

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

                    /** UserSnapshot desktops */
                    desktops?: (skynet.agent.v1.DesktopDevice.$Properties[]|null);

                    /** UserSnapshot userId */
                    userId?: (string|null);

                    /** UserSnapshot username */
                    username?: (string|null);

                    /** UserSnapshot chatSessions */
                    chatSessions?: (skynet.agent.v1.ChatSession.$Properties[]|null);

                    /** UserSnapshot models */
                    models?: (skynet.agent.v1.ModelOption.$Properties[]|null);

                    /** UserSnapshot defaultModelId */
                    defaultModelId?: (string|null);

                    /** UserSnapshot permissionModelId */
                    permissionModelId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a UserSnapshot. */
                type $Shape = skynet.agent.v1.UserSnapshot.$Properties;
            }

            /**
             * Properties of an ExecutionTarget.
             * @deprecated Use skynet.agent.v1.ExecutionTarget.$Properties instead.
             */
            interface IExecutionTarget extends skynet.agent.v1.ExecutionTarget.$Properties {
            }

            /** Represents an ExecutionTarget. */
            class ExecutionTarget {

                /**
                 * Constructs a new ExecutionTarget.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ExecutionTarget.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ExecutionTarget deviceId. */
                deviceId: string;

                /** ExecutionTarget workspaceId. */
                workspaceId: string;

                /** ExecutionTarget directory. */
                directory: string;

                /** ExecutionTarget platform. */
                platform: string;

                /**
                 * Creates a new ExecutionTarget instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ExecutionTarget instance
                 */
                static create(properties: skynet.agent.v1.ExecutionTarget.$Shape): skynet.agent.v1.ExecutionTarget & skynet.agent.v1.ExecutionTarget.$Shape;
                static create(properties?: skynet.agent.v1.ExecutionTarget.$Properties): skynet.agent.v1.ExecutionTarget;

                /**
                 * Encodes the specified ExecutionTarget message. Does not implicitly {@link skynet.agent.v1.ExecutionTarget.verify|verify} messages.
                 * @param message ExecutionTarget message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ExecutionTarget.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ExecutionTarget message, length delimited. Does not implicitly {@link skynet.agent.v1.ExecutionTarget.verify|verify} messages.
                 * @param message ExecutionTarget message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ExecutionTarget.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ExecutionTarget message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ExecutionTarget & skynet.agent.v1.ExecutionTarget.$Shape} ExecutionTarget
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ExecutionTarget & skynet.agent.v1.ExecutionTarget.$Shape;

                /**
                 * Decodes an ExecutionTarget message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ExecutionTarget & skynet.agent.v1.ExecutionTarget.$Shape} ExecutionTarget
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ExecutionTarget & skynet.agent.v1.ExecutionTarget.$Shape;

                /**
                 * Verifies an ExecutionTarget message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ExecutionTarget message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ExecutionTarget
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ExecutionTarget;

                /**
                 * Creates a plain object from an ExecutionTarget message. Also converts values to other types if specified.
                 * @param message ExecutionTarget
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ExecutionTarget, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ExecutionTarget to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ExecutionTarget {

                /** Properties of an ExecutionTarget. */
                interface $Properties {

                    /** ExecutionTarget deviceId */
                    deviceId?: (string|null);

                    /** ExecutionTarget workspaceId */
                    workspaceId?: (string|null);

                    /** ExecutionTarget directory */
                    directory?: (string|null);

                    /** ExecutionTarget platform */
                    platform?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of an ExecutionTarget. */
                type $Shape = skynet.agent.v1.ExecutionTarget.$Properties;
            }

            /**
             * Properties of a DesktopDevice.
             * @deprecated Use skynet.agent.v1.DesktopDevice.$Properties instead.
             */
            interface IDesktopDevice extends skynet.agent.v1.DesktopDevice.$Properties {
            }

            /** Represents a DesktopDevice. */
            class DesktopDevice {

                /**
                 * Constructs a new DesktopDevice.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.DesktopDevice.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** DesktopDevice id. */
                id: string;

                /** DesktopDevice name. */
                name: string;

                /** DesktopDevice online. */
                online: boolean;

                /** DesktopDevice remoteEnabled. */
                remoteEnabled: boolean;

                /**
                 * Creates a new DesktopDevice instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns DesktopDevice instance
                 */
                static create(properties: skynet.agent.v1.DesktopDevice.$Shape): skynet.agent.v1.DesktopDevice & skynet.agent.v1.DesktopDevice.$Shape;
                static create(properties?: skynet.agent.v1.DesktopDevice.$Properties): skynet.agent.v1.DesktopDevice;

                /**
                 * Encodes the specified DesktopDevice message. Does not implicitly {@link skynet.agent.v1.DesktopDevice.verify|verify} messages.
                 * @param message DesktopDevice message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.DesktopDevice.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified DesktopDevice message, length delimited. Does not implicitly {@link skynet.agent.v1.DesktopDevice.verify|verify} messages.
                 * @param message DesktopDevice message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.DesktopDevice.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a DesktopDevice message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.DesktopDevice & skynet.agent.v1.DesktopDevice.$Shape} DesktopDevice
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.DesktopDevice & skynet.agent.v1.DesktopDevice.$Shape;

                /**
                 * Decodes a DesktopDevice message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.DesktopDevice & skynet.agent.v1.DesktopDevice.$Shape} DesktopDevice
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.DesktopDevice & skynet.agent.v1.DesktopDevice.$Shape;

                /**
                 * Verifies a DesktopDevice message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a DesktopDevice message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns DesktopDevice
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.DesktopDevice;

                /**
                 * Creates a plain object from a DesktopDevice message. Also converts values to other types if specified.
                 * @param message DesktopDevice
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.DesktopDevice, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this DesktopDevice to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace DesktopDevice {

                /** Properties of a DesktopDevice. */
                interface $Properties {

                    /** DesktopDevice id */
                    id?: (string|null);

                    /** DesktopDevice name */
                    name?: (string|null);

                    /** DesktopDevice online */
                    online?: (boolean|null);

                    /** DesktopDevice remoteEnabled */
                    remoteEnabled?: (boolean|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a DesktopDevice. */
                type $Shape = skynet.agent.v1.DesktopDevice.$Properties;
            }

            /**
             * Properties of a DesktopRegisterReq.
             * @deprecated Use skynet.agent.v1.DesktopRegisterReq.$Properties instead.
             */
            interface IDesktopRegisterReq extends skynet.agent.v1.DesktopRegisterReq.$Properties {
            }

            /** Represents a DesktopRegisterReq. */
            class DesktopRegisterReq {

                /**
                 * Constructs a new DesktopRegisterReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.DesktopRegisterReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** DesktopRegisterReq deviceId. */
                deviceId: string;

                /** DesktopRegisterReq name. */
                name: string;

                /** DesktopRegisterReq remoteEnabled. */
                remoteEnabled: boolean;

                /** DesktopRegisterReq authorizationId. */
                authorizationId: string;

                /**
                 * Creates a new DesktopRegisterReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns DesktopRegisterReq instance
                 */
                static create(properties: skynet.agent.v1.DesktopRegisterReq.$Shape): skynet.agent.v1.DesktopRegisterReq & skynet.agent.v1.DesktopRegisterReq.$Shape;
                static create(properties?: skynet.agent.v1.DesktopRegisterReq.$Properties): skynet.agent.v1.DesktopRegisterReq;

                /**
                 * Encodes the specified DesktopRegisterReq message. Does not implicitly {@link skynet.agent.v1.DesktopRegisterReq.verify|verify} messages.
                 * @param message DesktopRegisterReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.DesktopRegisterReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified DesktopRegisterReq message, length delimited. Does not implicitly {@link skynet.agent.v1.DesktopRegisterReq.verify|verify} messages.
                 * @param message DesktopRegisterReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.DesktopRegisterReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a DesktopRegisterReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.DesktopRegisterReq & skynet.agent.v1.DesktopRegisterReq.$Shape} DesktopRegisterReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.DesktopRegisterReq & skynet.agent.v1.DesktopRegisterReq.$Shape;

                /**
                 * Decodes a DesktopRegisterReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.DesktopRegisterReq & skynet.agent.v1.DesktopRegisterReq.$Shape} DesktopRegisterReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.DesktopRegisterReq & skynet.agent.v1.DesktopRegisterReq.$Shape;

                /**
                 * Verifies a DesktopRegisterReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a DesktopRegisterReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns DesktopRegisterReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.DesktopRegisterReq;

                /**
                 * Creates a plain object from a DesktopRegisterReq message. Also converts values to other types if specified.
                 * @param message DesktopRegisterReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.DesktopRegisterReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this DesktopRegisterReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace DesktopRegisterReq {

                /** Properties of a DesktopRegisterReq. */
                interface $Properties {

                    /** DesktopRegisterReq deviceId */
                    deviceId?: (string|null);

                    /** DesktopRegisterReq name */
                    name?: (string|null);

                    /** DesktopRegisterReq remoteEnabled */
                    remoteEnabled?: (boolean|null);

                    /** DesktopRegisterReq authorizationId */
                    authorizationId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a DesktopRegisterReq. */
                type $Shape = skynet.agent.v1.DesktopRegisterReq.$Properties;
            }

            /**
             * Properties of a DesktopRegisterRes.
             * @deprecated Use skynet.agent.v1.DesktopRegisterRes.$Properties instead.
             */
            interface IDesktopRegisterRes extends skynet.agent.v1.DesktopRegisterRes.$Properties {
            }

            /** Represents a DesktopRegisterRes. */
            class DesktopRegisterRes {

                /**
                 * Constructs a new DesktopRegisterRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.DesktopRegisterRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** DesktopRegisterRes ret. */
                ret: number;

                /** DesktopRegisterRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /**
                 * Creates a new DesktopRegisterRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns DesktopRegisterRes instance
                 */
                static create(properties: skynet.agent.v1.DesktopRegisterRes.$Shape): skynet.agent.v1.DesktopRegisterRes & skynet.agent.v1.DesktopRegisterRes.$Shape;
                static create(properties?: skynet.agent.v1.DesktopRegisterRes.$Properties): skynet.agent.v1.DesktopRegisterRes;

                /**
                 * Encodes the specified DesktopRegisterRes message. Does not implicitly {@link skynet.agent.v1.DesktopRegisterRes.verify|verify} messages.
                 * @param message DesktopRegisterRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.DesktopRegisterRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified DesktopRegisterRes message, length delimited. Does not implicitly {@link skynet.agent.v1.DesktopRegisterRes.verify|verify} messages.
                 * @param message DesktopRegisterRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.DesktopRegisterRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a DesktopRegisterRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.DesktopRegisterRes & skynet.agent.v1.DesktopRegisterRes.$Shape} DesktopRegisterRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.DesktopRegisterRes & skynet.agent.v1.DesktopRegisterRes.$Shape;

                /**
                 * Decodes a DesktopRegisterRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.DesktopRegisterRes & skynet.agent.v1.DesktopRegisterRes.$Shape} DesktopRegisterRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.DesktopRegisterRes & skynet.agent.v1.DesktopRegisterRes.$Shape;

                /**
                 * Verifies a DesktopRegisterRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a DesktopRegisterRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns DesktopRegisterRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.DesktopRegisterRes;

                /**
                 * Creates a plain object from a DesktopRegisterRes message. Also converts values to other types if specified.
                 * @param message DesktopRegisterRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.DesktopRegisterRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this DesktopRegisterRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace DesktopRegisterRes {

                /** Properties of a DesktopRegisterRes. */
                interface $Properties {

                    /** DesktopRegisterRes ret */
                    ret?: (number|null);

                    /** DesktopRegisterRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a DesktopRegisterRes. */
                type $Shape = skynet.agent.v1.DesktopRegisterRes.$Properties;
            }

            /**
             * Properties of a DesktopUpdatedNtf.
             * @deprecated Use skynet.agent.v1.DesktopUpdatedNtf.$Properties instead.
             */
            interface IDesktopUpdatedNtf extends skynet.agent.v1.DesktopUpdatedNtf.$Properties {
            }

            /** Represents a DesktopUpdatedNtf. */
            class DesktopUpdatedNtf {

                /**
                 * Constructs a new DesktopUpdatedNtf.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.DesktopUpdatedNtf.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** DesktopUpdatedNtf device. */
                device?: (skynet.agent.v1.DesktopDevice.$Properties|null);

                /**
                 * Creates a new DesktopUpdatedNtf instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns DesktopUpdatedNtf instance
                 */
                static create(properties: skynet.agent.v1.DesktopUpdatedNtf.$Shape): skynet.agent.v1.DesktopUpdatedNtf & skynet.agent.v1.DesktopUpdatedNtf.$Shape;
                static create(properties?: skynet.agent.v1.DesktopUpdatedNtf.$Properties): skynet.agent.v1.DesktopUpdatedNtf;

                /**
                 * Encodes the specified DesktopUpdatedNtf message. Does not implicitly {@link skynet.agent.v1.DesktopUpdatedNtf.verify|verify} messages.
                 * @param message DesktopUpdatedNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.DesktopUpdatedNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified DesktopUpdatedNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.DesktopUpdatedNtf.verify|verify} messages.
                 * @param message DesktopUpdatedNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.DesktopUpdatedNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a DesktopUpdatedNtf message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.DesktopUpdatedNtf & skynet.agent.v1.DesktopUpdatedNtf.$Shape} DesktopUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.DesktopUpdatedNtf & skynet.agent.v1.DesktopUpdatedNtf.$Shape;

                /**
                 * Decodes a DesktopUpdatedNtf message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.DesktopUpdatedNtf & skynet.agent.v1.DesktopUpdatedNtf.$Shape} DesktopUpdatedNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.DesktopUpdatedNtf & skynet.agent.v1.DesktopUpdatedNtf.$Shape;

                /**
                 * Verifies a DesktopUpdatedNtf message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a DesktopUpdatedNtf message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns DesktopUpdatedNtf
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.DesktopUpdatedNtf;

                /**
                 * Creates a plain object from a DesktopUpdatedNtf message. Also converts values to other types if specified.
                 * @param message DesktopUpdatedNtf
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.DesktopUpdatedNtf, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this DesktopUpdatedNtf to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace DesktopUpdatedNtf {

                /** Properties of a DesktopUpdatedNtf. */
                interface $Properties {

                    /** DesktopUpdatedNtf device */
                    device?: (skynet.agent.v1.DesktopDevice.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a DesktopUpdatedNtf. */
                type $Shape = skynet.agent.v1.DesktopUpdatedNtf.$Properties;
            }

            /**
             * Properties of a SessionExecutionSetReq.
             * @deprecated Use skynet.agent.v1.SessionExecutionSetReq.$Properties instead.
             */
            interface ISessionExecutionSetReq extends skynet.agent.v1.SessionExecutionSetReq.$Properties {
            }

            /** Represents a SessionExecutionSetReq. */
            class SessionExecutionSetReq {

                /**
                 * Constructs a new SessionExecutionSetReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionExecutionSetReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionExecutionSetReq sessionId. */
                sessionId: string;

                /** SessionExecutionSetReq target. */
                target?: (skynet.agent.v1.ExecutionTarget.$Properties|null);

                /**
                 * Creates a new SessionExecutionSetReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionExecutionSetReq instance
                 */
                static create(properties: skynet.agent.v1.SessionExecutionSetReq.$Shape): skynet.agent.v1.SessionExecutionSetReq & skynet.agent.v1.SessionExecutionSetReq.$Shape;
                static create(properties?: skynet.agent.v1.SessionExecutionSetReq.$Properties): skynet.agent.v1.SessionExecutionSetReq;

                /**
                 * Encodes the specified SessionExecutionSetReq message. Does not implicitly {@link skynet.agent.v1.SessionExecutionSetReq.verify|verify} messages.
                 * @param message SessionExecutionSetReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionExecutionSetReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionExecutionSetReq message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionExecutionSetReq.verify|verify} messages.
                 * @param message SessionExecutionSetReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionExecutionSetReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionExecutionSetReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionExecutionSetReq & skynet.agent.v1.SessionExecutionSetReq.$Shape} SessionExecutionSetReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionExecutionSetReq & skynet.agent.v1.SessionExecutionSetReq.$Shape;

                /**
                 * Decodes a SessionExecutionSetReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionExecutionSetReq & skynet.agent.v1.SessionExecutionSetReq.$Shape} SessionExecutionSetReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionExecutionSetReq & skynet.agent.v1.SessionExecutionSetReq.$Shape;

                /**
                 * Verifies a SessionExecutionSetReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionExecutionSetReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionExecutionSetReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionExecutionSetReq;

                /**
                 * Creates a plain object from a SessionExecutionSetReq message. Also converts values to other types if specified.
                 * @param message SessionExecutionSetReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionExecutionSetReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionExecutionSetReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionExecutionSetReq {

                /** Properties of a SessionExecutionSetReq. */
                interface $Properties {

                    /** SessionExecutionSetReq sessionId */
                    sessionId?: (string|null);

                    /** SessionExecutionSetReq target */
                    target?: (skynet.agent.v1.ExecutionTarget.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionExecutionSetReq. */
                type $Shape = skynet.agent.v1.SessionExecutionSetReq.$Properties;
            }

            /**
             * Properties of a SessionExecutionSetRes.
             * @deprecated Use skynet.agent.v1.SessionExecutionSetRes.$Properties instead.
             */
            interface ISessionExecutionSetRes extends skynet.agent.v1.SessionExecutionSetRes.$Properties {
            }

            /** Represents a SessionExecutionSetRes. */
            class SessionExecutionSetRes {

                /**
                 * Constructs a new SessionExecutionSetRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.SessionExecutionSetRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** SessionExecutionSetRes ret. */
                ret: number;

                /** SessionExecutionSetRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /** SessionExecutionSetRes chatSession. */
                chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

                /**
                 * Creates a new SessionExecutionSetRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns SessionExecutionSetRes instance
                 */
                static create(properties: skynet.agent.v1.SessionExecutionSetRes.$Shape): skynet.agent.v1.SessionExecutionSetRes & skynet.agent.v1.SessionExecutionSetRes.$Shape;
                static create(properties?: skynet.agent.v1.SessionExecutionSetRes.$Properties): skynet.agent.v1.SessionExecutionSetRes;

                /**
                 * Encodes the specified SessionExecutionSetRes message. Does not implicitly {@link skynet.agent.v1.SessionExecutionSetRes.verify|verify} messages.
                 * @param message SessionExecutionSetRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.SessionExecutionSetRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SessionExecutionSetRes message, length delimited. Does not implicitly {@link skynet.agent.v1.SessionExecutionSetRes.verify|verify} messages.
                 * @param message SessionExecutionSetRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.SessionExecutionSetRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SessionExecutionSetRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.SessionExecutionSetRes & skynet.agent.v1.SessionExecutionSetRes.$Shape} SessionExecutionSetRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.SessionExecutionSetRes & skynet.agent.v1.SessionExecutionSetRes.$Shape;

                /**
                 * Decodes a SessionExecutionSetRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.SessionExecutionSetRes & skynet.agent.v1.SessionExecutionSetRes.$Shape} SessionExecutionSetRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.SessionExecutionSetRes & skynet.agent.v1.SessionExecutionSetRes.$Shape;

                /**
                 * Verifies a SessionExecutionSetRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates a SessionExecutionSetRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns SessionExecutionSetRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.SessionExecutionSetRes;

                /**
                 * Creates a plain object from a SessionExecutionSetRes message. Also converts values to other types if specified.
                 * @param message SessionExecutionSetRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.SessionExecutionSetRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this SessionExecutionSetRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace SessionExecutionSetRes {

                /** Properties of a SessionExecutionSetRes. */
                interface $Properties {

                    /** SessionExecutionSetRes ret */
                    ret?: (number|null);

                    /** SessionExecutionSetRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** SessionExecutionSetRes chatSession */
                    chatSession?: (skynet.agent.v1.ChatSession.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of a SessionExecutionSetRes. */
                type $Shape = skynet.agent.v1.SessionExecutionSetRes.$Properties;
            }

            /**
             * Properties of an ExecutionActionNtf.
             * @deprecated Use skynet.agent.v1.ExecutionActionNtf.$Properties instead.
             */
            interface IExecutionActionNtf extends skynet.agent.v1.ExecutionActionNtf.$Properties {
            }

            /** Represents an ExecutionActionNtf. */
            class ExecutionActionNtf {

                /**
                 * Constructs a new ExecutionActionNtf.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ExecutionActionNtf.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ExecutionActionNtf requestId. */
                requestId: string;

                /** ExecutionActionNtf sessionId. */
                sessionId: string;

                /** ExecutionActionNtf runId. */
                runId: string;

                /** ExecutionActionNtf toolCallId. */
                toolCallId: string;

                /** ExecutionActionNtf operation. */
                operation: string;

                /** ExecutionActionNtf arguments. */
                arguments: string;

                /** ExecutionActionNtf workspaceId. */
                workspaceId: string;

                /** ExecutionActionNtf remote. */
                remote: boolean;

                /** ExecutionActionNtf authorizationId. */
                authorizationId: string;

                /**
                 * Creates a new ExecutionActionNtf instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ExecutionActionNtf instance
                 */
                static create(properties: skynet.agent.v1.ExecutionActionNtf.$Shape): skynet.agent.v1.ExecutionActionNtf & skynet.agent.v1.ExecutionActionNtf.$Shape;
                static create(properties?: skynet.agent.v1.ExecutionActionNtf.$Properties): skynet.agent.v1.ExecutionActionNtf;

                /**
                 * Encodes the specified ExecutionActionNtf message. Does not implicitly {@link skynet.agent.v1.ExecutionActionNtf.verify|verify} messages.
                 * @param message ExecutionActionNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ExecutionActionNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ExecutionActionNtf message, length delimited. Does not implicitly {@link skynet.agent.v1.ExecutionActionNtf.verify|verify} messages.
                 * @param message ExecutionActionNtf message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ExecutionActionNtf.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ExecutionActionNtf message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ExecutionActionNtf & skynet.agent.v1.ExecutionActionNtf.$Shape} ExecutionActionNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ExecutionActionNtf & skynet.agent.v1.ExecutionActionNtf.$Shape;

                /**
                 * Decodes an ExecutionActionNtf message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ExecutionActionNtf & skynet.agent.v1.ExecutionActionNtf.$Shape} ExecutionActionNtf
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ExecutionActionNtf & skynet.agent.v1.ExecutionActionNtf.$Shape;

                /**
                 * Verifies an ExecutionActionNtf message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ExecutionActionNtf message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ExecutionActionNtf
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ExecutionActionNtf;

                /**
                 * Creates a plain object from an ExecutionActionNtf message. Also converts values to other types if specified.
                 * @param message ExecutionActionNtf
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ExecutionActionNtf, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ExecutionActionNtf to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ExecutionActionNtf {

                /** Properties of an ExecutionActionNtf. */
                interface $Properties {

                    /** ExecutionActionNtf requestId */
                    requestId?: (string|null);

                    /** ExecutionActionNtf sessionId */
                    sessionId?: (string|null);

                    /** ExecutionActionNtf runId */
                    runId?: (string|null);

                    /** ExecutionActionNtf toolCallId */
                    toolCallId?: (string|null);

                    /** ExecutionActionNtf operation */
                    operation?: (string|null);

                    /** ExecutionActionNtf arguments */
                    "arguments"?: (string|null);

                    /** ExecutionActionNtf workspaceId */
                    workspaceId?: (string|null);

                    /** ExecutionActionNtf remote */
                    remote?: (boolean|null);

                    /** ExecutionActionNtf authorizationId */
                    authorizationId?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of an ExecutionActionNtf. */
                type $Shape = skynet.agent.v1.ExecutionActionNtf.$Properties;
            }

            /**
             * Properties of an ExecutionResultReq.
             * @deprecated Use skynet.agent.v1.ExecutionResultReq.$Properties instead.
             */
            interface IExecutionResultReq extends skynet.agent.v1.ExecutionResultReq.$Properties {
            }

            /** Represents an ExecutionResultReq. */
            class ExecutionResultReq {

                /**
                 * Constructs a new ExecutionResultReq.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ExecutionResultReq.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ExecutionResultReq requestId. */
                requestId: string;

                /** ExecutionResultReq result. */
                result: string;

                /**
                 * Creates a new ExecutionResultReq instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ExecutionResultReq instance
                 */
                static create(properties: skynet.agent.v1.ExecutionResultReq.$Shape): skynet.agent.v1.ExecutionResultReq & skynet.agent.v1.ExecutionResultReq.$Shape;
                static create(properties?: skynet.agent.v1.ExecutionResultReq.$Properties): skynet.agent.v1.ExecutionResultReq;

                /**
                 * Encodes the specified ExecutionResultReq message. Does not implicitly {@link skynet.agent.v1.ExecutionResultReq.verify|verify} messages.
                 * @param message ExecutionResultReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ExecutionResultReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ExecutionResultReq message, length delimited. Does not implicitly {@link skynet.agent.v1.ExecutionResultReq.verify|verify} messages.
                 * @param message ExecutionResultReq message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ExecutionResultReq.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ExecutionResultReq message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ExecutionResultReq & skynet.agent.v1.ExecutionResultReq.$Shape} ExecutionResultReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ExecutionResultReq & skynet.agent.v1.ExecutionResultReq.$Shape;

                /**
                 * Decodes an ExecutionResultReq message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ExecutionResultReq & skynet.agent.v1.ExecutionResultReq.$Shape} ExecutionResultReq
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ExecutionResultReq & skynet.agent.v1.ExecutionResultReq.$Shape;

                /**
                 * Verifies an ExecutionResultReq message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ExecutionResultReq message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ExecutionResultReq
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ExecutionResultReq;

                /**
                 * Creates a plain object from an ExecutionResultReq message. Also converts values to other types if specified.
                 * @param message ExecutionResultReq
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ExecutionResultReq, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ExecutionResultReq to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ExecutionResultReq {

                /** Properties of an ExecutionResultReq. */
                interface $Properties {

                    /** ExecutionResultReq requestId */
                    requestId?: (string|null);

                    /** ExecutionResultReq result */
                    result?: (string|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of an ExecutionResultReq. */
                type $Shape = skynet.agent.v1.ExecutionResultReq.$Properties;
            }

            /**
             * Properties of an ExecutionResultRes.
             * @deprecated Use skynet.agent.v1.ExecutionResultRes.$Properties instead.
             */
            interface IExecutionResultRes extends skynet.agent.v1.ExecutionResultRes.$Properties {
            }

            /** Represents an ExecutionResultRes. */
            class ExecutionResultRes {

                /**
                 * Constructs a new ExecutionResultRes.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: skynet.agent.v1.ExecutionResultRes.$Properties);

                /** Unknown fields preserved while decoding when enabled */
                $unknowns?: Uint8Array[];

                /** ExecutionResultRes ret. */
                ret: number;

                /** ExecutionResultRes error. */
                error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                /**
                 * Creates a new ExecutionResultRes instance using the specified properties.
                 * @param [properties] Properties to set
                 * @returns ExecutionResultRes instance
                 */
                static create(properties: skynet.agent.v1.ExecutionResultRes.$Shape): skynet.agent.v1.ExecutionResultRes & skynet.agent.v1.ExecutionResultRes.$Shape;
                static create(properties?: skynet.agent.v1.ExecutionResultRes.$Properties): skynet.agent.v1.ExecutionResultRes;

                /**
                 * Encodes the specified ExecutionResultRes message. Does not implicitly {@link skynet.agent.v1.ExecutionResultRes.verify|verify} messages.
                 * @param message ExecutionResultRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encode(message: skynet.agent.v1.ExecutionResultRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ExecutionResultRes message, length delimited. Does not implicitly {@link skynet.agent.v1.ExecutionResultRes.verify|verify} messages.
                 * @param message ExecutionResultRes message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                static encodeDelimited(message: skynet.agent.v1.ExecutionResultRes.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an ExecutionResultRes message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns {skynet.agent.v1.ExecutionResultRes & skynet.agent.v1.ExecutionResultRes.$Shape} ExecutionResultRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): skynet.agent.v1.ExecutionResultRes & skynet.agent.v1.ExecutionResultRes.$Shape;

                /**
                 * Decodes an ExecutionResultRes message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns {skynet.agent.v1.ExecutionResultRes & skynet.agent.v1.ExecutionResultRes.$Shape} ExecutionResultRes
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): skynet.agent.v1.ExecutionResultRes & skynet.agent.v1.ExecutionResultRes.$Shape;

                /**
                 * Verifies an ExecutionResultRes message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Creates an ExecutionResultRes message from a plain object. Also converts values to their respective internal types.
                 * @param object Plain object
                 * @returns ExecutionResultRes
                 */
                static fromObject(object: { [k: string]: any }): skynet.agent.v1.ExecutionResultRes;

                /**
                 * Creates a plain object from an ExecutionResultRes message. Also converts values to other types if specified.
                 * @param message ExecutionResultRes
                 * @param [options] Conversion options
                 * @returns Plain object
                 */
                static toObject(message: skynet.agent.v1.ExecutionResultRes, options?: $protobuf.IConversionOptions): { [k: string]: any };

                /**
                 * Converts this ExecutionResultRes to JSON.
                 * @returns JSON object
                 */
                toJSON(): { [k: string]: any };
            }

            namespace ExecutionResultRes {

                /** Properties of an ExecutionResultRes. */
                interface $Properties {

                    /** ExecutionResultRes ret */
                    ret?: (number|null);

                    /** ExecutionResultRes error */
                    error?: (skynet.agent.v1.ErrorInfo.$Properties|null);

                    /** Unknown fields preserved while decoding when enabled */
                    $unknowns?: Uint8Array[];
                }

                /** Shape of an ExecutionResultRes. */
                type $Shape = skynet.agent.v1.ExecutionResultRes.$Properties;
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
