# Capture Test

## Tool and model

- **Tool:** Claude Code CLI 2.1.283, Windows 11, PowerShell 7.
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) does both the planning and the building. No other model is used. Every log entry records its model, so a switch would show.

## Mechanism

Claude Code lifecycle hooks, configured in the repo at **`.claude/settings.json`**. Each hook runs `node .claude/hooks/capture.js <Event>`:

| Event | What it does |
|---|---|
| `SessionStart` | Records the session's model name. |
| `UserPromptSubmit` | Appends the prompt verbatim, with a UTC timestamp and the model. |
| `Stop` | Reads the session transcript (its path arrives on stdin) and appends only the final reply text of the turn. Thinking, tool calls and text written before tool calls are excluded. |

- `.claude/hooks/capture.config.json` holds the author and project name used in each file header.
- Entries are append-only. Only the header counts (`total_exchanges`, `last_prompt_time`) are recalculated.
- If a hook misses a turn, the next hook to run fills in the missing entries from the transcript.

## Log files

One file per session in `.agent-logs/`:

- Canary 1: `.agent-logs/2026-09-26_16-18-41_15907f7c-1bf8-467e-b42b-5be8ee4df852.md` (session `15907f7c`, where the hook was set up)
- Canary 2: `.agent-logs/2026-09-26_16-27-56_02f3cd0b-a8a7-4fdf-8c37-b30f7729a11c.md` (session `02f3cd0b`, a fresh session started afterwards)

The second file was created by a session that started after the hooks were installed. That shows the hook loads from the repo config and doesn't depend on the session that created it.

## Canary entries (raw)

### Canary 1: session `15907f7c`

```
[LOG_ENTRY type=PROMPT num=3 session=15907f7c]
timestamp: 2026-09-26T16:26:36.275Z
model: claude-opus-5-5

 CAPTURE TEST — 8x assignment, Asad Khan


[LOG_ENTRY type=RESPONSE num=3 session=15907f7c]
timestamp: 2026-09-26T16:26:55.707Z
model: claude-opus-5-5

Canary 1 was received and is being logged.

- **Prompt 3 is logged live** at `2026-09-26T16:26:36.275Z`, model `claude-opus-5-5`. It's stored exactly as typed, including the leading space.
- **The Stop hook fired for the previous turn.** Response 2 (the GitHub Desktop reply) landed, so both events work in this session.
- **The header is up to date** (`total_exchanges: 3`) and no errors were logged.
- **This reply** will be written as response 3 when the turn ends. I'll confirm it's there and paste it raw into `CAPTURE-TEST.md`.

**Next: canary 2 in a second session.** Open a new terminal in `D:\Projects\8x_assignment`, run `claude`, and send:

```
CAPTURE TEST — 8x assignment, Asad Khan (session 2)
```

It should create a second file in `.agent-logs/` named after that session's ID. This also checks the thing I flagged earlier: whether the first prompt of a new session gets the right model name or `unknown`.

**Author field:** you're Asad Khan, but I set `author` to `arslannadeem13`, which I guessed from your email. What's your GitHub handle? I'll update `capture.config.json`, and every log header picks it up on the next write.

When canary 2 is sent, come back here and I'll check both files and write `CAPTURE-TEST.md`.
```

### Canary 2: session `02f3cd0b`

```
[LOG_ENTRY type=PROMPT num=1 session=02f3cd0b]
timestamp: 2026-09-26T16:27:56.774Z
model: claude-opus-5-5

CAPTURE TEST — 8x assignment, Asad Khan (session 2)


[LOG_ENTRY type=RESPONSE num=1 session=02f3cd0b]
timestamp: 2026-09-26T16:28:03.631Z
model: claude-opus-5-5

Got it, this is session 2 of the 8x assignment capture. I haven't looked at anything in `D:\Projects\8x_assignment` yet. What should I work on first?
```

The first prompt of the new session has the correct model (`claude-opus-5-5`), not `unknown`, so `SessionStart` passes the model through as intended.

## What didn't work first time

- **Pasted log entries were miscounted.** The first version of `capture.js` counted exchanges by scanning for `[LOG_ENTRY ...]` markers. A prompt that pasted in earlier log text would have inflated the count. Found while testing during setup (session `15907f7c`) and fixed before any real capture.
- **Hooks were created mid-session.** `.claude/` didn't exist when session `15907f7c` started, so exchange 1 of that session (the setup prompt) happened before any hook existed. It was backfilled from the session transcript by the gap-fill logic on the next hook run, not captured live. Every entry after that was captured live.
- **Git isn't installed on PATH.** Commits are made through GitHub Desktop, which has its own copy of git.
