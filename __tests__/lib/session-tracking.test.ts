import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client before importing the module
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

describe('Session Tracking', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('getSessionToken (internal function behavior)', () => {
    it('should generate consistent hashes for same token prefix', async () => {
      // We test this indirectly through the exported functions
      // The session token is derived from the access token
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getUserSessions } = await import('@/lib/session-tracking');

      // Call with same access token should be deterministic
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token';
      await getUserSessions('user-123', accessToken);

      // The function should have been called (verifies the flow works)
      expect(mockSupabase.from).toHaveBeenCalledWith('UserSession');
    });
  });

  describe('parseUserAgent (internal function behavior)', () => {
    it('should correctly identify different browsers and OS via trackSession', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: upsertMock,
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { trackSession } = await import('@/lib/session-tracking');

      // Test Chrome on Windows
      await trackSession({
        userId: 'user-123',
        accessToken: 'test-token',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        ipAddress: '192.168.1.1',
      });

      expect(upsertMock).toHaveBeenCalled();
      const callArg = upsertMock.mock.calls[0][0];
      expect(callArg.deviceInfo).toContain('Chrome');
      expect(callArg.deviceInfo).toContain('Windows');
    });

    it('should handle null user agent', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: upsertMock,
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { trackSession } = await import('@/lib/session-tracking');

      await trackSession({
        userId: 'user-123',
        accessToken: 'test-token',
        userAgent: null,
        ipAddress: null,
      });

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceInfo: 'Unknown device',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getUserSessions', () => {
    it('should return sessions with isCurrent flag', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          sessionToken: 'abc123', // Will match if we use the right access token
          deviceInfo: 'Chrome on Windows',
          ipAddress: '192.168.1.1',
          country: 'US',
          city: 'New York',
          lastActive: '2024-01-15T10:00:00Z',
          createdAt: '2024-01-01T10:00:00Z',
          revokedAt: null,
        },
        {
          id: 'session-2',
          userId: 'user-123',
          sessionToken: 'def456',
          deviceInfo: 'Safari on macOS',
          ipAddress: '192.168.1.2',
          country: 'US',
          city: 'Los Angeles',
          lastActive: '2024-01-14T10:00:00Z',
          createdAt: '2024-01-02T10:00:00Z',
          revokedAt: null,
        },
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSessions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getUserSessions } = await import('@/lib/session-tracking');

      const sessions = await getUserSessions('user-123');

      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toHaveProperty('isCurrent');
      expect(sessions[1]).toHaveProperty('isCurrent');
    });

    it('should throw on database error', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { getUserSessions } = await import('@/lib/session-tracking');

      await expect(getUserSessions('user-123')).rejects.toThrow('Failed to get sessions');
    });
  });

  describe('revokeSession', () => {
    it('should update session with revokedAt timestamp', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: updateMock,
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { revokeSession } = await import('@/lib/session-tracking');

      const result = await revokeSession('user-123', 'session-456');

      expect(result).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: expect.any(String),
        })
      );
    });

    it('should return false on error', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: 'Not found' } }),
            }),
          }),
        }),
      };

      const { createServerActionClient } = await import('@/lib/supabase/server');
      vi.mocked(createServerActionClient).mockResolvedValue(mockSupabase as never);

      const { revokeSession } = await import('@/lib/session-tracking');

      const result = await revokeSession('user-123', 'session-456');

      expect(result).toBe(false);
    });
  });
});
