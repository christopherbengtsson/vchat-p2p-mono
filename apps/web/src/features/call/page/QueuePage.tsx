import { useCursorTrack } from '@/common/hooks/useCursorTrack';
import { QueueContainer } from '../queue/container/QueueContainer';

export function QueuePage() {
  useCursorTrack();

  return <QueueContainer />;
}
