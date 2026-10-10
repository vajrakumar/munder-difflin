import { StickyNote } from 'lucide-react';
import { Button, EmptyState, Input } from '@/ui';
import type { PaperNote } from './demoData';

export function NotesPane({
  note,
  onChange,
  onDelete,
  onCreate
}: {
  note: PaperNote | undefined;
  onChange: (note: PaperNote) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}): JSX.Element {
  if (!note) {
    return (
      <EmptyState
        icon={<StickyNote size={20} />}
        title="Private notes"
        description="Searchable from the Pro sidebar. They stay on this machine."
        action={
          <Button size="sm" onClick={onCreate}>
            New note
          </Button>
        }
      />
    );
  }

  return (
    <div className="paper-note-editor">
      <Input
        className="paper-note-title-input"
        value={note.title}
        aria-label="Note title"
        onChange={(e) =>
          onChange({ ...note, title: e.target.value, updatedAt: Date.now() })
        }
      />
      <textarea
        className="paper-textarea"
        value={note.body}
        aria-label="Note body"
        placeholder="Write…"
        onChange={(e) =>
          onChange({ ...note, body: e.target.value, updatedAt: Date.now() })
        }
      />
      <div className="paper-note-editor-foot">
        <span>
          Updated {new Date(note.updatedAt).toLocaleString()}
        </span>
        <Button size="sm" variant="danger" onClick={() => onDelete(note.id)}>
          Delete
        </Button>
      </div>
    </div>
  );
}
