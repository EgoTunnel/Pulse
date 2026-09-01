import { networkInterfaces } from 'node:os'

/** Best-guess LAN-reachable IPv4 address for this machine, so phones on the same Wi-Fi can reach the local server. */
export function getLocalNetworkAddress(): string | null {
  const interfaces = networkInterfaces()
  const candidates: string[] = []

  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name]
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue
      candidates.push(addr.address)
    }
  }

  if (candidates.length === 0) return null

  // Prefer common private-LAN ranges over VPN/virtual adapters where possible.
  const preferred = candidates.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.'))
  return preferred ?? candidates[0]
}
