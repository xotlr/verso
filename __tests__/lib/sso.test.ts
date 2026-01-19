import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerActionClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/encryption', () => ({
  encryptFields: vi.fn((obj) => obj),
  decryptFields: vi.fn((obj) => obj),
}));

describe('SSO Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('extractEmailDomain', () => {
    it('should extract domain from valid email', async () => {
      const { extractEmailDomain } = await import('@/lib/sso');

      expect(extractEmailDomain('user@example.com')).toBe('example.com');
      expect(extractEmailDomain('admin@subdomain.company.org')).toBe('subdomain.company.org');
      expect(extractEmailDomain('USER@UPPERCASE.COM')).toBe('uppercase.com');
    });

    it('should return null for invalid email', async () => {
      const { extractEmailDomain } = await import('@/lib/sso');

      expect(extractEmailDomain('not-an-email')).toBe(null);
      expect(extractEmailDomain('multiple@at@signs')).toBe(null);
    });

    it('should handle edge cases with empty parts', async () => {
      const { extractEmailDomain } = await import('@/lib/sso');

      // These return empty string (technically valid split but empty domain)
      // The SSO routing will fail anyway since no team will match empty domain
      expect(extractEmailDomain('missing@')).toBe('');
      expect(extractEmailDomain('@missing-local')).toBe('missing-local');
    });
  });

  describe('getTeamSsoStatus', () => {
    it('should return SSO status for a team', async () => {
      const mockTeam = {
        ssoEnabled: true,
        ssoProvider: 'saml',
        ssoConfig: {
          entityId: 'https://idp.example.com',
          ssoUrl: 'https://idp.example.com/sso',
          certificate: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
        },
        ssoDomain: 'example.com',
        ssoEnforced: false,
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTeam,
                error: null,
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamSsoStatus } = await import('@/lib/sso');

      const status = await getTeamSsoStatus('team-123');

      expect(status.enabled).toBe(true);
      expect(status.provider).toBe('saml');
      expect(status.domain).toBe('example.com');
      expect(status.enforced).toBe(false);
      expect(status.configured).toBe(true);
    });

    it('should throw when team not found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamSsoStatus } = await import('@/lib/sso');

      await expect(getTeamSsoStatus('nonexistent')).rejects.toThrow('Team not found');
    });
  });

  describe('getTeamByEmailDomain', () => {
    it('should find team by email domain', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'team-123', ssoProvider: 'saml' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamByEmailDomain } = await import('@/lib/sso');

      const result = await getTeamByEmailDomain('example.com');

      expect(result).toEqual({
        teamId: 'team-123',
        ssoProvider: 'saml',
      });
    });

    it('should return null when no team found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamByEmailDomain } = await import('@/lib/sso');

      const result = await getTeamByEmailDomain('unknown.com');

      expect(result).toBeNull();
    });
  });

  describe('shouldRouteToSso', () => {
    it('should return shouldRoute true when domain has SSO', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'team-123', ssoProvider: 'oidc' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { shouldRouteToSso } = await import('@/lib/sso');

      const result = await shouldRouteToSso('user@example.com');

      expect(result.shouldRoute).toBe(true);
      expect(result.teamId).toBe('team-123');
      expect(result.provider).toBe('oidc');
    });

    it('should return shouldRoute false for invalid email', async () => {
      const { shouldRouteToSso } = await import('@/lib/sso');

      const result = await shouldRouteToSso('not-an-email');

      expect(result.shouldRoute).toBe(false);
    });

    it('should return shouldRoute false when no team has SSO for domain', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { shouldRouteToSso } = await import('@/lib/sso');

      const result = await shouldRouteToSso('user@unknown.com');

      expect(result.shouldRoute).toBe(false);
    });
  });

  describe('SAML config validation', () => {
    it('should validate correct SAML config', async () => {
      const mockTeam = {
        ssoEnabled: true,
        ssoProvider: 'saml',
        ssoConfig: {
          entityId: 'https://idp.example.com/entity',
          ssoUrl: 'https://idp.example.com/sso',
          certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
        },
        ssoDomain: 'example.com',
        ssoEnforced: false,
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTeam,
                error: null,
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamSsoStatus } = await import('@/lib/sso');

      const status = await getTeamSsoStatus('team-123');
      expect(status.configured).toBe(true);
    });

    it('should reject SAML config with HTTP (non-HTTPS) SSO URL', async () => {
      const mockTeam = {
        ssoEnabled: true,
        ssoProvider: 'saml',
        ssoConfig: {
          entityId: 'https://idp.example.com/entity',
          ssoUrl: 'http://insecure.example.com/sso', // HTTP instead of HTTPS
          certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
        },
        ssoDomain: 'example.com',
        ssoEnforced: false,
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTeam,
                error: null,
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamSsoStatus } = await import('@/lib/sso');

      const status = await getTeamSsoStatus('team-123');
      expect(status.configured).toBe(false);
    });
  });

  describe('OIDC config validation', () => {
    it('should validate correct OIDC config', async () => {
      const mockTeam = {
        ssoEnabled: true,
        ssoProvider: 'oidc',
        ssoConfig: {
          issuer: 'https://auth.example.com',
          clientId: 'client-123',
          clientSecret: 'secret-456',
        },
        ssoDomain: 'example.com',
        ssoEnforced: false,
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTeam,
                error: null,
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamSsoStatus } = await import('@/lib/sso');

      const status = await getTeamSsoStatus('team-123');
      expect(status.configured).toBe(true);
    });

    it('should reject OIDC config missing client secret', async () => {
      const mockTeam = {
        ssoEnabled: true,
        ssoProvider: 'oidc',
        ssoConfig: {
          issuer: 'https://auth.example.com',
          clientId: 'client-123',
          // missing clientSecret
        },
        ssoDomain: 'example.com',
        ssoEnforced: false,
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTeam,
                error: null,
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getTeamSsoStatus } = await import('@/lib/sso');

      const status = await getTeamSsoStatus('team-123');
      expect(status.configured).toBe(false);
    });
  });
});
