import { describe, expect, it } from '@jest/globals';

import { isTenantScopedQueryKey, tenantQueryKey, TENANT_QUERY_ROOT } from '@/src/lib/tenant-query';

describe('tenantQueryKey', () => {
  it('prefixes keys with tenant root and public id', () => {
    expect(tenantQueryKey('tenant-a', 'team-members', { api: true })).toEqual([
      TENANT_QUERY_ROOT,
      'tenant-a',
      'team-members',
      { api: true },
    ]);
  });

  it('detects tenant scoped keys', () => {
    expect(isTenantScopedQueryKey(tenantQueryKey('tenant-a', 'deals', 'list'))).toBe(true);
    expect(isTenantScopedQueryKey(['deals', 'list'])).toBe(false);
  });
});
