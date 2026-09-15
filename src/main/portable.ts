import { app } from 'electron'
import path from 'node:path'

/**
 * Detects whether Pulse is running as a portable build — a single
 * executable meant to run straight off a USB drive with no install step —
 * and, if so, where its data should live: a folder right next to the
 * executable/AppImage/app bundle, so the whole thing (app + an instructor's
 * presentations) travels together on the drive. Returns null for a normal
 * installed build, where data belongs in the OS's usual per-user locations
 * instead (see PresentationStore).
 */
export function getPortableDataDir(): string | null {
  // Windows: electron-builder's "portable" NSIS target extracts the app to
  // a temp directory on every launch and sets this env var to the
  // *original* directory the portable .exe itself lives in. Writing there
  // instead of the temp extraction dir is what makes data survive between
  // launches and travel with the drive.
  if (process.platform === 'win32' && process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'Pulse Data')
  }

  // Linux: AppImage sets this to the .AppImage file's own path — no
  // extraction step to work around, just park data beside it.
  if (process.platform === 'linux' && process.env.APPIMAGE) {
    return path.join(path.dirname(process.env.APPIMAGE), 'Pulse Data')
  }

  // macOS: there's no separate "portable" build target — a .app bundle is
  // already the whole self-contained unit. "Portable" here just means
  // "not installed to /Applications," most commonly because it's running
  // straight off a mounted USB drive. The bundle itself is read-only (and
  // unsigned besides), so data goes in its parent folder, not inside it.
  if (process.platform === 'darwin' && app.isPackaged) {
    const bundleDir = getMacBundleDir(app.getPath('exe'))
    if (bundleDir && !bundleDir.startsWith('/Applications/')) {
      return path.join(path.dirname(bundleDir), 'Pulse Data')
    }
  }

  return null
}

function getMacBundleDir(exePath: string): string | null {
  let dir = path.dirname(exePath)
  while (dir !== path.dirname(dir)) {
    if (dir.endsWith('.app')) return dir
    dir = path.dirname(dir)
  }
  return null
}

export function isPortable(): boolean {
  return getPortableDataDir() !== null
}
