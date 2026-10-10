/** Capabilities (MDF-19): Marketplace, Installed, who-has-what matrix, role bundles. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderOpen, Puzzle, Search, Trash2 } from 'lucide-react';
import {
  Avatar, Badge, Button, Card, Combobox, Dialog, DialogContent, EmptyState, Input, Kbd, Select,
  Skeleton, Table, TBody, TD, TH, THead, TR, Tabs, TabsContent, TabsList, TabsTrigger,
  ToastProvider, Tooltip, useToast
} from '@/ui';
import { useFloor } from '../../data/hive';
import type { PaperRoute } from '../../routes';
import { COPY } from './copy';
import {
  TABS, TYPE_FILTERS, RISK_FILTERS,
  allCapabilities, applyBundle, applyBundleToMany, capIndex, cloneGrants,
  diffGrants, filterMarketplace, giveToAll, hasGrant, installedItems, installSkill,
  isRisky, loadStore, marketplaceItems, matrixAgents, matrixColumns, mergeLiveSkills,
  riskTone, saveBundle, setGrant, setMcpEnabled, skillsBridge,
  uninstallCap, usedBy, writeStore,
  type CapKind, type Capability, type CapsStore, type RiskFilter, type TabId, type TypeFilter
} from './model';
import '../../common/common.css';
import './capabilities.css';

export const route: PaperRoute = 'capabilities';

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
}

function providerLabel(cap: Capability): string {
  if (cap.kind === 'mcp') return COPY.sourceMcp;
  return cap.provider ? COPY.provider[cap.provider] : '—';
}

export function Screen(): JSX.Element {
  return (
    <ToastProvider>
      <CapabilitiesInner />
    </ToastProvider>
  );
}

function CapabilitiesInner(): JSX.Element {
  const floor = useFloor();
  const toast = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const pendingRisk = useRef<(() => void) | null>(null);
  const [tab, setTab] = useState<TabId>('marketplace');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [risk, setRisk] = useState<RiskFilter>('all');
  const [store, setStore] = useState<CapsStore>(() => loadStore([]));
  const [caps, setCaps] = useState<Capability[]>(() => allCapabilities());
  const [draft, setDraft] = useState<Record<string, string[]>>(() => cloneGrants(store.grants));
  const [catalogOffline, setCatalogOffline] = useState(false);
  const [marketStatus, setMarketStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [installedStatus, setInstalledStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [matrixStatus, setMatrixStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [applyOpen, setApplyOpen] = useState(false);
  const [riskCap, setRiskCap] = useState<Capability | null>(null);
  const [uninstallCapState, setUninstallCapState] = useState<Capability | null>(null);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [bundleId, setBundleId] = useState('developer');
  const [bundleAgent, setBundleAgent] = useState('');
  const [focus, setFocus] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [selectedInstalled, setSelectedInstalled] = useState(0);

  const agents = useMemo(() => matrixAgents(floor.agents), [floor.agents]);
  const byId = useMemo(() => capIndex(caps), [caps]);
  const agentKey = floor.agents.map((a) => a.id).join(',');

  const commit = useCallback((next: CapsStore) => {
    setStore(next);
    writeStore(next);
  }, []);

  useEffect(() => {
    if (!floor.loaded) return;
    const seeded = loadStore(matrixAgents(floor.agents));
    const bridge = skillsBridge();
    if (!bridge) {
      setStore(seeded);
      setDraft(cloneGrants(seeded.grants));
      setCaps(allCapabilities());
      setMarketStatus('ready');
      setInstalledStatus('ready');
      setMatrixStatus('ready');
      return;
    }
    let cancelled = false;
    setMarketStatus('loading');
    void (async () => {
      try {
        const [local, cat] = await Promise.all([
          bridge.skillsLocal?.().catch(() => []),
          bridge.skillsCatalog?.().catch(() => ({ skills: [] as Array<{ name: string; description: string; url: string; category: string; owner: string }>, error: 'offline' }))
        ]);
        if (cancelled) return;
        const merged = mergeLiveSkills(seeded, local ?? [], cat?.skills ?? []);
        writeStore(merged.store);
        setStore(merged.store);
        setDraft(cloneGrants(merged.store.grants));
        setCaps(merged.caps);
        const offline = Boolean(cat && 'error' in cat && cat.error) || (cat?.skills?.length === 0);
        setCatalogOffline(offline);
        setMarketStatus(offline ? 'error' : 'ready');
        setInstalledStatus('ready');
        setMatrixStatus('ready');
      } catch {
        if (cancelled) return;
        setStore(seeded);
        setDraft(cloneGrants(seeded.grants));
        setCaps(allCapabilities());
        setCatalogOffline(true);
        setMarketStatus('error');
        setInstalledStatus('ready');
        setMatrixStatus('ready');
      }
    })();
    return () => { cancelled = true; };
  }, [floor.loaded, agentKey]);

  useEffect(() => {
    if (!bundleAgent && agents[0]) setBundleAgent(agents[0].id);
  }, [agents, bundleAgent]);

  const marketAll = useMemo(
    () => marketplaceItems(store, caps, catalogOffline && marketStatus !== 'ready'),
    [store, caps, catalogOffline, marketStatus]
  );
  const marketShown = useMemo(
    () => filterMarketplace(marketAll, query, type, risk),
    [marketAll, query, type, risk]
  );
  const installed = useMemo(() => installedItems(store, caps), [store, caps]);
  const installedShown = useMemo(
    () => installed.filter((c) => filterMarketplace([c], query, type, risk).length > 0),
    [installed, query, type, risk]
  );
  const columns = useMemo(() => matrixColumns(store, caps), [store, caps]);
  const diffs = useMemo(
    () => diffGrants(store.grants, draft, agents, byId),
    [store.grants, draft, agents, byId]
  );
  const dirty = diffs.length > 0;
  const changeCount = diffs.reduce((n, d) => n + d.added.length + d.removed.length, 0);
  const bundles = store.bundles;
  const selectedBundle = bundles.find((b) => b.id === bundleId) ?? bundles[0];

  const askRisk = useCallback((cap: Capability, action: () => void) => {
    if (!isRisky(cap)) {
      action();
      return;
    }
    pendingRisk.current = action;
    setRiskCap(cap);
  }, []);

  const confirmRisk = useCallback(() => {
    const fn = pendingRisk.current;
    pendingRisk.current = null;
    const cap = riskCap;
    setRiskCap(null);
    if (cap && cap.kind === 'mcp' && !store.mcpEnabled[cap.slug]) {
      commit(setMcpEnabled(store, cap, true));
    }
    fn?.();
  }, [commit, riskCap, store]);

  const toggleCell = useCallback((agentId: string, cap: Capability) => {
    const on = !hasGrant(draft, agentId, cap.id);
    const go = (): void => setDraft((d) => setGrant(d, agentId, cap.id, on));
    if (on) askRisk(cap, go);
    else go();
  }, [askRisk, draft]);

  const giveColumn = useCallback((cap: Capability, on: boolean) => {
    const ids = agents.map((a) => a.id);
    const go = (): void => setDraft((d) => giveToAll(d, ids, cap.id, on));
    if (on) askRisk(cap, go);
    else go();
  }, [agents, askRisk]);

  const onInstall = useCallback(async (cap: Capability) => {
    if (cap.kind === 'mcp') {
      const go = (): void => {
        commit(setMcpEnabled(store, cap, true));
        toast(COPY.toastEnabled(cap.name));
      };
      askRisk(cap, go);
      return;
    }
    const bridge = skillsBridge();
    if (bridge?.skillsInstall && cap.url) {
      try {
        const res = await bridge.skillsInstall(cap.url, cap.name);
        if (!res.ok) {
          toast(res.error || COPY.toastInstallFail);
          return;
        }
      } catch {
        toast(COPY.toastInstallFail);
        return;
      }
    }
    commit(installSkill(store, cap));
    toast(COPY.toastInstalled(cap.name));
  }, [askRisk, commit, store, toast]);

  const onDisableMcp = useCallback((cap: Capability) => {
    commit(setMcpEnabled(store, cap, false));
    setDraft((d) => {
      const next = cloneGrants(d);
      for (const id of Object.keys(next)) next[id] = next[id].filter((x) => x !== cap.id);
      return next;
    });
    toast(COPY.toastDisabled(cap.name));
  }, [commit, store, toast]);

  const onUninstall = useCallback(async (cap: Capability) => {
    const bridge = skillsBridge();
    if (cap.kind === 'skill' && bridge?.skillsUninstall && cap.path) {
      try {
        const res = await bridge.skillsUninstall(cap.path);
        if (!res.ok) {
          toast(res.error || COPY.toastInstallFail);
          return;
        }
      } catch {
        toast(COPY.toastInstallFail);
        return;
      }
    }
    const next = uninstallCap(store, cap);
    commit(next);
    setDraft((d) => {
      const g = cloneGrants(d);
      for (const id of Object.keys(g)) g[id] = g[id].filter((x) => x !== cap.id);
      return g;
    });
    setUninstallCapState(null);
    toast(COPY.toastUninstalled(cap.name));
  }, [commit, store, toast]);

  const onReveal = useCallback(async (cap: Capability) => {
    const bridge = skillsBridge();
    if (bridge?.skillsReveal && cap.path) {
      try {
        await bridge.skillsReveal(cap.path);
        toast(COPY.toastRevealOk);
        return;
      } catch { /* fall through */ }
    }
    toast(COPY.toastReveal);
  }, [toast]);

  const onApply = useCallback(() => {
    const mcpEnabled = { ...store.mcpEnabled };
    for (const list of Object.values(draft)) {
      for (const id of list) {
        if (id.startsWith('mcp:')) mcpEnabled[id.slice(4)] = true;
      }
    }
    commit({ ...store, mcpEnabled, grants: cloneGrants(draft) });
    setApplyOpen(false);
    const n = diffs.filter((d) => d.needsRestart).length;
    toast(COPY.toastApplied(n));
  }, [commit, diffs, draft, store, toast]);

  const onCancelDraft = useCallback(() => {
    setDraft(cloneGrants(store.grants));
    toast(COPY.toastCancelled);
  }, [store.grants, toast]);

  const fillBundle = useCallback((all: boolean) => {
    if (!selectedBundle) return;
    if (all) {
      setDraft((d) => applyBundleToMany(d, agents.map((a) => a.id), selectedBundle));
      toast(COPY.toastFilledAll(selectedBundle.name, agents.length));
      return;
    }
    const id = bundleAgent || agents[0]?.id;
    if (!id) return;
    setDraft((d) => applyBundle(d, id, selectedBundle));
    const name = agents.find((a) => a.id === id)?.name ?? id;
    toast(COPY.toastFilled(selectedBundle.name, name));
  }, [agents, bundleAgent, selectedBundle, toast]);

  const onSaveBundle = useCallback(() => {
    const id = bundleAgent || agents[0]?.id;
    if (!id) return;
    const next = saveBundle(store, bundleName, id, draft);
    commit(next);
    const saved = next.bundles[next.bundles.length - 1];
    setBundleId(saved.id);
    setBundleOpen(false);
    setBundleName('');
    toast(COPY.toastBundle(saved.name));
  }, [agents, bundleAgent, bundleName, commit, draft, store, toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (isTyping(e.target) && (e.target as HTMLElement).tagName !== 'INPUT') return;
        e.preventDefault();
        if (dirty) setApplyOpen(true);
        else toast(COPY.nothingQueued);
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === '1') { setTab('marketplace'); return; }
      if (e.key === '2') { setTab('installed'); return; }
      if (e.key === '3') { setTab('matrix'); return; }
      if (e.key === 'n') { e.preventDefault(); setBundleOpen(true); return; }
      if (e.key === 'Escape' && dirty && tab === 'matrix') { onCancelDraft(); return; }
      if (tab === 'installed' && installedShown.length) {
        if (e.key === 'j') {
          setSelectedInstalled((i) => Math.min(installedShown.length - 1, i + 1));
          return;
        }
        if (e.key === 'k') {
          setSelectedInstalled((i) => Math.max(0, i - 1));
          return;
        }
      }
      if (tab !== 'matrix' || !agents.length || !columns.length) return;
      const maxR = agents.length - 1;
      const maxC = columns.length - 1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((f) => ({ ...f, row: Math.min(maxR, f.row + 1) }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus((f) => ({ ...f, row: Math.max(0, f.row - 1) }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocus((f) => ({ ...f, col: Math.min(maxC, f.col + 1) }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocus((f) => ({ ...f, col: Math.max(0, f.col - 1) }));
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const a = agents[Math.min(maxR, Math.max(0, focus.row))];
        const c = columns[Math.min(maxC, Math.max(0, focus.col))];
        if (a && c) toggleCell(a.id, c);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agents, columns, dirty, focus.col, focus.row, installedShown.length, onCancelDraft, tab, toast, toggleCell]);

  useEffect(() => {
    function onCmd(e: Event): void {
      const d = (e as CustomEvent<{ tab?: TabId; apply?: boolean; search?: boolean }>).detail;
      if (d?.tab) setTab(d.tab);
      if (d?.apply) setApplyOpen(true);
      if (d?.search) searchRef.current?.focus();
    }
    window.addEventListener('paper:caps', onCmd);
    return () => window.removeEventListener('paper:caps', onCmd);
  }, []);

  useEffect(() => {
    if (tab !== 'matrix') return;
    const cell = document.querySelector<HTMLElement>(`[data-cell="${focus.row}-${focus.col}"]`);
    cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focus, tab]);

  const retryMarket = (): void => {
    setCatalogOffline(false);
    setMarketStatus('ready');
    setCaps(allCapabilities());
  };

  return (
    <div className="pc-screen pcp-root">
      <header className="pcp-toolbar">
        <div className="pcp-toolbar-top">
          <div>
            <h1>{COPY.title}</h1>
            <p className="pcp-lede">
              <span className="pc-mode" data-mode={floor.mode} title={floor.mode === 'live' ? COPY.liveHint : COPY.demoHint}>
                <span className="pc-dot" />
                {floor.mode === 'live' ? COPY.live : COPY.demo}
              </span>
              <span>{COPY.lede}</span>
              <span>{COPY.countMarket(marketShown.length)} · {COPY.countInstalled(installed.length)}</span>
              {dirty ? <Badge tone="accent">{COPY.pending(changeCount)}</Badge> : null}
            </p>
          </div>
          <div className="pcp-hint">
            <span><Kbd>/</Kbd> {COPY.keys.search}</span>
            <span><Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd> {COPY.keys.tabs}</span>
            <span><Kbd>Cmd+Enter</Kbd> {COPY.keys.apply}</span>
          </div>
        </div>
        <div className="pcp-filters">
          <div className="pcp-search">
            <Search size={14} aria-hidden="true" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={COPY.searchPlaceholder}
              aria-label={COPY.searchLabel}
            />
          </div>
          <Select
            aria-label={COPY.typeFilter}
            value={type}
            onValueChange={(v) => setType(v as TypeFilter)}
            options={TYPE_FILTERS.map((v) => ({ value: v, label: COPY.types[v] }))}
          />
          <Select
            aria-label={COPY.riskFilter}
            value={risk}
            onValueChange={(v) => setRisk(v as RiskFilter)}
            options={RISK_FILTERS.map((v) => ({ value: v, label: COPY.risks[v] }))}
          />
          {dirty ? (
            <>
              <Button size="sm" variant="secondary" onClick={onCancelDraft}>{COPY.cancel}</Button>
              <Button size="sm" onClick={() => setApplyOpen(true)}>{COPY.apply}</Button>
            </>
          ) : null}
        </div>
      </header>

      <Tabs className="pcp-tabs" value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList aria-label={COPY.title}>
          {TABS.map((id) => (
            <TabsTrigger key={id} value={id}>{COPY.tabs[id]}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent className="pcp-tab" value="marketplace">
          {catalogOffline ? <div className="pcp-banner" role="status">{COPY.catalogOffline}</div> : null}
          {marketStatus === 'loading' ? (
            <div className="pcp-skel-grid" aria-busy="true" aria-label={COPY.loading}>
              {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="pcp-skel-card" />)}
            </div>
          ) : marketStatus === 'error' && !catalogOffline ? (
            <EmptyState
              icon={<Puzzle size={28} />}
              title={COPY.errorMarket.title}
              description={COPY.errorMarket.body}
              action={<Button size="sm" onClick={retryMarket}>{COPY.retry}</Button>}
            />
          ) : marketShown.length === 0 ? (
            <EmptyState
              icon={<Puzzle size={28} />}
              title={query || type !== 'all' || risk !== 'all' ? COPY.emptyFiltered.title : COPY.emptyMarket.title}
              description={query || type !== 'all' || risk !== 'all' ? COPY.emptyFiltered.body : COPY.emptyMarket.body}
            />
          ) : (
            <div className="pcp-grid">
              {marketShown.map((cap) => {
                const on = cap.kind === 'skill' ? store.installed.includes(cap.id) : !!store.mcpEnabled[cap.slug];
                return (
                  <Card key={cap.id} className="pcp-card">
                    <h3>{cap.name}</h3>
                    <p>{cap.description}</p>
                    <div className="pcp-card-meta">
                      <Badge>{COPY.kind[cap.kind]}</Badge>
                      {cap.risk ? <Badge tone={riskTone(cap.risk)}>{COPY.tier[cap.risk]}</Badge> : null}
                      {cap.kind === 'skill' ? <Badge tone="neutral">{providerLabel(cap)}</Badge> : null}
                    </div>
                    <div className="pcp-card-actions">
                      {cap.kind === 'skill' ? (
                        <Button size="sm" disabled={on} onClick={() => void onInstall(cap)}>
                          {on ? COPY.installed : COPY.install}
                        </Button>
                      ) : on ? (
                        <Button size="sm" variant="secondary" onClick={() => onDisableMcp(cap)}>{COPY.disable}</Button>
                      ) : (
                        <Button size="sm" onClick={() => void onInstall(cap)}>{COPY.enable}</Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent className="pcp-tab" value="installed">
          {installedStatus === 'loading' ? (
            <div className="pcp-skel-grid" aria-busy="true" aria-label={COPY.loading}>
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="pcp-skel-card" />)}
            </div>
          ) : installedStatus === 'error' ? (
            <EmptyState
              title={COPY.errorInstalled.title}
              description={COPY.errorInstalled.body}
              action={<Button size="sm" onClick={() => setInstalledStatus('ready')}>{COPY.retry}</Button>}
            />
          ) : installedShown.length === 0 ? (
            <EmptyState
              icon={<Puzzle size={28} />}
              title={installed.length === 0 ? COPY.emptyInstalled.title : COPY.emptyFiltered.title}
              description={installed.length === 0 ? COPY.emptyInstalled.body : COPY.emptyFiltered.body}
            />
          ) : (
            <div className="pcp-table-wrap">
              <Table>
                <THead>
                  <TR>
                    <TH>{COPY.colName}</TH>
                    <TH>{COPY.colType}</TH>
                    <TH>{COPY.colSource}</TH>
                    <TH>{COPY.colUsedBy}</TH>
                    <TH>{COPY.colActions}</TH>
                  </TR>
                </THead>
                <TBody>
                  {installedShown.map((cap, i) => {
                    const users = usedBy(store.grants, cap.id, agents.filter((a) => !a.id.startsWith('demo-agent-')));
                    const names = users.slice(0, 3).map((a) => a.name);
                    return (
                      <TR key={cap.id} data-selected={i === selectedInstalled ? 'true' : undefined}>
                        <TD>
                          <strong>{cap.name}</strong>
                          {cap.risk ? <> {' '}<Badge tone={riskTone(cap.risk)}>{COPY.tier[cap.risk]}</Badge></> : null}
                        </TD>
                        <TD>{COPY.kind[cap.kind]}</TD>
                        <TD>{providerLabel(cap)}</TD>
                        <TD>
                          <div className="pcp-used">
                            {users.length === 0 ? COPY.usedByNone : names.join(', ')}
                            {users.length > 3 ? <Badge>{COPY.moreUsers(users.length - 3)}</Badge> : null}
                          </div>
                        </TD>
                        <TD>
                          <div className="pcp-actions">
                            {cap.kind === 'skill' ? (
                              <Tooltip content={COPY.reveal}>
                                <Button size="sm" variant="ghost" onClick={() => void onReveal(cap)}>
                                  <FolderOpen size={14} /> {COPY.reveal}
                                </Button>
                              </Tooltip>
                            ) : null}
                            <Button size="sm" variant="danger" onClick={() => setUninstallCapState(cap)}>
                              <Trash2 size={14} /> {COPY.uninstall}
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent className="pcp-tab" value="matrix">
          {matrixStatus === 'error' ? (
            <EmptyState
              title={COPY.errorMatrix.title}
              description={COPY.errorMatrix.body}
              action={<Button size="sm" onClick={() => setMatrixStatus('ready')}>{COPY.retry}</Button>}
            />
          ) : (
            <>
              <div className="pcp-matrix-bar">
                <Select
                  aria-label={COPY.bundle}
                  value={selectedBundle?.id ?? 'developer'}
                  onValueChange={setBundleId}
                  options={bundles.map((b) => ({ value: b.id, label: b.name }))}
                  placeholder={COPY.bundlePlaceholder}
                />
                <Combobox
                  aria-label={COPY.bundleAgent}
                  value={bundleAgent || agents[0]?.id}
                  onChange={setBundleAgent}
                  placeholder={COPY.bundleAgent}
                  options={agents.map((a) => ({ value: a.id, label: a.name }))}
                />
                <Button size="sm" variant="secondary" onClick={() => fillBundle(false)}>{COPY.bundleFill}</Button>
                <Button size="sm" variant="secondary" onClick={() => fillBundle(true)}>{COPY.bundleFillAll}</Button>
                <Button size="sm" variant="ghost" onClick={() => setBundleOpen(true)}>{COPY.bundleSave}</Button>
              </div>
              <div className="pcp-matrix-wrap" tabIndex={0} aria-label={COPY.tabs.matrix}>
                <table className="pcp-matrix">
                  <thead>
                    <tr>
                      <th>{COPY.agentCol}</th>
                      {columns.map((cap, col) => {
                        const allOn = agents.every((a) => hasGrant(draft, a.id, cap.id));
                        return (
                          <th key={cap.id} className="pcp-colhead" title={cap.name}>
                            <div className="pcp-colhead-inner">
                              <button
                                type="button"
                                className="pcp-give"
                                aria-label={allOn ? `Revoke ${cap.name} from all agents` : `Give ${cap.name} to all agents`}
                                onClick={() => giveColumn(cap, !allOn)}
                              >
                                {allOn ? COPY.revokeAll : COPY.giveToAll}
                              </button>
                              <span className="pcp-colname">{cap.name}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent, row) => {
                      const pending = diffs.some((d) => d.agentId === agent.id);
                      return (
                        <tr key={agent.id}>
                          <td>
                            <div className="pcp-agent">
                              <Avatar name={agent.name} size="sm" />
                              <span className="pcp-agent-name">{agent.name}</span>
                              {pending ? <Badge tone="accent">{COPY.dirty}</Badge> : null}
                            </div>
                          </td>
                          {columns.map((cap, col) => {
                            const on = hasGrant(draft, agent.id, cap.id);
                            const was = hasGrant(store.grants, agent.id, cap.id);
                            return (
                              <td
                                key={cap.id}
                                className="pcp-cell"
                                data-cell={`${row}-${col}`}
                                data-dirty={on !== was ? 'true' : 'false'}
                                data-focus={focus.row === row && focus.col === col ? 'true' : 'false'}
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  aria-label={`${agent.name} · ${cap.name}`}
                                  onChange={() => {
                                    setFocus({ row, col });
                                    toggleCell(agent.id, cap);
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent title={COPY.applyTitle} description={COPY.applyDesc}>
          <div className="pcp-diff">
            {diffs.length === 0 ? <p>{COPY.nothingQueued}</p> : diffs.map((d) => (
              <div key={d.agentId} className="pcp-diff-agent">
                <strong>
                  {d.agentName}
                  {d.needsRestart ? <Badge tone="warning">{COPY.restart}</Badge> : null}
                </strong>
                <ul className="pcp-diff-list">
                  {d.added.map((c) => (
                    <li key={`+${c.id}`} className="pcp-diff-add">+ {c.name} ({COPY.kind[c.kind as CapKind]})</li>
                  ))}
                  {d.removed.map((c) => (
                    <li key={`-${c.id}`} className="pcp-diff-rem">− {c.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pcp-dialog-actions">
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>{COPY.cancel}</Button>
            <Button onClick={onApply} disabled={diffs.length === 0}>{COPY.applyConfirm}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!riskCap} onOpenChange={(o) => { if (!o) { setRiskCap(null); pendingRisk.current = null; } }}>
        <DialogContent title={COPY.riskTitle} description={COPY.riskDesc}>
          {riskCap ? (
            <p>
              <Badge tone={riskTone(riskCap.risk)}>{riskCap.risk ? COPY.tier[riskCap.risk] : ''}</Badge>
              {' '}{riskCap.name}
            </p>
          ) : null}
          <div className="pcp-dialog-actions">
            <Button variant="secondary" onClick={() => { setRiskCap(null); pendingRisk.current = null; }}>{COPY.cancel}</Button>
            <Button onClick={confirmRisk}>{COPY.riskConfirm}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!uninstallCapState} onOpenChange={(o) => { if (!o) setUninstallCapState(null); }}>
        <DialogContent title={COPY.uninstallTitle} description={COPY.uninstallDesc}>
          {uninstallCapState ? <p>{uninstallCapState.name}</p> : null}
          <div className="pcp-dialog-actions">
            <Button variant="secondary" onClick={() => setUninstallCapState(null)}>{COPY.cancel}</Button>
            <Button variant="danger" onClick={() => uninstallCapState && void onUninstall(uninstallCapState)}>{COPY.uninstall}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bundleOpen} onOpenChange={setBundleOpen}>
        <DialogContent title={COPY.bundleSave} description={COPY.bundleName}>
          <Input
            value={bundleName}
            onChange={(e) => setBundleName(e.target.value)}
            placeholder={COPY.bundleNamePh}
            aria-label={COPY.bundleName}
          />
          <div className="pcp-dialog-actions">
            <Button variant="secondary" onClick={() => setBundleOpen(false)}>{COPY.cancel}</Button>
            <Button onClick={onSaveBundle} disabled={!bundleName.trim()}>{COPY.bundleSaveAction}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
