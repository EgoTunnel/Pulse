// Leaderboard nicknames. Students are auto-assigned a random, friendly name
// so competitions work with zero extra steps — keeping the "scan, join,
// respond" flow — and nobody's real name has to appear on the projector.
// They can pick their own instead; either way it lives only in server
// memory for the session and is never saved.

const ADJECTIVES = [
  'Curious', 'Brave', 'Clever', 'Swift', 'Calm', 'Bold', 'Bright', 'Witty', 'Mighty', 'Lucky',
  'Quiet', 'Sunny', 'Daring', 'Gentle', 'Jolly', 'Keen', 'Nimble', 'Plucky', 'Sharp', 'Zesty'
]

const ANIMALS = [
  'Otter', 'Falcon', 'Panda', 'Fox', 'Koala', 'Lynx', 'Heron', 'Badger', 'Dolphin', 'Owl',
  'Tiger', 'Moose', 'Gecko', 'Raven', 'Bison', 'Puffin', 'Lemur', 'Orca', 'Hedgehog', 'Yak'
]

export const MAX_NICKNAME_LENGTH = 20

export function randomNickname(rand: () => number = Math.random): string {
  const a = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]
  const b = ANIMALS[Math.floor(rand() * ANIMALS.length)]
  return `${a} ${b}`
}
