use super::Input;
use futures_util::{SinkExt, StreamExt};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

pub fn validate_url(value: &str) -> Result<(), String> {
    let url = url::Url::parse(value).map_err(|_| "Agent WebSocket 地址无效")?;
    let loopback = matches!(
        url.host_str(),
        Some("localhost" | "127.0.0.1" | "::1" | "[::1]")
    );
    if !matches!(url.scheme(), "ws" | "wss") || (url.scheme() == "ws" && !loopback) {
        return Err("非回环 Agent WebSocket 必须使用 wss://".into());
    }
    if !url.username().is_empty() || url.password().is_some() || url.fragment().is_some() {
        return Err("Agent WebSocket 地址不能包含凭据或片段".into());
    }
    Ok(())
}

pub fn open(
    url: String,
    generation: u64,
    core: mpsc::UnboundedSender<Input>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let result = async {
            let (socket, _) = tokio::time::timeout(Duration::from_secs(10), tokio_tungstenite::connect_async(&url))
                .await.map_err(|_| "Agent 连接超时".to_string())?
                .map_err(|error| format!("Agent 连接失败: {error}"))?;
            let (mut writer, mut reader) = socket.split();
            let (tx, mut rx) = mpsc::unbounded_channel();
            if core.send(Input::Opened {generation, writer:tx}).is_err() { return Ok(()); }
            loop {
                tokio::select! {
                    frame = reader.next() => match frame {
                        Some(Ok(Message::Binary(frame))) => { if core.send(Input::Frame {generation, frame:frame.to_vec()}).is_err() { break; } }
                        Some(Ok(Message::Ping(payload))) => writer.send(Message::Pong(payload)).await.map_err(|error| error.to_string())?,
                        Some(Ok(Message::Pong(_))) => {},
                        Some(Ok(Message::Close(_))) | None => return Err("与 Agent 的连接已断开".into()),
                        Some(Ok(_)) => return Err("服务端消息不是二进制 Protobuf".into()),
                        Some(Err(error)) => return Err(format!("Agent 连接发生错误: {error}")),
                    },
                    frame = rx.recv() => match frame {
                        Some(frame) => writer.send(Message::Binary(frame.into())).await.map_err(|error| error.to_string())?,
                        None => { let _ = writer.close().await; break; }
                    }
                }
            }
            Ok::<(), String>(())
        }.await;
        let _ = core.send(Input::Closed {
            generation,
            error: result.err().unwrap_or_else(|| "Agent 连接已关闭".into()),
        });
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn keeps_the_web_transport_url_policy() {
        for url in [
            "ws://127.0.0.1:18787/agent",
            "ws://[::1]/agent",
            "wss://example.com/agent",
        ] {
            assert!(validate_url(url).is_ok());
        }
        for url in [
            "http://localhost/agent",
            "ws://example.com/agent",
            "wss://user:password@example.com/agent",
            "wss://example.com/agent#fragment",
        ] {
            assert!(validate_url(url).is_err());
        }
    }
}
