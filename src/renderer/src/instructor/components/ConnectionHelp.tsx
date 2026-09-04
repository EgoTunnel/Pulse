interface Props {
  /** Hide the "test ahead of time" tip when this content is already shown inside that test. */
  showTestTip?: boolean
}

export function ConnectionHelp({ showTestTip = true }: Props): JSX.Element {
  return (
    <div className="text-left">
      <p className="mb-4 text-sm text-slate-300">
        This usually means the Wi-Fi network is blocking phones and laptops from reaching each other directly — a
        security feature called <strong className="text-slate-100">client isolation</strong> that many campus
        networks (including eduroam) turn on by default. Your QR code and room code are working correctly; devices
        on this network just can't reach this computer over it.
      </p>

      <ol className="mb-4 space-y-3">
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">1. Use a personal phone hotspot (most reliable fix)</p>
          <p className="mt-1 text-sm text-slate-400">
            Turn on your phone's personal hotspot, connect this computer to it instead of the campus network, then
            start the session again. Students still connect over Wi-Fi — just yours instead of the campus one.
          </p>
        </li>
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">2. Ask your IT department</p>
          <p className="mt-1 text-sm text-slate-400">
            Request that client/AP isolation be disabled for your classroom's network, or ask for a dedicated access
            point for polling tools like this one.
          </p>
        </li>
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">3. Try a dedicated travel router</p>
          <p className="mt-1 text-sm text-slate-400">
            If your department has one, plug it into a wired connection in the room and broadcast your own Wi-Fi
            network from it.
          </p>
        </li>
      </ol>

      {showTestTip && (
        <p className="text-xs text-slate-500">
          Next time, check this ahead of class from the Library screen — <strong>Test connection</strong> — so you
          find out before you're in front of students, not during.
        </p>
      )}
    </div>
  )
}
