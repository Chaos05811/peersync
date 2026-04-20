import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";

import { auth } from "./firebase";

const colors = [
  "#e76f51",
  "#2a9d8f",
  "#457b9d",
  "#3a86ff",
  "#8d5cf6",
  "#ef476f",
  "#f4a261",
  "#2b9348"
];

function hashValue(value) {
  return Array.from(value).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 17),
    0
  );
}

export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

export function buildPresenceProfile(user) {
  const seed = user?.uid || user?.email || user?.displayName || "peersync";
  const name =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "PeerSync User";

  return {
    color: colors[hashValue(seed) % colors.length],
    name
  };
}

export function useAuthUser() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setAuthUser(nextUser);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  return useMemo(
    () => ({
      authReady,
      authUser
    }),
    [authReady, authUser]
  );
}

export function getRoomFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("room") || "").trim().toUpperCase();
}

export function openRoom(roomCode) {
  const room = roomCode.trim().toUpperCase();
  if (!room) {
    return;
  }
  window.location.href = `/app.html?room=${encodeURIComponent(room)}`;
}

export function getCleanRoomPath(roomCode) {
  return `${window.location.origin}/room/${encodeURIComponent(
    roomCode.trim().toUpperCase()
  )}`;
}
