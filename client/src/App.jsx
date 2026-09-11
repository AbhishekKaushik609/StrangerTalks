import React, {
  useEffect,
  useState
} from "react";

import { socket } from "./services/socket";

import ProfileForm from "./components/ProfileForm";
import MatchPanel from "./components/MatchPanel";
import ChatPanel from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";
import GroupPanel from "./components/GroupPanel";
import SafetyPanel from "./components/SafetyPanel";

const initialProfile = {
  name: "",
  role: "Student",
  education: "",
  skills: "",
  interest: ""
};

function App() {
  const [
    profile,
    setProfile
  ] = useState(initialProfile);

  const [online, setOnline] =
    useState(0);

  const [peer, setPeer] =
    useState(null);

  const [room, setRoom] =
    useState("");

  const [mode, setMode] =
    useState("mentor");

  const [status, setStatus] =
    useState("Create your profile");

  const [
    messages,
    setMessages
  ] = useState([]);

  const [typing, setTyping] =
    useState(false);

  const [group, setGroup] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | SOCKET EVENTS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    socket.on(
      "presence:update",
      (data) => {
        setOnline(data.online);
      }
    );

    socket.on(
      "profile:ready",
      () => {
        setStatus(
          "Online • Ready to match"
        );
      }
    );

    socket.on(
      "match:waiting",
      () => {
        setStatus(
          "Searching for a stranger..."
        );
      }
    );

    socket.on(
      "match:found",
      (data) => {
        setRoom(data.room);

        setPeer(data.peer);

        setMessages([]);

        setStatus(
          "Connected with stranger"
        );
      }
    );

    socket.on(
      "match:left",
      () => {
        setPeer(null);

        setRoom("");

        setMessages([]);

        setStatus(
          "Stranger left the chat"
        );
      }
    );

    socket.on(
      "chat:message",
      (message) => {
        setMessages(
          (oldMessages) => [
            ...oldMessages,
            message
          ]
        );
      }
    );

    socket.on(
      "chat:typing",
      (data) => {
        setTyping(data.typing);
      }
    );

    socket.on(
      "group:created",
      (data) => {
        setGroup(data);
      }
    );

    socket.on(
      "group:joined",
      (data) => {
        setGroup(data);
      }
    );

    socket.on(
      "group:update",
      (data) => {
        setGroup(data);
      }
    );

    return () => {
      socket.removeAllListeners();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | PROFILE
  |--------------------------------------------------------------------------
  */

  const saveProfile = () => {
    if (!profile.name.trim()) {
      setStatus(
        "Please enter your name"
      );

      return;
    }

    socket.emit(
      "profile:join",
      profile
    );
  };

  /*
  |--------------------------------------------------------------------------
  | FIND
  |--------------------------------------------------------------------------
  */

  const findStranger = () => {
    setPeer(null);

    setRoom("");

    setMessages([]);

    setStatus(
      "Searching for a stranger..."
    );

    socket.emit(
      "match:find",
      {
        mode,
        interest: profile.interest
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | NEXT
  |--------------------------------------------------------------------------
  */

  const nextStranger = () => {
    socket.emit(
      "match:leave"
    );

    setPeer(null);

    setRoom("");

    setMessages([]);

    setTimeout(() => {
      findStranger();
    }, 200);
  };

  return (
    <div className="app">

      <div className="background-glow glow-one" />

      <div className="background-glow glow-two" />

      {/* HEADER */}

      <header className="topbar">

        <div className="brand">
          <span>✦</span>

          Strager

          <strong>
            Mentor
          </strong>
        </div>

        <div className="online-status">
          <span>●</span>

          {online} online

          <small>
            RAM mode
          </small>
        </div>

      </header>

      {/* MAIN */}

      <main>

        <section className="hero">

          <div className="eyebrow">
            MEET • LEARN • COMMUNICATE • BUILD
          </div>

          <h1>
            Random people.
            <br />

            <em>
              Real learning.
            </em>
          </h1>

          <p>
            Find a mentor, meet a peer,
            start a video conversation,
            or create a temporary team
            with strangers who share your
            interests.
          </p>

        </section>

        {/* GRID */}

        <div className="dashboard-grid">

          <ProfileForm
            profile={profile}
            setProfile={setProfile}
            onSave={saveProfile}
            status={status}
          />

          <MatchPanel
            mode={mode}
            setMode={setMode}
            onFind={findStranger}
            onNext={nextStranger}
            connected={Boolean(peer)}
          />

          <ChatPanel
            room={room}
            peer={peer}
            messages={messages}
            typing={typing}
          />

          <VideoPanel
            room={room}
            peer={peer}
          />

          <GroupPanel
            group={group}
          />

          <SafetyPanel
            onReport={(reason) => {
              socket.emit(
                "report",
                { reason }
              );
            }}
            onBlock={() => {
              socket.emit(
                "block",
                {
                  peerId: peer?.id
                }
              );
            }}
          />

        </div>

      </main>

      <footer>
        StragerMentor • Educational
        connections • Stay respectful
      </footer>

    </div>
  );
}

export default App;