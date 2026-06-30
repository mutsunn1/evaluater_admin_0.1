import { describe, expect, it } from 'vitest';

import sessionsRoutes from './sessions';

describe('sessions route module', () => {
  it('uses absolute child path so Vben route generation resolves correctly', () => {
    const child = sessionsRoutes[0]?.children?.[0];
    expect(child?.path).toBe('/sessions/monitor');
  });

  it('includes hidden session detail route', () => {
    const child = sessionsRoutes[0]?.children?.[1];
    expect(child?.path).toBe('/sessions/:session_id');
    expect(child?.meta?.hideInMenu).toBe(true);
  });
});
