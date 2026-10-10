/** Live count for the sidebar Inbox badge: open items that need you. */
import { useMemo } from 'react';
import { useFloor } from '../../data/hive';
import { useViewerSet } from '../../data/viewerSet';
import { buildItems, inFolder } from './model';

export function useInboxNeedsYou(): number {
  const floor = useFloor();
  const [done] = useViewerSet('paper.inbox.done');
  return useMemo(
    () => buildItems(floor.tasks, floor.mail).filter((it) => it.needsYou && inFolder(it, 'needs', done)).length,
    [floor.tasks, floor.mail, done]
  );
}
