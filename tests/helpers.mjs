export async function layerVisibility(page, layerId) {
  return page.evaluate((id) => window.__hm.map.getLayoutProperty(id, 'visibility') ?? 'visible', layerId);
}
export async function hasLayer(page, layerId) {
  return page.evaluate((id) => !!window.__hm.map.getLayer(id), layerId);
}
