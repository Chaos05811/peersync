import { customAlphabet } from "nanoid";

const colors = [
  "#e76f51",
  "#2a9d8f",
  "#457b9d",
  "#7b2cbf",
  "#ef476f",
  "#3a86ff",
  "#ff9f1c",
  "#5f0f40"
];

const firstNames = [
  "Ava",
  "Liam",
  "Maya",
  "Noah",
  "Zara",
  "Arjun",
  "Ivy",
  "Leo"
];

const lastNames = [
  "Shah",
  "Patel",
  "Khan",
  "Rao",
  "Mehta",
  "Singh",
  "Brown",
  "Clark"
];

const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

function hash(value) {
  return Array.from(value).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 1),
    0
  );
}

export function createRoomCode() {
  return roomCode();
}

export function createUserProfile() {
  const seed =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  const seedValue = hash(seed);

  return {
    name: `${firstNames[seedValue % firstNames.length]} ${
      lastNames[(seedValue * 3) % lastNames.length]
    }`,
    color: colors[(seedValue * 7) % colors.length]
  };
}
