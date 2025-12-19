import { Metadata } from 'next';
import { StatusContent } from '@/components/status';

export const metadata: Metadata = {
  title: 'System Status | Verso',
  description: 'Check the current status of Verso services and infrastructure.',
};

export default function StatusPage() {
  return <StatusContent />;
}
