# Inkroom

A collaborative drawing board built with **Ruby on Rails 8**, **PostgreSQL**, and **Action Cable** websockets. Think Google Jamboard / Miro — no accounts, just a nickname, shared boards, and strokes that sync live and persist forever.

## Features

- Nickname-only entry (no registration)
- Create boards or join from the lobby
- Real-time multi-user drawing via Action Cable
- Persistent strokes in PostgreSQL (`jsonb` points)
- Pen, eraser, line, rectangle, ellipse
- Pan / zoom (scroll, Space+drag, toolbar)
- Live cursors and presence avatars
- Full-window canvas with a floating tool dock

## Requirements

- Ruby 3.3+ / 4.x
- Rails 8.1
- PostgreSQL 14+
- Node not required (Importmap + Tailwind via `tailwindcss-rails`)

## Setup

```bash
# From the project root
bundle install

# Configure Postgres (Windows example in PowerShell)
$env:PGUSER = "postgres"
$env:PGPASSWORD = "your_password"
$env:PGHOST = "localhost"

bin/rails db:prepare
bin/rails db:seed   # optional welcome board
```

## Run

```bash
bin/dev
```

Open [http://localhost:3000](http://localhost:3000).

`bin/dev` starts Puma and the Tailwind watcher (via Foreman / `Procfile.dev`).

## How it works

| Layer | Role |
| --- | --- |
| `Board` / `Stroke` | Postgres models; strokes store tool, color, width, and point arrays |
| `BoardChannel` | Action Cable channel for live strokes, cursors, and presence |
| `board_controller.js` | Canvas rendering, tools, pan/zoom, optimistic local draw + persist |
| Session cookie | Stores the nickname used by HTTP and websocket connection |

1. User picks a nickname → stored in session  
2. Creates/opens a board → existing strokes load from DB  
3. While drawing, live points broadcast over the websocket  
4. On pointer up, the stroke is `POST`ed, saved, and broadcast as the canonical stroke  

## Project layout

```
app/
  channels/board_channel.rb
  controllers/{sessions,boards,strokes}_controller.rb
  javascript/controllers/board_controller.js
  models/{board,stroke}.rb
  views/{sessions,boards}/
```

## Tips

- Open the same board URL in two browsers to verify realtime sync
- Shortcuts: `P` pen, `E` eraser, `L` line, `R` rect, `O` ellipse, `H` / Space pan
- Double-click the canvas to reset pan/zoom
