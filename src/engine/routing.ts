import type { Availability, Privacy } from '../domain/types';
export type Route = 'sample' | 'device' | 'cloud' | 'stop';

export function routingPolicy({ configured, privacy, availability, online }: { configured: boolean; privacy: Privacy; availability: Availability; online: boolean }): { route: Route; reason: string } {
  if (!configured) return { route: 'sample', reason: 'No Firebase configuration: deterministic rules, no AI.' };
  if (availability === 'available') return { route: 'device', reason: 'Device model is ready.' };
  if (privacy === 'local-only') return { route: 'stop', reason: 'Local-only cannot upload when the device model is not ready.' };
  if (!online) return { route: 'stop', reason: 'Offline and no ready device model.' };
  return { route: 'cloud', reason: 'Hybrid policy permits cloud fallback; a model download requires an explicit gesture.' };
}
