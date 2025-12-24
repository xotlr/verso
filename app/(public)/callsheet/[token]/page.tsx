'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Link2Off,
  MapPin,
  Calendar,
  Users,
  Film,
  Utensils,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CallsheetData, CallsheetScene, CastCall, CrewMember, MealInfo } from '@/types/callsheet';

interface CallsheetShareData {
  callsheet: {
    id: string;
    title: string;
    shootDate: string;
    callTime: string;
    wrapTime: string | null;
    status: string;
    primaryLocation: string | null;
    weatherForecast: string | null;
    weatherTemp: number | null;
    data: CallsheetData | null;
    project: {
      id: string;
      name: string;
    } | null;
  };
  filterType: string;
  filterValue: string | null;
  expiresAt: string | null;
  createdBy: string;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  count,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="font-medium text-sm flex-1 text-left">{title}</span>
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        )}
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );
}

export default function PublicMobileCallsheetPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<CallsheetShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    const fetchCallsheet = async () => {
      try {
        const response = await fetch(`/api/callsheets/share/${token}`);

        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else if (response.status === 404) {
          setError({ message: 'Callsheet not found', type: 'not_found' });
        } else if (response.status === 410) {
          const result = await response.json();
          if (result.error?.includes('expired')) {
            setError({ message: 'This link has expired', type: 'expired' });
          } else {
            setError({ message: 'This link has been revoked', type: 'revoked' });
          }
        } else {
          setError({ message: 'Failed to load callsheet', type: 'error' });
        }
      } catch (err) {
        console.error('Error fetching callsheet:', err);
        setError({ message: 'Failed to load callsheet', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchCallsheet();
    }
  }, [token]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    const Icon = error.type === 'expired' ? Clock : error.type === 'revoked' ? Link2Off : AlertTriangle;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">{error.message}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Please request a new link from the production team.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { callsheet } = data;
  const callsheetData = callsheet.data;

  // Group crew by department
  const crewByDepartment = callsheetData?.crew?.reduce((acc, member) => {
    const dept = member.department;
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(member);
    return acc;
  }, {} as Record<string, CrewMember[]>) || {};

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-lg truncate">
                {callsheet.project?.name || callsheet.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {callsheetData?.productionTitle || callsheet.title}
              </p>
            </div>
            {callsheetData?.shootDay && (
              <Badge variant="secondary" className="flex-shrink-0">
                Day {callsheetData.shootDay}
                {callsheetData.totalShootDays && ` / ${callsheetData.totalShootDays}`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Date & Schedule Card */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDate(callsheet.shootDate)}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Call</p>
              <p className="font-semibold">{formatTime(callsheet.callTime)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">First Shot</p>
              <p className="font-semibold">
                {callsheetData?.firstShotTime || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Est. Wrap</p>
              <p className="font-semibold">
                {callsheet.wrapTime ? formatTime(callsheet.wrapTime) : '--'}
              </p>
            </div>
          </div>
          {callsheet.weatherForecast && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
              <span>{callsheet.weatherForecast}</span>
              {callsheet.weatherTemp && <span>{callsheet.weatherTemp}°F</span>}
            </div>
          )}
        </div>

        {/* Primary Location */}
        {callsheet.primaryLocation && (
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Primary Location</p>
                <p className="text-sm text-muted-foreground">{callsheet.primaryLocation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Scenes */}
        {callsheetData?.scenes && callsheetData.scenes.length > 0 && (
          <CollapsibleSection
            title="Scenes"
            icon={Film}
            count={callsheetData.scenes.length}
          >
            {callsheetData.scenes.map((scene: CallsheetScene, index: number) => (
              <div key={scene.id || index} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                  {scene.sceneNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{scene.heading}</p>
                  {scene.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {scene.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {scene.pageCount} pg
                </span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Cast Calls */}
        {callsheetData?.castCalls && callsheetData.castCalls.length > 0 && (
          <CollapsibleSection
            title="Cast"
            icon={Users}
            count={callsheetData.castCalls.length}
          >
            {callsheetData.castCalls.map((cast: CastCall, index: number) => (
              <div key={cast.id || index} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cast.characterName}</p>
                  {cast.actorName && (
                    <p className="text-xs text-muted-foreground">{cast.actorName}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">{cast.callTime}</p>
                  {cast.makeupTime && (
                    <p className="text-xs text-muted-foreground">MU: {cast.makeupTime}</p>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Crew by Department */}
        {Object.keys(crewByDepartment).length > 0 && (
          <CollapsibleSection
            title="Crew"
            icon={Users}
            count={callsheetData?.crew?.length}
            defaultOpen={false}
          >
            {Object.entries(crewByDepartment).map(([dept, members]) => (
              <div key={dept} className="py-2 border-b border-border last:border-0">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {dept}
                </p>
                {members.map((member: CrewMember, index: number) => (
                  <div key={member.id || index} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{member.callTime}</span>
                      {member.phone && (
                        <a href={`tel:${member.phone}`} className="text-muted-foreground hover:text-foreground">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Meals */}
        {callsheetData?.meals && callsheetData.meals.length > 0 && (
          <CollapsibleSection
            title="Meals"
            icon={Utensils}
            count={callsheetData.meals.length}
            defaultOpen={false}
          >
            {callsheetData.meals.map((meal: MealInfo, index: number) => (
              <div key={meal.id || index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium capitalize">{meal.type.replace('-', ' ')}</p>
                  {meal.location && (
                    <p className="text-xs text-muted-foreground">{meal.location}</p>
                  )}
                </div>
                <span className="text-sm">{meal.time}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Safety & Emergency */}
        {(callsheetData?.nearestHospital || callsheetData?.emergencyContacts?.length) && (
          <CollapsibleSection
            title="Safety & Emergency"
            icon={AlertCircle}
            defaultOpen={false}
          >
            {callsheetData?.nearestHospital && (
              <div className="py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Nearest Hospital
                </p>
                <p className="text-sm font-medium">{callsheetData.nearestHospital.name}</p>
                <p className="text-xs text-muted-foreground">
                  {callsheetData.nearestHospital.address}
                </p>
                {callsheetData.nearestHospital.phone && (
                  <a
                    href={`tel:${callsheetData.nearestHospital.phone}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {callsheetData.nearestHospital.phone}
                  </a>
                )}
              </div>
            )}
            {callsheetData?.emergencyContacts?.map((contact, index) => (
              <div key={contact.id || index} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.role}</p>
                </div>
                <a
                  href={`tel:${contact.phone}`}
                  className={cn(
                    "flex items-center gap-1 text-sm",
                    contact.isPrimary && "font-medium text-primary"
                  )}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </a>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Production Notes */}
        {callsheetData?.productionNotes && (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Production Notes
            </p>
            <p className="text-sm whitespace-pre-wrap">{callsheetData.productionNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
