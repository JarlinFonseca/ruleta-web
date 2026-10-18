import { useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { toast } from '@/lib/toast/toast-store';
import { fullName, matchesSearch } from '@/utils/text';
import {
  useDeleteParticipant,
  useParticipants,
  useSetParticipantActive,
} from '../api/participant-queries';
import { MAX_PARTICIPANTS, type Participant } from '../api/participant-schemas';
import { ParticipantEditor } from './participant-editor';
import { ParticipantsTable } from './participants-table';
import styles from './participants.module.css';

type ParticipantsViewProps = {
  raffleId: string;
  raffleName: string;
  headerActions?: ReactNode;
};

type EditorState = { mode: 'create' } | { mode: 'edit'; id: string } | null;

/** Pantalla 04 · Participantes (CRUD con foto). */
export function ParticipantsView({ raffleId, raffleName, headerActions }: ParticipantsViewProps) {
  const { t } = useTranslation();
  const { notify } = useErrorHandler();
  const searchId = useId();
  const { data: participants = [], isPending, error, refetch } = useParticipants(raffleId);
  const remove = useDeleteParticipant(raffleId);
  const setActive = useSetParticipantActive(raffleId);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState>(null);
  const [toDelete, setToDelete] = useState<Participant | null>(null);

  const atLimit = participants.length >= MAX_PARTICIPANTS;
  const withPhoto = participants.filter((p) => p.photoUrl).length;
  const rows = useMemo(
    () =>
      participants
        .map((participant, index) => ({ participant, index }))
        .filter(({ participant }) =>
          matchesSearch(query, participant.firstName, participant.lastName),
        ),
    [participants, query],
  );
  const editing =
    editor?.mode === 'edit' ? (participants.find((p) => p.id === editor.id) ?? null) : null;

  return (
    <div className={styles.layout}>
      <main id="contenido" className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.titleBlock}>
            <span className={styles.raffleName}>{raffleName}</span>
            <h1 className={styles.pageTitle}>{t('participants.title')}</h1>
          </div>
          <div className={styles.headerActions}>
            {headerActions}
            <Button
              size="md"
              onClick={() => setEditor({ mode: 'create' })}
              disabled={atLimit}
              aria-describedby={atLimit ? 'limit-msg' : undefined}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('participants.add')}
            </Button>
          </div>
        </div>
        {atLimit ? (
          <p id="limit-msg" className={styles.warning} role="status">
            {t('participants.limit', { count: MAX_PARTICIPANTS })}
          </p>
        ) : null}

        <div className={styles.toolbar}>
          <label htmlFor={searchId} className="visually-hidden">
            {t('participants.search.label')}
          </label>
          <div className={styles.searchBox}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8F897C"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id={searchId}
              type="search"
              className={styles.searchInput}
              placeholder={t('participants.search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className={styles.count} role="status">
            {t('participants.summary', { count: participants.length, photos: withPhoto })}
          </span>
        </div>

        {error ? (
          <div className={styles.stateBox} role="alert">
            <p>{t('errors.loadFailed')}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : isPending ? (
          <p className={styles.muted}>{t('common.loading')}</p>
        ) : participants.length === 0 ? (
          <p className={styles.stateBox}>{t('participants.empty')}</p>
        ) : rows.length === 0 ? (
          <p className={styles.stateBox}>{t('participants.search.noResults')}</p>
        ) : (
          <ParticipantsTable
            rows={rows}
            selectedId={editing?.id ?? null}
            onEdit={(p) => setEditor({ mode: 'edit', id: p.id })}
            onDelete={setToDelete}
            onToggleActive={(p, active) =>
              setActive.mutate({ id: p.id, active }, { onError: (e) => notify(e) })
            }
          />
        )}
      </main>

      {editor && (editor.mode === 'create' || editing) ? (
        <ParticipantEditor
          key={editor.mode === 'edit' ? editor.id : 'new'}
          raffleId={raffleId}
          participant={editing}
          onClose={() => setEditor(null)}
          onEditCreated={(id) => setEditor({ mode: 'edit', id })}
        />
      ) : null}

      {toDelete ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setToDelete(null)}
          title={t('participants.delete.title', {
            name: fullName(toDelete.firstName, toDelete.lastName),
          })}
          description={t('participants.delete.description')}
          confirmLabel={t('participants.delete.confirm')}
          destructive
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                if (editor?.mode === 'edit' && editor.id === toDelete.id) setEditor(null);
                setToDelete(null);
                toast.success(t('participants.delete.done'));
              },
              onError: (e) => notify(e),
            })
          }
        />
      ) : null}
    </div>
  );
}
