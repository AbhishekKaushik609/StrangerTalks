import React, {
  useEffect,
  useRef,
  useState
} from "react";

import { socket } from "../services/socket";

function VideoPanel({
  room,
  peer
}) {
  const localVideo =
    useRef(null);

  const remoteVideo =
    useRef(null);

  const peerConnection =
    useRef(null);

  const localStream =
    useRef(null);

  const [videoStarted, setVideoStarted] =
    useState(false);

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | CREATE PEER CONNECTION
  |--------------------------------------------------------------------------
  */

  const createPeerConnection = () => {
    if (peerConnection.current) {
      return peerConnection.current;
    }

    const pc =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302"
          }
        ]
      });

    peerConnection.current = pc;

    pc.ontrack = (event) => {
      if (
        remoteVideo.current
      ) {
        remoteVideo.current.srcObject =
          event.streams[0];
      }
    };

    pc.onicecandidate = (
      event
    ) => {
      if (
        event.candidate &&
        room
      ) {
        socket.emit(
          "webrtc:ice",
          {
            room,
            candidate:
              event.candidate
          }
        );
      }
    };

    return pc;
  };

  /*
  |--------------------------------------------------------------------------
  | START VIDEO
  |--------------------------------------------------------------------------
  */

  const startVideo = async () => {
    try {
      setError("");

      if (!peer) {
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: true,
            audio: true
          }
        );

      localStream.current =
        stream;

      if (localVideo.current) {
        localVideo.current.srcObject =
          stream;
      }

      const pc =
        createPeerConnection();

      stream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(
            track,
            stream
          );
        });

      setVideoStarted(true);

      /*
      Only create offer from one side.
      */

      const offer =
        await pc.createOffer();

      await pc.setLocalDescription(
        offer
      );

      socket.emit(
        "webrtc:offer",
        {
          room,
          offer
        }
      );

    } catch (error) {
      console.error(error);

      setError(
        "Camera or microphone permission was denied."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | WEBRTC EVENTS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleOffer =
      async ({ offer }) => {
        try {
          const pc =
            createPeerConnection();

          if (
            localStream.current
          ) {
            localStream.current
              .getTracks()
              .forEach((track) => {
                const alreadyAdded =
                  pc
                    .getSenders()
                    .some(
                      (sender) =>
                        sender.track ===
                        track
                    );

                if (!alreadyAdded) {
                  pc.addTrack(
                    track,
                    localStream.current
                  );
                }
              });
          }

          await pc.setRemoteDescription(
            offer
          );

          const answer =
            await pc.createAnswer();

          await pc.setLocalDescription(
            answer
          );

          socket.emit(
            "webrtc:answer",
            {
              room,
              answer
            }
          );
        } catch (error) {
          console.error(error);
        }
      };

    const handleAnswer =
      async ({ answer }) => {
        if (
          peerConnection.current
        ) {
          await peerConnection.current
            .setRemoteDescription(
              answer
            );
        }
      };

    const handleIce =
      async ({ candidate }) => {
        try {
          if (
            peerConnection.current
          ) {
            await peerConnection.current
              .addIceCandidate(
                candidate
              );
          }
        } catch (error) {
          console.error(error);
        }
      };

    socket.on(
      "webrtc:offer",
      handleOffer
    );

    socket.on(
      "webrtc:answer",
      handleAnswer
    );

    socket.on(
      "webrtc:ice",
      handleIce
    );

    return () => {
      socket.off(
        "webrtc:offer",
        handleOffer
      );

      socket.off(
        "webrtc:answer",
        handleAnswer
      );

      socket.off(
        "webrtc:ice",
        handleIce
      );
    };
  }, [room]);

  /*
  |--------------------------------------------------------------------------
  | MICROPHONE
  |--------------------------------------------------------------------------
  */

  const toggleMicrophone =
    () => {
      if (
        !localStream.current
      ) {
        return;
      }

      const audioTracks =
        localStream.current
          .getAudioTracks();

      audioTracks.forEach(
        (track) => {
          track.enabled =
            !track.enabled;

          setMicEnabled(
            track.enabled
          );
        }
      );
    };

  /*
  |--------------------------------------------------------------------------
  | STOP
  |--------------------------------------------------------------------------
  */

  const stopVideo = () => {
    if (
      localStream.current
    ) {
      localStream.current
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );
    }

    if (peerConnection.current) {
      peerConnection.current.close();

      peerConnection.current =
        null;
    }

    if (localVideo.current) {
      localVideo.current.srcObject =
        null;
    }

    if (remoteVideo.current) {
      remoteVideo.current.srcObject =
        null;
    }

    localStream.current =
      null;

    setVideoStarted(false);
  };

  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, []);

  return (
    <section className="card video-card">

      <div className="section-number">
        04 / VIDEO ROOM
      </div>

      <h2>
        Face-to-face learning
      </h2>

      <div className="video-container">

        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="remote-video"
        />

        <video
          ref={localVideo}
          autoPlay
          muted
          playsInline
          className="local-video"
        />

        {!peer && (
          <div className="video-placeholder">
            Connect with a stranger
            to start video.
          </div>
        )}

      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="video-controls">

        {!videoStarted ? (

          <button
            className="btn primary"
            disabled={!peer}
            onClick={startVideo}
          >
            📹 Start Video
          </button>

        ) : (

          <>
            <button
              className="btn secondary"
              onClick={
                toggleMicrophone
              }
            >
              {micEnabled
                ? "🎙 Microphone"
                : "🔇 Muted"}
            </button>

            <button
              className="btn danger"
              onClick={stopVideo}
            >
              End Video
            </button>
          </>

        )}

      </div>

    </section>
  );
}

export default VideoPanel;