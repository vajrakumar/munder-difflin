/** English strings for Connections (MDF-20). */
export const COPY = {
  title: 'Connections',
  lede: 'REST APIs agents can call without ever seeing the key.',
  live: 'Live',
  demo: 'Demo data',
  add: 'Add',
  test: 'Test',
  testing: 'Testing…',
  remove: 'Remove',
  save: 'Save',
  cancel: 'Cancel',
  empty: {
    title: 'No connections yet',
    body: 'Add a REST API. The secret stays in the broker; agents only get a handle.'
  },
  error: { title: 'Could not load connections', retry: 'Retry' },
  loading: 'Loading connections',
  name: 'Name',
  status: 'Status',
  baseUrl: 'Base URL',
  auth: 'Auth',
  ok: 'OK',
  failing: 'Failing',
  untested: 'Untested',
  addTitle: 'Add connection',
  template: 'Template',
  label: 'Label',
  authType: 'Auth type',
  headerName: 'Header name',
  secret: 'Secret',
  secretPlaceholder: 'Paste a key — it is never shown again',
  secretSaved: 'A secret is saved. Type a new one only to replace it.',
  enabled: 'Enabled for agents',
  testOk: (status: number, ms: number) => `HTTP ${status} in ${ms} ms`,
  testFail: (status: number | undefined, ms: number | undefined, error?: string) =>
    error
      ? `${error}${ms != null ? ` · ${ms} ms` : ''}`
      : `HTTP ${status ?? '—'} failed${ms != null ? ` · ${ms} ms` : ''}`,
  keys: { add: 'add', test: 'test', move: 'move' },
  authNone: 'None',
  authBearer: 'Bearer token',
  authCustomHeader: 'Custom header',
  authGithub: 'GitHub'
};
