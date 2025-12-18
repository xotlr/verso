'use client';

import { useParams } from 'next/navigation';
import { PublicTimelapsePlayer } from '@/components/timelapse';

export default function PublicTimelapsePage() {
  const params = useParams();
  const shareId = params.shareId as string;

  return (
    <PublicTimelapsePlayer
      shareId={shareId}
      className="h-screen"
    />
  );
}
