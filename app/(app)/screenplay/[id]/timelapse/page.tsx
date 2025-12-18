'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TimelapsePlayer } from '@/components/timelapse';
import { TimelapseShareDialog } from '@/components/timelapse/timelapse-share-dialog';

export default function TimelapsePage() {
  const params = useParams();
  const screenplayId = params.id as string;
  const [screenplayTitle, setScreenplayTitle] = useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Load screenplay title
  useEffect(() => {
    const loadScreenplayTitle = async () => {
      try {
        const response = await fetch(`/api/screenplays/${screenplayId}`);
        if (response.ok) {
          const data = await response.json();
          setScreenplayTitle(data.title || 'Untitled Screenplay');
        }
      } catch (error) {
        console.error('Failed to load screenplay title:', error);
      }
    };

    loadScreenplayTitle();
  }, [screenplayId]);

  const handleExport = () => {
    // TODO: Implement video export
    console.log('Export video');
  };

  return (
    <>
      <TimelapsePlayer
        screenplayId={screenplayId}
        screenplayTitle={screenplayTitle}
        onShare={() => setIsShareDialogOpen(true)}
        onExport={handleExport}
        className="h-screen"
      />

      <TimelapseShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        screenplayId={screenplayId}
      />
    </>
  );
}
