# Lessons apprises — capsule-web

> Format : [date] | ce qui a mal tourné | règle à suivre

## Héritées du contexte global (CLAUDE.md)

[2026-04-14] | Editing files with YAML frontmatter: `---` appears twice so Edit fails with "2 matches" | Always anchor edits to content *after* the closing frontmatter `---`, not to the `---` itself

[2026-04-14] | smart_outline MCP tool only works on code files (JS/TS/Python etc.), not Markdown | Use `Bash head -N` or `cat` to inspect Markdown structure when smart_outline fails

[2026-04-14] | The claude-mem Read hook intercepts repeated reads and returns only line 1 to save tokens | When hook says "file unchanged since last Read", use `Bash cat` or `get_observations([IDs])` to access full content

[2026-04-15] | Claude Code's shell is bash on Windows, not PowerShell — Start-Process/Stop-Process are not recognized | Use `mgrep watch &` to start and `pkill mgrep` to stop; never use PowerShell cmdlets in Claude Code commands

[2026-04-27] | Bash variable assignment doesn't interpret `\033` — storing ANSI escape codes in a var then passing via `%s` prints raw text | Use `printf -v varname "..."` to store ANSI-colored strings; never assign `\033` directly in a string

[2026-05-04] | Setting `turbopack.root: path.resolve(__dirname)` in next.config.ts broke Turbopack CSS resolution in dev mode | Use `process.cwd()` for `turbopack.root`, not `__dirname`. Verify dev mode after touching turbopack config.

[2026-05-04] | Next.js/Turbopack picks wrong workspace root when a stray empty `package-lock.json` exists in a parent directory | Check for stray lockfiles in parent dirs. Delete if empty. Pair with `turbopack.root: process.cwd()`.

[2026-05-04] | Never start `npm run dev` without warning the user — Next.js dev mode spikes CPU/RAM significantly | Only start dev servers when the user explicitly asks. Prefer `npm run build` for verification.

[2026-05-04] | `useState(() => window.matchMedia(...))` causes SSR hydration mismatches | Always init SSR component state to the server-safe value. Defer all browser API reads to `useEffect`.

## Spécifiques à capsule-web

<!-- À remplir au fil des sessions -->
