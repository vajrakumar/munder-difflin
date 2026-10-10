/** English strings for Temps (MDF-20). Kept in one place so they move into the
 *  i18n catalogue in one step; Paper gallery does not load i18next yet. */
export const COPY = {
  title: 'Temps',
  lede: 'Short-lived workers the orchestrator hires for one job.',
  live: 'Live',
  demo: 'Demo data',
  liveStrip: 'Live',
  history: 'History',
  pending: 'Pending requests',
  pendingHintOff: 'The temps switch is off, so these sit in spawn-requests until you turn it on in',
  pendingHintOn: 'Waiting for a free slot. The orchestrator will hire them in order.',
  autonomyLink: 'Settings › Autonomy & Budgets',
  empty: {
    title: 'No temps yet',
    body: 'The orchestrator hires one when a job needs it.'
  },
  emptyHistory: {
    title: 'No history yet',
    body: 'Finished temps land here with tokens, cost and how they ended.'
  },
  emptyFiltered: {
    title: 'No matches',
    body: 'Try a different date or result filter.'
  },
  error: {
    title: 'Could not load temps',
    retry: 'Retry'
  },
  loading: 'Loading temps',
  stop: 'Stop',
  stopping: 'Stopping…',
  openRoom: 'Open terminal',
  confirmStopTitle: 'Stop this temp?',
  confirmStopBody: 'This ends its process tree and records the result as stopped. Committed work is kept.',
  confirm: 'Stop temp',
  cancel: 'Cancel',
  objective: 'Objective',
  runtime: 'Runtime',
  tokens: 'Tokens',
  cost: 'Tokens / $',
  started: 'Started',
  result: 'Result',
  slack: 'Slack',
  report: 'Final report',
  failure: 'Failure reason',
  dateAny: 'Any date',
  dateToday: 'Today',
  date7: 'Last 7 days',
  date30: 'Last 30 days',
  resultAll: 'All results',
  resultDone: 'Done',
  resultFailed: 'Failed',
  resultStopped: 'Stopped',
  keys: { move: 'move', open: 'open', stop: 'stop' }
};
