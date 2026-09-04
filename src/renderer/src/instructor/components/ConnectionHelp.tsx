interface Props {
  /** Hide the "test ahead of time" tip when this content is already shown inside that test. */
  showTestTip?: boolean
}

export function ConnectionHelp({ showTestTip = true }: Props): JSX.Element {
  return (
    <div className="text-left">
      <p className="mb-4 text-sm text-slate-300">
        Your QR code and room code are working correctly — this computer just can't be reached from other devices on
        this network right now. That's almost always one of three things:
      </p>

      <ol className="mb-4 space-y-3">
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">1. Check you're on the same network</p>
          <p className="mt-1 text-sm text-slate-400">
            Many campuses run several Wi-Fi networks (eduroam, a guest network, a residence network) that don't
            connect to each other. Make sure the test device is on the exact same one as this computer.
          </p>
        </li>
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">2. This computer's own firewall may be blocking it</p>
          <p className="mt-1 text-sm text-slate-400">
            Windows sometimes asks "Allow this app through the firewall?" the first time Pulse starts a session — if
            you clicked <strong>Cancel</strong>, or the network is set to <strong>Public</strong> rather than{' '}
            <strong>Private</strong>, incoming connections get blocked automatically. Check Windows Firewall settings
            (or your Mac's equivalent) and allow Pulse, or switch the network to Private.
          </p>
        </li>
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">3. The network itself may be blocking device-to-device connections</p>
          <p className="mt-1 text-sm text-slate-400">
            A security feature called <strong className="text-slate-100">client isolation</strong>, which many campus
            networks (including eduroam) turn on by default. Unlike the first two, this one isn't something you can
            fix from this computer.
          </p>
        </li>
      </ol>

      <p className="mb-2 text-sm font-medium text-slate-300">If none of that's it, here's what actually works:</p>
      <ol className="mb-4 space-y-3">
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">Use a personal phone hotspot (most reliable fix)</p>
          <p className="mt-1 text-sm text-slate-400">
            Turn on your phone's personal hotspot, connect this computer to it instead of the campus network, then
            start the session again. Students still connect over Wi-Fi — just yours instead of the campus one.
          </p>
        </li>
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">Ask your IT department</p>
          <p className="mt-1 text-sm text-slate-400">
            Request that client/AP isolation be disabled for your classroom's network, or ask for a dedicated access
            point for polling tools like this one.
          </p>
        </li>
        <li className="rounded-lg bg-white/5 p-3">
          <p className="text-sm font-semibold text-white">Try a dedicated travel router</p>
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
