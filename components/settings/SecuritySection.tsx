'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  XCircle,
  Shield,
  LogOut,
  MapPin,
  Clock,
  CheckCircle2,
  Key,
  ShieldCheck,
  ShieldOff,
  Copy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

interface MfaFactor {
  id: string;
  type: 'totp';
  friendlyName: string | null;
  status: 'verified' | 'unverified';
  createdAt: string;
}

interface MfaStatus {
  enabled: boolean;
  factors: MfaFactor[];
}

interface MfaEnrollment {
  id: string;
  qrCode: string;
  secret: string;
}

export function SecuritySection() {
  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // MFA state
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [isLoadingMfa, setIsLoadingMfa] = useState(true);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemovingMfa, setIsRemovingMfa] = useState(false);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/user/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Fetch MFA status
  const fetchMfaStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/user/mfa');
      if (!response.ok) {
        throw new Error('Failed to fetch MFA status');
      }
      const data = await response.json();
      setMfaStatus(data.mfa);
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
    } finally {
      setIsLoadingMfa(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchMfaStatus();
  }, [fetchSessions, fetchMfaStatus]);

  // Session handlers
  const handleRevokeSession = async (sessionId: string) => {
    setIsRevoking(sessionId);
    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session revoked');
    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast.error('Failed to revoke session');
    } finally {
      setIsRevoking(null);
    }
  };

  const handleRevokeAllOther = async () => {
    setIsRevokingAll(true);
    try {
      const response = await fetch('/api/user/sessions', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke sessions');
      }

      const data = await response.json();
      setSessions((prev) => prev.filter((s) => s.isCurrent));

      if (data.revokedCount > 0) {
        toast.success(`Revoked ${data.revokedCount} session${data.revokedCount !== 1 ? 's' : ''}`);
      } else {
        toast.success('No other sessions to revoke');
      }
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
      toast.error('Failed to revoke sessions');
    } finally {
      setIsRevokingAll(false);
    }
  };

  // MFA handlers
  const handleStartMfaEnrollment = async () => {
    setIsEnrollingMfa(true);
    try {
      const response = await fetch('/api/user/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to start MFA enrollment');
      }

      const data = await response.json();
      setMfaEnrollment(data.enrollment);
      setEnrollDialogOpen(true);
    } catch (error) {
      console.error('Failed to start MFA enrollment:', error);
      toast.error('Failed to start two-factor setup');
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaEnrollment || verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const response = await fetch('/api/user/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId: mfaEnrollment.id,
          code: verifyCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      setEnrollDialogOpen(false);
      setMfaEnrollment(null);
      setVerifyCode('');
      await fetchMfaStatus();
      toast.success('Two-factor authentication enabled');
    } catch (error) {
      console.error('MFA verification failed:', error);
      toast.error(error instanceof Error ? error.message : 'Invalid code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveMfa = async (factorId: string) => {
    setIsRemovingMfa(true);
    try {
      const response = await fetch('/api/user/mfa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove MFA');
      }

      await fetchMfaStatus();
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      console.error('Failed to remove MFA:', error);
      toast.error('Failed to disable two-factor authentication');
    } finally {
      setIsRemovingMfa(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Helper functions
  const getDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return Monitor;
    const info = deviceInfo.toLowerCase();
    if (info.includes('mobile')) return Smartphone;
    if (info.includes('tablet')) return Tablet;
    return Monitor;
  };

  const getLocationString = (session: Session) => {
    if (session.city && session.country) {
      return `${session.city}, ${session.country}`;
    }
    if (session.country) return session.country;
    if (session.ipAddress) return session.ipAddress;
    return 'Unknown location';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your security settings, two-factor authentication, and active sessions
        </p>
      </div>

      <Separator />

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {!isLoadingMfa && mfaStatus && (
              <div className="flex items-center gap-2">
                {mfaStatus.enabled ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <ShieldOff className="h-4 w-4" />
                    Disabled
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMfa ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mfaStatus?.enabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when signing in.
              </p>

              {mfaStatus.factors.filter((f) => f.status === 'verified').map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {factor.friendlyName || 'Authenticator App'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDistanceToNow(new Date(factor.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        disabled={isRemovingMfa}
                      >
                        {isRemovingMfa ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Remove'
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will make your account less secure. You won't be required to enter a verification code when signing in.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveMfa(factor.id)}>
                          Disable
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security by requiring a verification code from your phone when signing in.
              </p>

              <Button onClick={handleStartMfaEnrollment} disabled={isEnrollingMfa}>
                {isEnrollingMfa ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MFA Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code below with your authenticator app, then enter the verification code.
            </DialogDescription>
          </DialogHeader>

          {mfaEnrollment && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={mfaEnrollment.qrCode}
                  alt="Scan this QR code with your authenticator app"
                  className="w-48 h-48"
                />
              </div>

              {/* Manual entry */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Can't scan? Enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-xs bg-muted rounded-md font-mono break-all">
                    {mfaEnrollment.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(mfaEnrollment.secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Verification code input */}
              <div className="space-y-2">
                <Label htmlFor="verifyCode">Verification code</Label>
                <Input
                  id="verifyCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg tracking-widest font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEnrollDialogOpen(false);
                setMfaEnrollment(null);
                setVerifyCode('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyMfa}
              disabled={verifyCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Verify and Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Devices where you're currently logged in
              </CardDescription>
            </div>
            {sessions.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRevokingAll}
                  >
                    {isRevokingAll ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Sign out all other devices
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out of all devices except this one. You'll need to sign in again on those devices.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevokeAllOther}>
                      Sign out all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sessions recorded yet</p>
              <p className="text-xs mt-1">Your sessions will appear here after your next login</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.deviceInfo);
                return (
                  <div
                    key={session.id}
                    className={cn(
                      'flex items-start gap-4 p-3 rounded-lg border',
                      session.isCurrent && 'bg-accent/50 border-accent'
                    )}
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {session.deviceInfo || 'Unknown device'}
                        </p>
                        {session.isCurrent && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            This device
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getLocationString(session)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last active {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isRevoking === session.id}
                          >
                            {isRevoking === session.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <span className="sr-only">Revoke session</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will sign you out of {session.deviceInfo || 'this device'}. You'll need to sign in again on that device.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevokeSession(session.id)}>
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Enable two-factor authentication for extra security.</p>
          <p>• Review your active sessions regularly and revoke any you don't recognize.</p>
          <p>• Use a strong, unique password that you don't use on other websites.</p>
          <p>• Be cautious of phishing attempts - we'll never ask for your password via email.</p>
        </CardContent>
      </Card>
    </div>
  );
}
