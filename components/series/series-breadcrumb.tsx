'use client';

import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface SeriesBreadcrumbProps {
  series: {
    id: string;
    title: string;
  };
  season?: {
    id: string;
    number: number;
    title?: string | null;
  } | null;
  episode?: {
    episode: number | null;
    episodeTitle: string | null;
  } | null;
}

export function SeriesBreadcrumb({ series, season, episode }: SeriesBreadcrumbProps) {
  // Determine what level we're at
  const isAtSeries = !season && !episode;
  const isAtSeason = season && !episode;
  const isAtEpisode = season && episode;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Series - always present */}
        <BreadcrumbItem>
          {isAtSeries ? (
            <BreadcrumbPage>{series.title}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href={`/series/${series.id}`}>{series.title}</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {/* Season - if present */}
        {season && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isAtSeason ? (
                <BreadcrumbPage>
                  Season {season.number}
                  {season.title && `: ${season.title}`}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={`/series/${series.id}?season=${season.number}`}>
                    Season {season.number}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}

        {/* Episode - if present (always current page) */}
        {isAtEpisode && episode && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                Episode {episode.episode}
                {episode.episodeTitle && `: ${episode.episodeTitle}`}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
