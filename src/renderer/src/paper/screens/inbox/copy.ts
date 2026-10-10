/** English strings for the Inbox. Kept in one place so they move into the
 *  i18n catalogue (src/renderer/src/i18n) in one step when the Paper shell
 *  adopts it; the shell itself does not load i18next yet. */
import type { MailAct, TaskStatus } from '../../data/model';
import type { Folder } from './model';

export const ACT_LABEL: Record<MailAct, string> = {
  request: 'request',
  query: 'question',
  propose: 'proposal',
  inform: 'update',
  agree: 'agreed',
  refuse: 'declined',
  done: 'done'
};

export const COPY = {
  title: 'Inbox',
  railLabel: 'Inbox folders',
  live: 'Live',
  demo: 'Demo data',
  liveHint: 'Reading your hive',
  demoHint: 'No app bridge in the browser gallery, so this is a sample floor. Edits stay in this tab.',
  people: 'People',
  with: 'With',
  clearFilter: 'Clear person filter',
  searchLabel: 'Search the inbox',
  searchPlaceholder: 'Search',
  clearSearch: 'Clear search',
  detailLabel: 'Message',
  loading: 'Loading messages',
  unread: 'Unread',
  question: 'Question',
  answered: 'Answered',
  dismissed: 'Dismissed',
  open: 'Still open',
  needsReply: 'Needs reply',
  markDone: 'Mark done',
  undone: 'Move back to inbox',
  done: 'Done',
  markRead: 'Mark read',
  markUnread: 'Mark unread',
  back: 'Back to list',
  openTicket: 'Open the card in Tasks',
  message: 'message',
  messages: 'messages',
  to: 'to',
  replyTo: 'Reply to',
  replyOutside: (source: string, god: string) => `Reply to ${source} (sent through ${god})…`,
  send: 'Send',
  sending: 'Sending…',
  sent: 'Sent',
  sendFailed: 'Could not send. Your text is still here.',
  sendAnswer: 'Send answer',
  dismiss: 'Dismiss',
  answerPlaceholder: 'Write your answer…',
  quickAnswers: 'Quick answers',
  askOpen: 'Waiting on you',
  askClosed: 'Closed',
  yourAnswer: 'Your answer',
  answeredWith: 'Answered:',
  dismissedNote: 'You dismissed this without answering. The card keeps the question.',
  earlier: (n: number) => `${n} earlier ${n === 1 ? 'message' : 'messages'}`,
  earlierQuestions: (n: number) => `${n} earlier ${n === 1 ? 'question' : 'questions'} on this card`,
  keys: { move: 'move', done: 'done', reply: 'reply', search: 'search' },
  taskStatus: { todo: 'To do', doing: 'In progress', blocked: 'Blocked', done: 'Done' } as Record<TaskStatus, string>,
  folders: {
    needs: { label: 'Needs you', hint: 'Questions and messages waiting on you' },
    agents: { label: 'Agents', hint: 'Mail between agents' },
    outside: { label: 'Outside', hint: 'Slack, webhooks and integrations' },
    team: { label: 'Team', hint: 'Direct messages from teammates' },
    all: { label: 'All', hint: 'Everything not marked done' },
    done: { label: 'Done', hint: 'Answered and archived' }
  } as Record<Folder, { label: string; hint: string }>,
  emptyDetail: { title: 'Nothing selected', body: 'Pick a message, or press j to start at the top.' },
  emptyFiltered: { title: 'No matches', body: 'Try a different word, or clear the person filter.' },
  empty: {
    needs: { title: 'Nothing needs you', body: 'Questions from agents and cards that wait on you land here.' },
    agents: { title: 'No agent mail', body: 'Requests and updates between agents show up here.' },
    outside: { title: 'Nothing from outside', body: 'Slack threads, webhooks and other integrations land here.' },
    team: { title: 'No team messages', body: 'Team direct messages arrive here once Teams is set up.' },
    all: { title: 'Inbox zero', body: 'Everything is handled.' },
    done: { title: 'Nothing done yet', body: 'Press e on a message to mark it done.' }
  } as Record<Folder, { title: string; body: string }>
};
