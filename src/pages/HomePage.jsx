import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createRoomCode } from "../lib/session";

export function HomePage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const sampleCode = useMemo(() => createRoomCode(), []);

  const joinRoom = () => {
    const nextRoom = roomCode.trim().toUpperCase();
    if (!nextRoom) {
      return;
    }
    navigate(`/room/${nextRoom}`);
  };

  return (
    <main className="home-shell">
      <section className="home-panel">
        <div className="brand-mark">PS</div>
        <h1>PeerSync</h1>
        <p className="home-copy">
          Create a room, share the code, and edit the same document together in
          real time.
        </p>

        <div className="home-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate(`/room/${createRoomCode()}`)}
          >
            Create New Document
          </button>

          <div className="join-card">
            <label className="input-label" htmlFor="room-code">
              Join with room code
            </label>
            <div className="join-row">
              <input
                id="room-code"
                className="room-input"
                value={roomCode}
                maxLength={20}
                onChange={(event) => setRoomCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    joinRoom();
                  }
                }}
                placeholder={`Example: ${sampleCode}`}
              />
              <button className="secondary-button" type="button" onClick={joinRoom}>
                Join
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
