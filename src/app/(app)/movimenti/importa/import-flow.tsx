'use client';

import Link from 'next/link';
import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from 'react';
import type { Account } from '@/data/accounts';
import { ACCOUNT_KIND_LABELS, BANK_FORMAT_LABELS } from '@/domain/accounts/schemas';
import { formatSignedCents } from '@/domain/budget/format-currency';
import { getBankFormatPreset, type PresetId } from '@/domain/import/presets';
import { formatBookedOn } from '@/domain/transactions/dates';
import { LockIcon, PlusIcon } from '../../../icons';
import { NewAccountForm } from '../../conti/new-account-form';
import sheet from '../../sheet-page.module.css';
import nuovo from '../nuovo/nuovo.module.css';
import { analyzeImportAction, confirmImportAction, type ImportFlowState } from './actions';
import styles from './importa.module.css';

const SELECTABLE_FORMATS = ['revolut', 'trade_republic'] as const satisfies readonly PresetId[];

export function ImportFlow({
  accounts,
  initialAccountId,
  accountLocked,
  from,
}: {
  accounts: Account[];
  initialAccountId: string | null;
  // Coming from an account page: import into that account, no choice asked.
  accountLocked: boolean;
  from: string;
}) {
  const [analyzeState, analyzeAction, analyzing] = useActionState<ImportFlowState, FormData>(
    analyzeImportAction,
    {},
  );
  const [confirmState, confirmAction, confirming] = useActionState<ImportFlowState, FormData>(
    confirmImportAction,
    {},
  );
  const [accountId, setAccountId] = useState<string | null>(initialAccountId);
  const [formatChoice, setFormatChoice] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  // What the preview was computed for. If the person changes account, format
  // or file afterwards, the preview is stale and the confirm button goes away.
  const [analyzedKey, setAnalyzedKey] = useState<string | null>(null);

  // After "Nuovo conto" the page re-renders with the new account in the list:
  // select the one we did not know about.
  const knownIds = useRef(new Set(accounts.map((a) => a.id)));
  useEffect(() => {
    const added = accounts.find((a) => !knownIds.current.has(a.id));
    knownIds.current = new Set(accounts.map((a) => a.id));
    if (added) setAccountId(added.id);
  }, [accounts]);

  const closeNewAccount = useCallback(() => setCreating(false), []);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const accountPreset = account ? getBankFormatPreset(account.bankFormat) : null;
  const formatId = account?.bankFormat && accountPreset ? account.bankFormat : formatChoice;
  const currentKey = file
    ? `${accountId}|${formatId}|${file.name}|${file.size}|${file.lastModified}`
    : null;

  const preview = analyzeState.preview;
  const previewFresh = preview !== undefined && analyzedKey !== null && analyzedKey === currentKey;
  const error = confirmState.error ?? analyzeState.error;

  // Not `<form action>`: React 19 resets the form after a Server Action, which
  // would empty the file input and make the person pick the file again to
  // confirm. The File lives in state and the data is sent by hand instead.
  function send(action: (data: FormData) => void) {
    if (!file || !accountId) return;
    const data = new FormData();
    data.set('accountId', accountId);
    data.set('formatId', formatId);
    data.set('file', file);
    data.set('da', from);
    startTransition(() => action(data));
  }

  if (creating) {
    return (
      <div className={styles.creating}>
        <div className={styles.creatingHeader}>
          <strong>Nuovo conto</strong>
          <button type="button" className="glass-btn" onClick={closeNewAccount}>
            Annulla
          </button>
        </div>
        <NewAccountForm onCreated={closeNewAccount} />
      </div>
    );
  }

  return (
    <form
      className={sheet.form}
      onSubmit={(e) => {
        e.preventDefault();
        setAnalyzedKey(currentKey);
        send(analyzeAction);
      }}
    >
      <div className={sheet.scroll}>
        {accountLocked && account ? (
          <div>
            <div className={nuovo.label}>Importa in</div>
            <p>
              <strong>{account.name}</strong> <small>{ACCOUNT_KIND_LABELS[account.kind]}</small>
            </p>
          </div>
        ) : (
          <div>
            <div className={nuovo.label}>Conto</div>
            <div className={nuovo.row}>
              {accounts.map((a) => (
                <label key={a.id} className="chip">
                  <input
                    type="radio"
                    name="accountId"
                    value={a.id}
                    checked={accountId === a.id}
                    onChange={() => setAccountId(a.id)}
                  />
                  {a.visibility === 'private' && <LockIcon size={11} />}
                  {a.name}
                  <small>{ACCOUNT_KIND_LABELS[a.kind]}</small>
                </label>
              ))}
              <button type="button" className="chip chip-dashed" onClick={() => setCreating(true)}>
                <PlusIcon size={12} /> Nuovo conto
              </button>
            </div>
            {accounts.length === 0 && (
              <p className={styles.hint}>Per importare un file serve prima un conto o una carta.</p>
            )}
          </div>
        )}

        {account && (
          <div>
            <div className={nuovo.label}>Formato del file</div>
            {accountPreset ? (
              <p className={styles.format}>
                {BANK_FORMAT_LABELS[account.bankFormat as PresetId]}
                <small> · impostato sul conto</small>
              </p>
            ) : (
              <div className={nuovo.wrap}>
                {SELECTABLE_FORMATS.map((id) => (
                  <label key={id} className="chip">
                    <input
                      type="radio"
                      name="formatId"
                      value={id}
                      checked={formatChoice === id}
                      onChange={() => setFormatChoice(id)}
                    />
                    {BANK_FORMAT_LABELS[id]}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className={nuovo.label} htmlFor="file" style={{ display: 'block' }}>
            File dell’estratto conto (CSV)
          </label>
          {/* The browser's own file button is grey, in the browser's language and
              not in the app's type: the real input stays (hidden, focusable) and
              this label is what the person sees. */}
          <label htmlFor="file" className={`glass-field ${styles.filePicker}`}>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className={styles.fileInput}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="chip">{file ? 'Cambia file' : 'Scegli il file'}</span>
            <span className={styles.fileName}>{file ? file.name : 'Nessun file scelto'}</span>
          </label>
        </div>

        {previewFresh && preview && (
          <section className={`glass-card ${styles.preview}`} aria-label="Anteprima dell’import">
            <p className={styles.recognized}>
              Riconosciuto: <strong>{preview.formatLabel}</strong> · {preview.rowsRead} movimenti
            </p>
            <div className={styles.counters}>
              <div>
                <strong>{preview.freshCount}</strong>
                <span>nuovi</span>
              </div>
              <div>
                <strong>{preview.duplicateCount}</strong>
                <span>già presenti</span>
              </div>
            </div>
            <ul className={styles.sample}>
              {preview.sample.map((row, i) => (
                <li key={i} data-duplicate={row.duplicate}>
                  <span>{formatBookedOn(row.bookedOn)}</span>
                  <span className={styles.desc}>{row.description}</span>
                  <span className={styles.amount}>{formatSignedCents(row.amountCents)}</span>
                  {row.duplicate && <em>già presente</em>}
                </li>
              ))}
            </ul>
            {preview.rowsRead > preview.sample.length && (
              <p className={styles.hint}>… e altri {preview.rowsRead - preview.sample.length}.</p>
            )}
            {preview.freshCount === 0 && (
              <p className={styles.hint}>
                Tutti i movimenti di questo file sono già stati importati: non c’è niente da
                aggiungere.
              </p>
            )}
            <p className={styles.hint}>
              I movimenti entrano senza categoria: la categorizzazione automatica arriva più avanti.
            </p>
          </section>
        )}

        <p role="alert" aria-live="polite" className={nuovo.error}>
          {error}
        </p>
      </div>

      <div className={sheet.footer}>
        {previewFresh && preview && preview.freshCount > 0 ? (
          <button
            type="button"
            onClick={() => send(confirmAction)}
            className="btn-primary"
            style={{ padding: '15px 0' }}
            disabled={confirming}
          >
            {confirming ? 'Attendi…' : `Importa ${preview.freshCount} movimenti`}
          </button>
        ) : (
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '15px 0' }}
            disabled={analyzing || !account || !file || (!accountPreset && !formatChoice)}
          >
            {analyzing ? 'Attendi…' : 'Controlla il file'}
          </button>
        )}
        <Link href={from} className="glass-btn" style={{ padding: '0 20px' }}>
          Annulla
        </Link>
      </div>
    </form>
  );
}
