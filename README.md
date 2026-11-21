[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/tranthanhthuan0512882025-crypto/solano-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/tranthanhthuan0512882025-crypto/solano-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

<sub>Entered on [make.fun](https://make.fun/?ref=02mf7dke&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

# Solano Bay

An open-world crime game in the spirit of GTA 6, built for the make.fun
gta6-01 competition. A sun-soaked harbour city you explore on foot and by car:
jack cars, dodge traffic, and run five story missions — while the harbour
police hunt you with vision cones and a wanted system with one hard rule.

## Cold Trail

Heat cools **only** when no cop can see you. Break line of sight behind
buildings, or blend into a pedestrian crowd and vanish. A cop who spots you
holds the heat; a cop searching nearby keeps the trail warm. Lose them the
cold way, or outdrive them.

## Play

- **WASD / arrows** — walk and drive
- **E** — jack a car / step out
- **Click** — shoot (on foot)
- **Space** — punch
- **Shift** — sprint (sprinting breaks your cover in a crowd)
- **P / Esc** — pause
- **M** — mute

Missions: **First Light** (pick up Rosa at the marina), **Cold Trail** (jack a
car, then lose the heat), **Harbor Heist** (steal the courier van), **Crowd
Cover** (tail Mr. Vane through the market unseen), and **Sunset Run** (the
final getaway). Progress saves automatically in your browser.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only — no build step, no network at runtime. All art is drawn on
canvas and all sound is synthesised with WebAudio.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Referral code: `02mf7dke` — https://make.fun/r/02mf7dke

MIT licensed. An original game: its city, characters, vehicles, names and
story are all its own.
