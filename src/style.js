export const PALETTE = {
  paper: '#f3e9d2',
  paperDeep: '#eadfc3',
  land: '#f7efd9',
  landEdge: '#4a3b2a',
  river: '#3f5c7a',
  lake: '#a8c4d4',
  borderLine: '#4a3b2a',
  borderFillOpacity: 0.16,
  countryLine: '#b9a888',
  event: '#8c2f2f',
  wall: '#7a5c3e',
  canal: '#2e5f7a',
  silkLand: '#b0743c',
  silkSea: '#2e7d8c'
};

export function buildStyle() {
  return {
    version: 8,
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': PALETTE.paper } }
    ]
  };
}
