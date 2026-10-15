import type { LeaderboardMessage } from '@shared/types'

const PREVIEW: LeaderboardMessage = {
  top: [
    { nickname: 'Curious Otter', score: 4250, rank: 1 },
    { nickname: 'Swift Falcon', score: 3900, rank: 2 },
    { nickname: 'Bright Koala', score: 3100, rank: 3 },
    { nickname: 'Calm Heron', score: 2600, rank: 4 },
    { nickname: 'Bold Lynx', score: 1800, rank: 5 }
  ],
  playerCount: 24
}

/**
 * Competition standings, themed like the rest of the slide. With no live
 * data (the editor), shows a labelled sample so the instructor can see the
 * layout without a session running.
 */
export function LeaderboardView({ heading, data }: { heading?: string; data?: LeaderboardMessage | null }): JSX.Element {
  const preview = !data
  const board = data ?? PREVIEW
  const top = board.top[0]?.score || 1

  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 px-20 text-slide-fg">
      <div className="flex items-baseline justify-between">
        <h2 className="slide-h2">{heading || 'Leaderboard'}</h2>
        <span className="slide-small text-slide-muted">
          {preview ? 'Sample — live rankings appear when presenting' : `${board.playerCount} ${board.playerCount === 1 ? 'player' : 'players'}`}
        </span>
      </div>
      {board.top.length === 0 ? (
        <p className="slide-body text-slide-muted">Rankings appear here once the first scored question is revealed.</p>
      ) : (
        <ol className={`space-y-3 ${preview ? 'opacity-60' : ''}`} aria-label="Leaderboard">
          {board.top.map((entry) => (
            <li key={`${entry.rank}-${entry.nickname}`} className="relative flex items-center gap-5 overflow-hidden rounded-xl bg-slide-fg/5 px-5 py-3">
              <div
                className="absolute inset-y-0 left-0 bg-slide-accent/20 transition-all duration-700"
                style={{ width: `${Math.max(4, (entry.score / top) * 100)}%` }}
                aria-hidden="true"
              />
              <span
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${
                  entry.rank === 1 ? 'bg-slide-accent text-black' : 'bg-slide-fg/10'
                }`}
              >
                {entry.rank}
              </span>
              <span className="slide-body relative flex-1 truncate font-semibold">{entry.nickname}</span>
              <span className="slide-body relative tabular-nums text-slide-muted">{entry.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
