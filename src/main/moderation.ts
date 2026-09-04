import { Filter } from 'bad-words'

// A maintained, offline, English-language profanity wordlist — no network
// calls, matching the local-first architecture. This is a blunt instrument
// (word-list matching misses creative evasion, and can false-positive on
// otherwise-innocent words), which is why it's paired with a fast manual
// removal control in the presenter UI rather than relied on alone. See
// ResultsView's onRemoveResponse/onBanWord.
const filter = new Filter()

export function isProfane(text: string): boolean {
  return filter.isProfane(text)
}
