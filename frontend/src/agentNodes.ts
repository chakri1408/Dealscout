// Maps the agent names emitted over the log socket (parsed by the backend's
// log_bus from the "[Agent Name] message" convention) to pyramid node ids.
export const AGENT_NODE_MAP: Record<string, string> = {
  'Autonomous Planning Agent': 'planner',
  'Scanner Agent': 'scanner',
  'Ensemble Agent': 'ensemble',
  'Messaging Agent': 'messaging',
  'Specialist Agent': 'specialist',
  'Frontier Agent': 'frontier',
  'Neural Network Agent': 'nn',
}

// Candy accent color for each pyramid node (Sky Candy theme).
export const AGENT_NODE_COLORS: Record<string, string> = {
  planner: '#7C5CFF', // purple
  scanner: '#0EA5E9', // sky
  ensemble: '#FFB020', // amber
  messaging: '#FF5CA8', // pink
  specialist: '#FF6B6B', // coral
  frontier: '#4F7DF9', // blue
  nn: '#22C55E', // green
}
