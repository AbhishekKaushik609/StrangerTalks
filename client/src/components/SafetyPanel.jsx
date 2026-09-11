import React, {
  useState
} from "react";

function SafetyPanel({
  onReport,
  onBlock
}) {
  const [showTools, setShowTools] =
    useState(false);

  const reportUser = () => {
    onReport(
      "User reported from StragerMentor"
    );

    alert(
      "Report submitted for this demo."
    );
  };

  const blockUser = () => {
    onBlock();

    alert(
      "User blocked for this demo."
    );
  };

  return (
    <section className="card safety-card">

      <div>

        <div className="section-number">
          06 / SAFETY
        </div>

        <h2>
          Stay safe with strangers
        </h2>

        <p>
          Never share passwords, OTPs,
          bank details or private
          documents.
        </p>

      </div>

      <button
        className="btn secondary"
        onClick={() =>
          setShowTools(
            !showTools
          )
        }
      >
        ⚑ Safety Tools
      </button>

      {showTools && (
        <div className="safety-tools">

          <button
            className="btn danger"
            onClick={reportUser}
          >
            Report
          </button>

          <button
            className="btn secondary"
            onClick={blockUser}
          >
            Block
          </button>

        </div>
      )}

    </section>
  );
}

export default SafetyPanel;