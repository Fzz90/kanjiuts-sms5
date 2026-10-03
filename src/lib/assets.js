// Public assets follow the same prefix as the built app, including project Pages sites.
export function assetUrl(path) {
  return `${import.meta.env?.BASE_URL ?? '/'}${path.replace(/^\/+/, '')}`;
}
