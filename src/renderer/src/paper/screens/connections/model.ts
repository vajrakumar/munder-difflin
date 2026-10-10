/** Connections (MDF-20): list/add/test REST integrations. Secrets never return. */
import {
  INTEGRATION_TEMPLATES,
  authTypeNeedsSecret,
  type IntegrationAuthType,
  type IntegrationRecord,
  type IntegrationTemplate
} from '@shared/integrations';
import {
  integrationsClient,
  slugify,
  type IntegrationRecordView,
  type TestResult
} from '@/integrations/registryClient';

export type { IntegrationAuthType, IntegrationRecordView, IntegrationTemplate, TestResult };
export { INTEGRATION_TEMPLATES, authTypeNeedsSecret, slugify };

export type ConnStatus = 'ok' | 'failing' | 'untested';

export interface ConnSource {
  mode: 'live' | 'demo';
  templates(): Promise<IntegrationTemplate[]>;
  list(): Promise<IntegrationRecordView[]>;
  save(record: IntegrationRecord, secret?: string): Promise<{ ok: boolean; error?: string }>;
  remove(id: string): Promise<{ ok: boolean }>;
  test(id: string): Promise<TestResult>;
}

function liveBridge(): boolean {
  try {
    const c = (window as { cth?: { integrationsList?: unknown } }).cth;
    return typeof c?.integrationsList === 'function';
  } catch {
    return false;
  }
}

let seeded = false;

async function seedDemo(): Promise<void> {
  if (seeded) return;
  seeded = true;
  const existing = await integrationsClient.list();
  if (existing.length) return;
  const gh = INTEGRATION_TEMPLATES.find((t) => t.kind === 'github');
  const custom = INTEGRATION_TEMPLATES.find((t) => t.idSuggestion === 'my-api');
  const linear = INTEGRATION_TEMPLATES.find((t) => t.idSuggestion === 'linear');
  const now = Date.now();
  if (gh) {
    await integrationsClient.save({
      id: 'github', label: gh.label, kind: gh.kind, baseUrl: gh.baseUrl,
      authType: gh.authType, enabled: true, createdAt: now - 86_400_000, updatedAt: now
    }, 'ghp_demo_never_echoed');
  }
  if (linear) {
    await integrationsClient.save({
      id: 'linear', label: linear.label, kind: linear.kind, baseUrl: linear.baseUrl,
      authType: linear.authType, authHeader: linear.authHeader, enabled: true,
      createdAt: now - 3_600_000, updatedAt: now
    }, 'lin_api_demo');
  }
  if (custom) {
    await integrationsClient.save({
      id: 'public-httpbin', label: 'httpbin (public)', kind: 'custom-rest',
      baseUrl: 'https://httpbin.org', authType: 'none', enabled: true,
      createdAt: now - 600_000, updatedAt: now
    });
  }
}

export function connectionsSource(): ConnSource {
  const demo = !liveBridge();
  return {
    mode: demo ? 'demo' : 'live',
    async templates() {
      if (demo) await seedDemo();
      return integrationsClient.listTemplates();
    },
    async list() {
      if (demo) await seedDemo();
      return integrationsClient.list();
    },
    save: (record, secret) => integrationsClient.save(record, secret),
    remove: (id) => integrationsClient.remove(id),
    async test(id) {
      const started = Date.now();
      const r = await integrationsClient.test(id);
      return { ...r, ms: r.ms ?? Date.now() - started };
    }
  };
}

export function statusOf(last: TestResult | undefined): ConnStatus {
  if (!last) return 'untested';
  return last.ok ? 'ok' : 'failing';
}

export function draftFromTemplate(t: IntegrationTemplate): Omit<IntegrationRecord, 'createdAt' | 'updatedAt'> {
  return {
    id: slugify(t.idSuggestion || t.label),
    label: t.label,
    kind: t.kind,
    baseUrl: t.baseUrl,
    authType: t.authType,
    authHeader: t.authHeader,
    enabled: true
  };
}
