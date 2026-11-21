import { useState } from 'react';
import { routingPolicy } from '../engine/routing';
import type { Availability, Privacy } from '../domain/types';
export function RoutingLab() {
  const [privacy, setPrivacy] = useState<Privacy>('local-only');
  const [availability, setAvailability] = useState<Availability>('unavailable');
  const [online, setOnline] = useState(true);
  const result = routingPolicy({ configured: true, privacy, availability, online });
  return <details className="card"><summary>Simulated routing lab</summary><p>Policy simulation only. No model runs or downloads. Actual run badges remain unchanged.</p>
    <label>Simulated privacy <select value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)}><option value="local-only">Local-only</option><option value="hybrid">Hybrid</option></select></label>
    <label>Simulated device <select value={availability} onChange={(e) => setAvailability(e.target.value as Availability)}>{['available', 'downloadable', 'downloading', 'unavailable', 'unsupported'].map((a) => <option key={a}>{a}</option>)}</select></label>
    <label><input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} /> Simulated online</label>
    <p role="status">Simulated route: {result.route}. {result.reason}</p></details>;
}
