import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Button, Card, PageHeader, SectionTitle, Segmented, Toggle, cx, inputCls } from '../components/ui'
import { TOPICS } from '../data/topics'
import { exportData, downloadJson, importData, resetAll } from '../lib/backup'
import { WEEKDAYS_LONG, todayStr } from '../lib/dates'
import { BLOCKS, db, type BlockKind, type DayType } from '../lib/db'
import { useT } from '../lib/i18n'
import { countTopicDaysDone, curriculumAt, offsetForTopic, rebuildDay } from '../lib/plan'
import { DEFAULT_SETTINGS, saveSettings, totalMinutes, useSettings } from '../lib/settings'

const BLOCK_LABEL: Record<BlockKind, string> = {
  review: 'Review',
  drills: 'Tense & structure drills',
  vocab: 'Active vocabulary',
  writing: 'Writing',
  speaking: 'Speaking',
}
const DAY_TYPES: { value: DayType; label: string }[] = [
  { value: 'topic', label: 'Topic' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'structure', label: 'Structure' },
]

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {hint && <span className="block text-sm text-stone-500 dark:text-stone-400">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)))

export function Settings() {
  const s = useSettings()
  const t = useT()
  const days = useLiveQuery(() => db.days.toArray(), [])
  const [msg, setMsg] = useState('')
  const [includeAudio, setIncludeAudio] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const today = todayStr()
  const done = countTopicDaysDone(days ?? [], today)
  const pos = curriculumAt(s, done)
  const total = totalMinutes(s)

  const setBlock = (k: BlockKind, v: string) => saveSettings({ blockMinutes: { ...s.blockMinutes, [k]: num(v, 0, 120) } })
  const scaleTo = (v: string) => {
    const target = num(v, 10, 240)
    const f = target / total
    const next = Object.fromEntries(BLOCKS.map((k) => [k, Math.max(1, Math.round(s.blockMinutes[k] * f))])) as Record<BlockKind, number>
    const diff = target - Object.values(next).reduce((a, b) => a + b, 0)
    const biggest = BLOCKS.reduce((a, b) => (next[a] >= next[b] ? a : b))
    next[biggest] = Math.max(1, next[biggest] + diff)
    void saveSettings({ blockMinutes: next })
  }
  const setWeek = (i: number, patch: Partial<{ type: DayType; call: boolean }>) => saveSettings({ week: s.week.map((w, j) => (j === i ? { ...w, ...patch } : w)) })
  const setDays = (i: number, v: string) => saveSettings({ curriculum: s.curriculum.map((c, j) => (j === i ? { ...c, days: num(v, 1, 30) } : c)) })
  const jump = async (idx: number) => {
    await saveSettings({ curriculumOffset: offsetForTopic(s, idx, done) })
    await rebuildDay(today)
    setMsg(t("Curriculum moved. Today's plan was updated."))
  }
  const apply = async () => {
    await rebuildDay(today)
    setMsg(t("Today's plan now uses these settings (blocks already done stay done)."))
  }
  const doExport = async () => {
    const data = await exportData(includeAudio)
    downloadJson(data, `paso-diario-backup-${today}.json`)
    await db.kv.put({ key: 'lastBackup', value: today })
  }
  const doImport = async (f: File) => {
    if (!confirm(t('Importing replaces ALL data on this device with the backup. Continue?'))) return
    try {
      const counts = await importData(await f.text())
      setMsg(t('Backup restored: {n} days, {c} cards, {m} mistakes.', { n: counts.days ?? 0, c: counts.cards ?? 0, m: counts.mistakes ?? 0 }))
    } catch (e) {
      setMsg(t(String((e as Error).message)))
    }
  }
  const doReset = async () => {
    if (!confirm(t('Delete ALL your data on this device? Export a backup first if you want to keep it.'))) return
    if (!confirm(t('Really delete everything?'))) return
    await resetAll()
    setMsg(t('All data deleted.'))
  }
  const lastBackup = useLiveQuery(() => db.kv.get('lastBackup').then((r) => (r?.value as string | undefined) ?? null), [])

  return (
    <div>
      <PageHeader title={t('Settings')} />
      {msg && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" role="status">
          {msg}
        </p>
      )}

      <SectionTitle>{t('Language')}</SectionTitle>
      <Card className="space-y-3">
        <Row label={t('Interface')} hint={t('Menus, buttons and messages')}>
          <Segmented value={s.uiLang} onChange={(v) => saveSettings({ uiLang: v })} options={[{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }]} />
        </Row>
        <Row label={t('Translation prompts')} hint={t('Language you translate from, and vocabulary glosses')}>
          <Segmented value={s.promptLang} onChange={(v) => saveSettings({ promptLang: v })} options={[{ value: 'en', label: 'English' }, { value: 'nl', label: 'Nederlands' }]} />
        </Row>
      </Card>

      <SectionTitle>{t('Practice')}</SectionTitle>
      <Card className="space-y-4">
        <Toggle checked={s.accentStrict} onChange={(v) => saveSettings({ accentStrict: v })} label={t('Accents required')} description={t('Off: missing accents count as correct (with a reminder).')} />
        <Toggle checked={s.transcript} onChange={(v) => saveSettings({ transcript: v })} label={t('Live es-MX transcript')} description={t('Shows what speech recognition heard while you record (Chrome / Safari).')} />
        <Row label={t('New words per day')}>
          <input type="number" inputMode="numeric" min={1} max={30} value={s.newWordsPerDay} onChange={(e) => saveSettings({ newWordsPerDay: num(e.target.value, 1, 30) })} className={cx(inputCls, '!w-20 !py-2 text-right')} />
        </Row>
      </Card>

      <SectionTitle>{t('Daily time budget')}</SectionTitle>
      <Card className="space-y-2">
        <Row label={t('Total per day')} hint={t('Changing it rescales all blocks')}>
          <input key={total} type="number" inputMode="numeric" defaultValue={total} onBlur={(e) => scaleTo(e.target.value)} className={cx(inputCls, '!w-20 !py-2 text-right')} aria-label={t('Total per day')} />
        </Row>
        <div className="border-t border-stone-100 pt-2 dark:border-stone-800">
          {BLOCKS.map((k) => (
            <Row key={k} label={t(BLOCK_LABEL[k])}>
              <input type="number" inputMode="numeric" value={s.blockMinutes[k]} onChange={(e) => setBlock(k, e.target.value)} className={cx(inputCls, '!w-20 !py-1.5 text-right')} aria-label={t(BLOCK_LABEL[k])} />
            </Row>
          ))}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">{t('A light day is always review + drills ({n} min).', { n: s.blockMinutes.review + s.blockMinutes.drills })}</p>
      </Card>

      <SectionTitle>{t('Weekly template')}</SectionTitle>
      <Card className="space-y-1">
        {s.week.map((w, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <span className="w-24 shrink-0 text-[15px] font-medium">{t(WEEKDAYS_LONG[i])}</span>
            <Segmented value={w.type} onChange={(v) => setWeek(i, { type: v })} options={DAY_TYPES.map((d) => ({ value: d.value, label: t(d.label) }))} />
            <button
              type="button"
              onClick={() => setWeek(i, { call: !w.call })}
              aria-pressed={w.call}
              title={t('Friend call replaces the speaking block')}
              className={cx('ml-auto rounded-lg p-2', w.call ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800')}
            >
              <Icon name="phone" className="size-4" />
            </button>
          </div>
        ))}
        <p className="pt-1 text-xs text-stone-500 dark:text-stone-400">
          {t('Topic = new curriculum topic (+ spiral review). Mixed = your weakest topics. Structure = word order, pronouns, connectors, relatives. 📞 = call with your friend instead of the speaking block.')}
        </p>
      </Card>

      <SectionTitle>{t('Curriculum')}</SectionTitle>
      <Card className="space-y-3">
        <p className="text-[15px]">
          {pos.finished
            ? t('Curriculum finished — topic days now target your weakest topics.')
            : t('Now: {topic} · day {d} of {n}', { topic: TOPICS.find((x) => x.id === pos.topic)?.name ?? '', d: pos.day, n: pos.of })}
        </p>
        <label className="block text-sm text-stone-500">
          {t('Jump to topic')}
          <select value={pos.finished ? '' : pos.index} onChange={(e) => jump(Number(e.target.value))} className={cx(inputCls, 'mt-1')}>
            {pos.finished && <option value="">—</option>}
            {s.curriculum.map((c, i) => (
              <option key={c.topic} value={i}>
                {i + 1}. {TOPICS.find((x) => x.id === c.topic)?.name}
              </option>
            ))}
          </select>
        </label>
        <details>
          <summary className="cursor-pointer text-sm text-stone-500 select-none">{t('Topic days per topic')}</summary>
          <div className="mt-2">
            {s.curriculum.map((c, i) => (
              <Row key={c.topic} label={`${i + 1}. ${TOPICS.find((x) => x.id === c.topic)?.short}`}>
                <input type="number" inputMode="numeric" min={1} max={30} value={c.days} onChange={(e) => setDays(i, e.target.value)} className={cx(inputCls, '!w-20 !py-1.5 text-right')} />
              </Row>
            ))}
            <Button variant="ghost" size="sm" onClick={() => saveSettings({ curriculum: DEFAULT_SETTINGS.curriculum, curriculumOffset: 0 })}>
              {t('Reset to default curriculum')}
            </Button>
          </div>
        </details>
      </Card>
      <Button variant="secondary" className="mt-3 w-full" icon="redo" onClick={apply}>
        {t("Apply to today's plan")}
      </Button>

      <SectionTitle>{t('Appearance')}</SectionTitle>
      <Card>
        <Row label={t('Theme')}>
          <Segmented
            value={s.theme}
            onChange={(v) => saveSettings({ theme: v })}
            options={[
              { value: 'system', label: t('Auto') },
              { value: 'light', label: t('Light') },
              { value: 'dark', label: t('Dark') },
            ]}
          />
        </Row>
      </Card>

      <SectionTitle>{t('Backup')}</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          {t('Everything is stored only in this browser. Export a backup regularly, or to move to another device.')}
          {lastBackup ? ` ${t('Last backup: {d}.', { d: lastBackup })}` : ''}
        </p>
        <Toggle checked={includeAudio} onChange={setIncludeAudio} label={t('Include voice recordings')} description={t('Makes the file much bigger.')} />
        <div className="grid grid-cols-2 gap-2">
          <Button icon="download" onClick={doExport}>
            {t('Export')}
          </Button>
          <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
            {t('Import')}
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
        <Button variant="ghost" className="w-full !text-rose-600" icon="trash" onClick={doReset}>
          {t('Delete all data')}
        </Button>
      </Card>

      <p className="mt-6 text-center text-xs text-stone-400">Paso Diario · {t('No account, no server — your data stays on this device.')}</p>
    </div>
  )
}
