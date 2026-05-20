# S-Class Fencing Tournament Manager

A mobile-first fencing tournament app built with Expo + React Native + TypeScript.

## Features

- **Fencer roster** — add/edit fencers with initial ratings; voice or tap
- **Snake-seeded poules** — balanced pool creation; full round-robin bout tracking
- **ELO-backed standings** — ranked by wins → indicator → touches scored → initial rating
- **Power-of-two DE bracket** — auto-seeded from poule standings; BYEs auto-advanced
- **Voice commands** — microphone input (Chrome / web) + text command fallback on all platforms
- **TTS feedback** — spoken confirmation after every command via `expo-speech`
- **Auto-save** — tournament state persisted locally with AsyncStorage
- **JSON export** — share full tournament data

## Quick Start

```bash
npm install --legacy-peer-deps
npm start           # Expo dev server
npm run web         # Open in browser (full voice recognition in Chrome)
npm run android     # Android device / emulator
npm test            # Run 50 unit tests
```

## Voice Commands

| Say | Action |
|-----|--------|
| `add fencer Alice` | Add fencer with default rating 1200 |
| `add Bob rating 1450` | Add fencer with custom rating |
| `create poules` | Generate snake-seeded pools |
| `five three` / `score 5 3` | Score active bout 5–3 |
| `Alice five Bob three` | Score named fencer bout |
| `next bout` / `next` | Jump to next incomplete bout |
| `create bracket` | Build DE from poule standings |
| `finalize elo` | Update ELO ratings from all bouts |
| `show standings` | Navigate to standings screen |
| `export` | Export tournament JSON |
| `help` | Show command list |

> **Voice note:** Live microphone input requires Chrome on Android or a desktop browser.
> The text command input works everywhere as a fallback.

## Architecture

```
src/
  engine/              # Pure tournament logic (no React deps)
    types.ts           # Fencer, Bout, Poule, Bracket, BracketMatch
    poules.ts          # createPoules, calculatePouleStandings, updatePouleBout
    bracket.ts         # createDEBracket, enterDEMatchScore, seedOrder
    elo.ts             # expectedScore, applyEloChange, finalizeElo
  voice/               # Voice recognition and command parsing
    VoiceEngine.ts     # Web Speech API wrapper + no-op stub for native
    CommandParser.ts   # Utterance → TournamentCommand
    useVoice.ts        # React hook: startListening, stopListening, submitText
  components/          # UI (React Native)
    VoiceController.tsx    # Mic button + text input + help panel
    FencerEditor.tsx
    PouleView.tsx          # Progress bar, active bout highlighting
    BracketView.tsx        # Horizontal scrollable bracket tree
    StandingsView.tsx      # Post-poule rankings with podium highlights
  storage/
    tournamentStorage.ts   # AsyncStorage + JSON export via expo-sharing
__tests__/             # 50 unit tests
```

## Tournament Flow

1. **Fencers** — add participants; say "add fencer [name]"
2. **Create Poules** — say "create poules"; fencers are snake-seeded into balanced groups
3. **Poules** — enter scores by voice ("five three") or tap; active bout is highlighted; auto-advances
4. **Standings** — post-poule rankings; tap "Create DE Bracket" or say "create bracket"
5. **Bracket** — horizontal DE bracket with live score entry; champion shown when final completes
6. **Finalize ELO** — update ratings from all completed bouts across poules and DE
