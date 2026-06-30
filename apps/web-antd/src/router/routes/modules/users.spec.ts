import { describe, expect, it } from 'vitest';

import usersRoutes from './users';

describe('users route module', () => {
  it('has user detail and timing sub-routes', () => {
    const paths = usersRoutes[0]?.children?.map((child) => child.path);
    expect(paths).toContain('/users/:user_id');
    expect(paths).toContain('/users/:user_id/sessions');
    expect(paths).toContain('/users/:user_id/timing');
  });
});
