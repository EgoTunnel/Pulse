import { useState } from 'react'

export function JoinForm({
  initialCode,
  error,
  onJoin
}: {
  initialCode: string
  error: string | null
  onJoin: (code: string) => void
}): JSX.Element {
  const [code, setCode] = useState(initialCode)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pulse-600 px-6 text-center">
      <div aria-hidden="true" className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-pulse-600">
        P
      </div>
      <h1 className="mb-1 text-2xl font-bold text-white">Join the class</h1>
      <p id="join-instructions" className="mb-8 text-sm text-pulse-100">
        Enter the code your instructor is showing.
      </p>
      <form
        className="w-full max-w-xs"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim()) onJoin(code.trim())
        }}
      >
        <label htmlFor="room-code" className="sr-only">
          Room code
        </label>
        <input
          id="room-code"
          autoFocus
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123 456"
          aria-describedby="join-instructions"
          className="mb-4 w-full rounded-2xl border-2 border-white/40 bg-white/10 px-4 py-4 text-center text-3xl font-bold tracking-widest text-white placeholder-white/40 outline-none focus:border-white"
        />
        {error && (
          <p role="alert" className="mb-4 text-sm font-medium text-white">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-2xl bg-white py-4 text-lg font-semibold text-pulse-600 shadow-lg active:scale-[0.98]"
        >
          Join
        </button>
      </form>
    </div>
  )
}
