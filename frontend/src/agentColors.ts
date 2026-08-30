// Stable color-per-agent assignment. We don't know the full set of agent
// names ahead of time, so we hash the name into a small fixed palette.
const PALETTE = [
  '#7C5CFF', // purple
  '#0EA5E9', // sky
  '#E5920F', // amber (darkened for text-on-tint contrast)
  '#F23D8E', // pink
  '#E5484D', // coral red
  '#4F7DF9', // blue
  '#16A34A', // green
  '#0E9DE5', // cyan
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

export function colorForAgent(agent: string): string {
  const index = hashString(agent) % PALETTE.length
  return PALETTE[index]
}
