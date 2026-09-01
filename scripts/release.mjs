// Bumps the version, commits, tags, and pushes — pushing the tag is what
// triggers .github/workflows/release.yml to build installers for all three
// platforms and publish them to a GitHub Release.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const bump = process.argv[2] ?? 'patch'
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error(`Usage: npm run release [patch|minor|major]  (default: patch)`)
  process.exit(1)
}

function run(cmd) {
  console.log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

const status = execSync('git status --porcelain').toString().trim()
if (status) {
  console.error('Working tree has uncommitted changes. Commit or stash them before releasing.')
  process.exit(1)
}

const pkgPath = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const next =
  bump === 'major' ? `${major + 1}.0.0` : bump === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`

pkg.version = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

const tag = `v${next}`
run(`git add package.json`)
run(`git commit -m "Release ${tag}"`)
run(`git tag ${tag}`)
run(`git push`)
run(`git push origin ${tag}`)

console.log(`\nPushed ${tag}. GitHub Actions will build Windows/Mac/Linux installers and publish a release:`)
console.log(`  https://github.com/EgoTunnel/Pulse/actions`)
console.log(`Once it finishes, the release will be at:`)
console.log(`  https://github.com/EgoTunnel/Pulse/releases/tag/${tag}`)
