import React from "react";

function MatchPanel({
  mode,
  setMode,
  onFind,
  onNext,
  connected
}) {
  const modes = [
    {
      id: "mentor",
      icon: "🎓",
      title: "Mentor",
      text: "Learn from someone"
    },
    {
      id: "peer",
      icon: "⚡",
      title: "Peer",
      text: "Practice together"
    },
    {
      id: "team",
      icon: "👥",
      title: "Team",
      text: "Build a squad"
    }
  ];

  return (
    <section className="card match-card">

      <div className="section-number">
        02 / DISCOVER
      </div>

      <h2>
        Who do you want to meet?
      </h2>

      <div className="mode-grid">

        {modes.map((item) => (
          <button
            key={item.id}
            className={
              `mode-button ${
                mode === item.id
                  ? "selected"
                  : ""
              }`
            }
            onClick={() =>
              setMode(item.id)
            }
          >

            <strong>
              {item.icon} {item.title}
            </strong>

            <small>
              {item.text}
            </small>

          </button>
        ))}

      </div>

      <div className="radar">

        <div className="radar-ring ring-one" />

        <div className="radar-ring ring-two" />

        <div className="radar-core">
          ✦
        </div>

      </div>

      <p className="match-status">
        {connected
          ? "● Connected"
          : "Find someone with similar interests"}
      </p>

      <div className="match-actions">

        <button
          className="btn primary"
          onClick={onFind}
        >
          {connected
            ? "Find another"
            : "Find a stranger"}

          {" "}→
        </button>

        {connected && (
          <button
            className="btn secondary"
            onClick={onNext}
          >
            Skip
          </button>
        )}

      </div>

    </section>
  );
}

export default MatchPanel;