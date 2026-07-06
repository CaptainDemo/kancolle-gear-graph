# kancolle_gear_graph

Interactive KanColle equipment dependency graph — explore how gears, quests, and materials consume each other, recursively.

Each equipment is a node. Click any neighbor to pull in its consumers and consumed items, building up a dependency web across crafting chains, improvement trees, and quest requirements.

## Features

- **Recursive expansion** — click any node to grow the graph by its consumers and consumed items, layer by layer
- **Multi-type nodes** — equipment, quests, and base materials rendered in one graph
- **Virtualized list with filter** — 500+ equipment browsable without scroll jank
- **Improvement trees** — weekly akashi upgrade tables included

## Tech stack

React 19 · TypeScript · Vite · @xyflow/react · zustand · dagre · @tanstack/react-virtual

## Developing

```bash
npm install
npm run sync    # pull data JSONs from upstream sources into data/
npm run dev
```

## Data sources

MIT-licensed JSON from [kcwiki/kancolle-data](https://github.com/kcwiki/kancolle-data), [KC3Kai/KC3Kai](https://github.com/KC3Kai/KC3Kai), [kcwikizh/kcdata](https://github.com/kcwikizh/kcdata), and [kcwikizh/kcwiki-improvement-data](https://github.com/kcwikizh/kcwiki-improvement-data).

## License

MIT
