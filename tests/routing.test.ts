import { routingPolicy } from '../src/engine/routing';
it('never routes unconfigured Sample to a model', () => {
  expect(routingPolicy({ configured: false, privacy: 'hybrid', availability: 'available', online: true }).route).toBe('sample');
});
it.each(['downloadable', 'downloading', 'unavailable', 'unsupported'] as const)('local-only stops for %s', (availability) => {
  expect(routingPolicy({ configured: true, privacy: 'local-only', availability, online: true }).route).toBe('stop');
});
it('hybrid fallback requires online; available device remains local', () => {
  expect(routingPolicy({ configured: true, privacy: 'hybrid', availability: 'unavailable', online: true }).route).toBe('cloud');
  expect(routingPolicy({ configured: true, privacy: 'hybrid', availability: 'unavailable', online: false }).route).toBe('stop');
  expect(routingPolicy({ configured: true, privacy: 'hybrid', availability: 'available', online: false }).route).toBe('device');
});
