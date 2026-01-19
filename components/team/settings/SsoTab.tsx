'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Shield,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SsoStatus {
  enabled: boolean;
  provider: 'saml' | 'oidc' | null;
  domain: string | null;
  enforced: boolean;
  configured: boolean;
}

interface SsoTabProps {
  teamId: string;
  isOwner: boolean;
}

const SSO_PROVIDERS = {
  okta: { name: 'Okta', type: 'saml' },
  azure_ad: { name: 'Microsoft Entra ID (Azure AD)', type: 'saml' },
  google_workspace: { name: 'Google Workspace', type: 'saml' },
  onelogin: { name: 'OneLogin', type: 'saml' },
  custom_saml: { name: 'Custom SAML Provider', type: 'saml' },
  custom_oidc: { name: 'Custom OIDC Provider', type: 'oidc' },
} as const;

export function SsoTab({ teamId, isOwner }: SsoTabProps) {
  const [status, setStatus] = useState<SsoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string>('okta');
  const [domain, setDomain] = useState('');
  const [enforced, setEnforced] = useState(false);

  // SAML config
  const [entityId, setEntityId] = useState('');
  const [ssoUrl, setSsoUrl] = useState('');
  const [certificate, setCertificate] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/sso`);
      if (!response.ok) {
        if (response.status === 403) {
          // User doesn't have permission - that's okay
          setStatus(null);
          return;
        }
        throw new Error('Failed to fetch SSO status');
      }
      const data = await response.json();
      setStatus(data.sso);

      // Populate form with existing values
      if (data.sso.domain) setDomain(data.sso.domain);
      if (data.sso.enforced !== undefined) setEnforced(data.sso.enforced);
    } catch (error) {
      console.error('Failed to fetch SSO status:', error);
      toast.error('Failed to load SSO settings');
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSave = async () => {
    if (!domain.trim()) {
      toast.error('Please enter your organization email domain');
      return;
    }

    if (!entityId.trim() || !ssoUrl.trim() || !certificate.trim()) {
      toast.error('Please fill in all SAML configuration fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/sso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssoEnabled: true,
          ssoProvider: SSO_PROVIDERS[selectedProvider as keyof typeof SSO_PROVIDERS]?.type || 'saml',
          ssoDomain: domain.toLowerCase().trim(),
          ssoEnforced: enforced,
          ssoConfig: {
            entityId: entityId.trim(),
            ssoUrl: ssoUrl.trim(),
            certificate: certificate.trim(),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save SSO configuration');
      }

      const data = await response.json();
      setStatus(data.sso);
      toast.success('SSO configuration saved');
    } catch (error) {
      console.error('Failed to save SSO:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save SSO configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/sso`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear SSO configuration');
      }

      setStatus({
        enabled: false,
        provider: null,
        domain: null,
        enforced: false,
        configured: false,
      });

      // Reset form
      setDomain('');
      setEnforced(false);
      setEntityId('');
      setSsoUrl('');
      setCertificate('');

      toast.success('SSO configuration cleared');
    } catch (error) {
      console.error('Failed to clear SSO:', error);
      toast.error('Failed to clear SSO configuration');
    } finally {
      setIsClearing(false);
    }
  };

  const toggleEnabled = async (enabled: boolean) => {
    if (enabled && !status?.configured) {
      toast.error('Please configure SSO before enabling it');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/sso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssoEnabled: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update SSO status');
      }

      const data = await response.json();
      setStatus(data.sso);
      toast.success(enabled ? 'SSO enabled' : 'SSO disabled');
    } catch (error) {
      console.error('Failed to toggle SSO:', error);
      toast.error('Failed to update SSO status');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Only team owners can configure SSO
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Single Sign-On (SSO)
              </CardTitle>
              <CardDescription>
                Allow team members to sign in using your identity provider
              </CardDescription>
            </div>
            {status?.configured && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={status?.enabled ?? false}
                  onCheckedChange={toggleEnabled}
                  disabled={isSaving}
                />
                <span className="text-sm text-muted-foreground">
                  {status?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status?.enabled && status?.configured ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                SSO is active for @{status.domain}
              </div>

              {status.enforced && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  SSO is enforced - team members must use SSO to sign in
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enforce SSO</p>
                  <p className="text-xs text-muted-foreground">
                    Require all team members to sign in via SSO
                  </p>
                </div>
                <Switch
                  checked={status.enforced}
                  onCheckedChange={async (checked) => {
                    setIsSaving(true);
                    try {
                      const response = await fetch(`/api/teams/${teamId}/sso`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ssoEnforced: checked }),
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setStatus(data.sso);
                        toast.success(checked ? 'SSO enforcement enabled' : 'SSO enforcement disabled');
                      }
                    } catch {
                      toast.error('Failed to update enforcement');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                />
              </div>

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    {isClearing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Remove SSO Configuration
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove SSO Configuration?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disable SSO for your team. Team members will need to use
                      email/password or social login to access Verso. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClear}>
                      Remove SSO
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Identity Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SSO_PROVIDERS).map(([key, provider]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {provider.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="domain">Organization Email Domain</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    id="domain"
                    placeholder="acme.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Users with this email domain will be routed to SSO
                </p>
              </div>

              <Separator />

              {/* SAML Configuration */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">SAML Configuration</h4>

                <div className="space-y-2">
                  <Label htmlFor="entityId">Entity ID (Issuer)</Label>
                  <Input
                    id="entityId"
                    placeholder="https://idp.example.com/saml/metadata"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssoUrl">SSO URL</Label>
                  <Input
                    id="ssoUrl"
                    placeholder="https://idp.example.com/saml/sso"
                    value={ssoUrl}
                    onChange={(e) => setSsoUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate">X.509 Certificate</Label>
                  <textarea
                    id="certificate"
                    className={cn(
                      'flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                      'ring-offset-background placeholder:text-muted-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-50 font-mono'
                    )}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    value={certificate}
                    onChange={(e) => setCertificate(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Enforce SSO */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enforce SSO</Label>
                  <p className="text-xs text-muted-foreground">
                    Require all team members to sign in via SSO
                  </p>
                </div>
                <Switch
                  checked={enforced}
                  onCheckedChange={setEnforced}
                />
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Configure SSO
              </Button>

              {/* Help Link */}
              <div className="text-center">
                <a
                  href="https://docs.verso.ac/sso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  View SSO setup guide
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supabase SSO Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> SSO is powered by Supabase Auth. After configuring SSO here,
            you'll need to complete the setup in your identity provider. Contact support if you
            need assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
