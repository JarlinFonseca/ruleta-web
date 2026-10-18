import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import type { Raffle } from '../api/raffle-schemas';
import styles from './raffles.module.css';

type RaffleSwitcherProps = {
  raffles: Raffle[];
  currentId: string;
  currentName: string;
  onSelect: (raffleId: string) => void;
  onRename: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

/** HU-11: selector de sorteos; también renombrar y eliminar (HU-12). */
export function RaffleSwitcher({
  raffles,
  currentId,
  currentName,
  onSelect,
  onRename,
  onDelete,
  disabled = false,
}: RaffleSwitcherProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={styles.switcher} disabled={disabled}>
        <span className="visually-hidden">{t('raffles.switcher.label')}</span>
        <span className={styles.switcherName}>{currentName}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#A9A396"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} align="start" sideOffset={6}>
          <DropdownMenu.Label className={styles.menuLabel}>
            {t('raffles.switcher.yourRaffles')}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={currentId} onValueChange={onSelect}>
            {raffles.map((r) => (
              <DropdownMenu.RadioItem key={r.id} value={r.id} className={styles.menuItem}>
                <DropdownMenu.ItemIndicator className={styles.menuCheck}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    aria-hidden="true"
                  >
                    <path d="M5 12l4 4L19 6" />
                  </svg>
                </DropdownMenu.ItemIndicator>
                <span className={styles.menuText}>{r.name}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className={styles.menuSeparator} />
          <DropdownMenu.Item className={styles.menuItem} onSelect={onRename}>
            <span className={styles.menuText}>{t('raffles.switcher.rename')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={`${styles.menuItem} ${styles.menuDanger}`}
            onSelect={onDelete}
          >
            <span className={styles.menuText}>{t('raffles.switcher.delete')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
