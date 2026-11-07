use prost::Message;

pub mod pb {
    include!(concat!(env!("OUT_DIR"), "/skynet.agent.v1.rs"));
}

pub const HEADER_SIZE: usize = 9;
pub fn hash(name: &str) -> u32 {
    format!("skynet.agent.v1.{name}")
        .bytes()
        .fold(0x811c9dc5u32, |value, byte| {
            (value ^ u32::from(byte)).wrapping_mul(0x01000193)
        })
}

pub fn encode(id: u32, name: &str, payload: &impl Message) -> Vec<u8> {
    let mut frame = Vec::with_capacity(HEADER_SIZE + payload.encoded_len());
    frame.push(0);
    frame.extend_from_slice(&id.to_be_bytes());
    frame.extend_from_slice(&hash(name).to_be_bytes());
    payload.encode(&mut frame).expect("编码到内存失败");
    frame
}

#[derive(Debug)]
pub enum Server {
    Login(pb::LoginRes),
    Snapshot(pb::UserSnapshotRes),
    Create(pb::SessionCreateRes),
    Send(pb::MessageSendRes),
    Cancel(pb::MessageCancelRes),
    Session(pb::SessionUpdatedNtf),
    Delta(pb::MessageDeltaNtf),
}
impl Server {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Login(_) => "LoginRes",
            Self::Snapshot(_) => "UserSnapshotRes",
            Self::Create(_) => "SessionCreateRes",
            Self::Send(_) => "MessageSendRes",
            Self::Cancel(_) => "MessageCancelRes",
            Self::Session(_) => "SessionUpdatedNtf",
            Self::Delta(_) => "MessageDeltaNtf",
        }
    }
}

pub fn decode(frame: &[u8]) -> Result<(u32, Server), String> {
    if frame.len() < HEADER_SIZE || frame[0] != 0 {
        return Err("Agent 二进制消息头无效".into());
    }
    let id = u32::from_be_bytes(frame[1..5].try_into().unwrap());
    let type_hash = u32::from_be_bytes(frame[5..9].try_into().unwrap());
    let payload = &frame[9..];
    macro_rules! message {
        ($name:ident, $variant:ident) => {
            if type_hash == hash(stringify!($name)) {
                let message = pb::$name::decode(payload)
                    .map_err(|error| format!("Agent Protobuf 解码失败: {error}"))?;
                let notification = matches!(stringify!($variant), "Session" | "Delta");
                if (id == 0) != notification {
                    return Err("Agent 消息方向或请求编号无效".into());
                }
                return Ok((id, Server::$variant(message)));
            }
        };
    }
    message!(LoginRes, Login);
    message!(UserSnapshotRes, Snapshot);
    message!(SessionCreateRes, Create);
    message!(MessageSendRes, Send);
    message!(MessageCancelRes, Cancel);
    message!(SessionUpdatedNtf, Session);
    message!(MessageDeltaNtf, Delta);
    Err(format!("未知 Agent 响应哈希: {type_hash}"))
}

pub fn check(ret: i32, error: Option<&pb::ErrorInfo>) -> Result<(), String> {
    if ret == 1 {
        return Ok(());
    }
    Err(response_error(ret, error, "Agent 请求失败"))
}
pub fn response_error(ret: i32, error: Option<&pb::ErrorInfo>, fallback: &str) -> String {
    let message = error
        .map(|error| error.message.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback);
    format!("错误码 {ret}：{message}")
}

#[cfg(test)]
mod tests {
    use super::*;
    fn vectors() -> serde_json::Value {
        serde_json::from_str(include_str!(
            "../../../../common/proto/testdata/protocol_vectors.json"
        ))
        .unwrap()
    }
    fn hex(bytes: &[u8]) -> String {
        bytes.iter().map(|byte| format!("{byte:02x}")).collect()
    }
    fn unhex(value: &str) -> Vec<u8> {
        (0..value.len())
            .step_by(2)
            .map(|index| u8::from_str_radix(&value[index..index + 2], 16).unwrap())
            .collect()
    }
    #[test]
    fn shared_vectors_match_hashes_and_complete_frames() {
        let vectors = vectors();
        assert_eq!(
            hash("LoginReq"),
            vectors["hashes"]["login_req"].as_u64().unwrap() as u32
        );
        assert_eq!(
            hex(&encode(
                1,
                "LoginReq",
                &pb::LoginReq {
                    username: "alice".into()
                }
            )),
            vectors["frames"]["login_request"].as_str().unwrap()
        );
        assert_eq!(
            hex(&encode(
                2,
                "MessageSendReq",
                &pb::MessageSendReq {
                    session_id: "session-1".into(),
                    text: "你好".into(),
                    retry_run_id: String::new()
                }
            )),
            vectors["frames"]["message_send"].as_str().unwrap()
        );
        for (name, value) in vectors["frames"].as_object().unwrap() {
            if matches!(name.as_str(), "login_request" | "message_send") {
                continue;
            }
            decode(&unhex(value.as_str().unwrap())).unwrap();
        }
    }
    #[test]
    fn rejects_damaged_compressed_and_wrong_direction_frames() {
        assert!(decode(&[0; 8]).is_err());
        assert!(decode(&encode(1, "LoginReq", &pb::LoginReq::default())).is_err());
        assert!(decode(&encode(0, "LoginRes", &pb::LoginRes::default())).is_err());
        assert!(decode(&encode(
            1,
            "MessageDeltaNtf",
            &pb::MessageDeltaNtf::default()
        ))
        .is_err());
        let mut frame = encode(1, "LoginRes", &pb::LoginRes::default());
        frame[0] = 1;
        assert!(decode(&frame).is_err());
        assert!(check(17, None).unwrap_err().contains("错误码 17"));
    }
}
