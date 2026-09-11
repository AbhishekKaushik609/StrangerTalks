import React, {
  useState
} from "react";

import { socket } from "../services/socket";

function ChatPanel({
  room,
  peer,
  messages,
  typing
}) {
  const [text, setText] =
    useState("");

  const sendMessage = () => {
    if (!room) {
      return;
    }

    if (!text.trim()) {
      return;
    }

    socket.emit(
      "chat:message",
      {
        room,
        text
      }
    );

    setText("");

    socket.emit(
      "chat:typing",
      {
        room,
        typing: false
      }
    );
  };

  const handleTyping = (value) => {
    setText(value);

    socket.emit(
      "chat:typing",
      {
        room,
        typing: Boolean(value)
      }
    );
  };

  return (
    <section className="card chat-card">

      <div className="chat-header">

        <div>

          <div className="section-number">
            03 / CHAT
          </div>

          <h2>
            {peer
              ? peer.name
              : "Waiting for a stranger"}
          </h2>

        </div>

        <span
          className={
            peer
              ? "live-badge"
              : "offline-badge"
          }
        >
          {peer
            ? "LIVE"
            : "OFFLINE"}
        </span>

      </div>

      {peer && (
        <div className="peer-information">

          <span>
            {peer.role}
          </span>

          <span>
            {peer.education ||
              "Education not added"}
          </span>

          <span>
            {peer.skills ||
              "Skills not added"}
          </span>

        </div>
      )}

      <div className="messages-container">

        {messages.length === 0 ? (

          <div className="empty-chat">

            Your conversation will
            appear here.

            <br />

            Say hello and exchange
            knowledge.

          </div>

        ) : (

          messages.map(
            (message, index) => (

              <div
                key={
                  message.id ||
                  index
                }
                className={
                  `message ${
                    message.senderId ===
                    socket.id
                      ? "my-message"
                      : ""
                  }`
                }
              >

                <small>
                  {message.senderName}
                </small>

                <div>
                  {message.text}
                </div>

              </div>

            )
          )

        )}

      </div>

      <div className="typing-indicator">
        {typing
          ? "Stranger is typing..."
          : ""}
      </div>

      <div className="composer">

        <input
          value={text}
          disabled={!room}
          onChange={(event) =>
            handleTyping(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter"
            ) {
              sendMessage();
            }
          }}
          placeholder={
            room
              ? "Write a message..."
              : "Find a stranger first"
          }
        />

        <button
          className="btn primary"
          disabled={!room}
          onClick={sendMessage}
        >
          Send
        </button>

      </div>

    </section>
  );
}

export default ChatPanel;