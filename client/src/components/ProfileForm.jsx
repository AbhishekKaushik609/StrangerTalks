import React from "react";

function ProfileForm({
  profile,
  setProfile,
  onSave,
  status
}) {
  const updateField = (event) => {
    setProfile({
      ...profile,
      [event.target.name]:
        event.target.value
    });
  };

  return (
    <section className="card profile-card">

      <div className="section-number">
        01 / PROFILE
      </div>

      <h2>
        Tell strangers what you know
      </h2>

      <p className="muted">
        Create an educational profile
        before starting a conversation.
      </p>

      <label>
        Name

        <input
          name="name"
          value={profile.name}
          onChange={updateField}
          placeholder="Your name"
        />
      </label>

      <div className="two-columns">

        <label>
          Role

          <select
            name="role"
            value={profile.role}
            onChange={updateField}
          >
            <option>
              Student
            </option>

            <option>
              Mentor
            </option>

            <option>
              Professional
            </option>

            <option>
              Explorer
            </option>
          </select>
        </label>

        <label>
          Education

          <input
            name="education"
            value={profile.education}
            onChange={updateField}
            placeholder="B.Tech CSE"
          />
        </label>

      </div>

      <label>
        Skills

        <input
          name="skills"
          value={profile.skills}
          onChange={updateField}
          placeholder="React, Node, DSA, AI..."
        />
      </label>

      <label>
        Interest

        <input
          name="interest"
          value={profile.interest}
          onChange={updateField}
          placeholder="React / Python / AI"
        />
      </label>

      <button
        className="btn primary"
        onClick={onSave}
      >
        ✓ Share Profile
      </button>

      <div className="profile-status">
        {status}
      </div>

    </section>
  );
}

export default ProfileForm;