import React, {
  useEffect,
  useState
} from "react";

import { socket } from "../services/socket";

function GroupPanel({ group }) {
  const [groupName, setGroupName] =
    useState(
      "React Study Squad"
    );

  const [roomCode, setRoomCode] =
    useState("");

  const [text, setText] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  useEffect(() => {
    const receiveMessage =
      (message) => {
        setMessages(
          (oldMessages) => [
            ...oldMessages,
            message
          ]
        );
      };

    socket.on(
      "group:message",
      receiveMessage
    );

    return () => {
      socket.off(
        "group:message",
        receiveMessage
      );
    };
  }, []);

  const createGroup = () => {
    socket.emit(
      "group:create",
      {
        name: groupName
      }
    );
  };

  const joinGroup = () => {
    if (!roomCode.trim()) {
      return;
    }

    socket.emit(
      "group:join",
      {
        code: roomCode
      }
    );
  };

  const sendMessage = () => {
    if (!group) {
      return;
    }

    if (!text.trim()) {
      return;
    }

    socket.emit(
      "group:message",
      {
        code: group.code,
        text
      }
    );

    setText("");
  };

  return (
    <section className="card group-card">

      <div className="section-number">
        05 / TEAM LAB
      </div>

      <h2>
        Create your temporary team
      </h2>

      <p className="muted">
        Build a study group or project
        team with strangers.
      </p>

      <div className="group-create">

        <input
          value={groupName}
          onChange={(event) =>
            setGroupName(
              event.target.value
            )
          }
          placeholder="Group name"
        />

        <button
          className="btn primary"
          onClick={createGroup}
        >
          Create
        </button>

      </div>

      <div className="group-join">

        <input
          value={roomCode}
          onChange={(event) =>
            setRoomCode(
              event.target.value
                .toUpperCase()
            )
          }
          placeholder="Enter room code"
        />

        <button
          className="btn secondary"
          onClick={joinGroup}
        >
          Join
        </button>

      </div>

      {group && (
        <div className="group-room">

          <div className="group-header">

            <div>

              <strong>
                {group.name}
              </strong>

              <span>
                Room Code:
                {" "}
                <b>
                  {group.code}
                </b>
              </span>

            </div>

            <span>
              👥 {group.members || 1}
            </span>

          </div>

          <div className="group-messages">

            {messages.map(
              (message, index) => (
                <div
                  key={index}
                  className="group-message"
                >
                  <b>
                    {message.senderName}:
                  </b>

                  {" "}

                  {message.text}
                </div>
              )
            )}

          </div>

          <div className="composer">

            <input
              value={text}
              onChange={(event) =>
                setText(
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
              placeholder="Message team..."
            />

            <button
              className="btn primary"
              onClick={sendMessage}
            >
              Send
            </button>

          </div>

        </div>
      )}

    </section>
  );
}

export default GroupPanel;