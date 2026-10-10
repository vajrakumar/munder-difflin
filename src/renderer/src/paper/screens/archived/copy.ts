/** Strings for Archived agents (MDF-22), English / Chinese / Arabic. Same
 *  pattern as Automations: follow `<html lang>` or `?lang=` in the gallery. */

const en = {
  title: 'Archived agents',
  subtitle: 'Stopped and hidden. Memory, inbox and the worktree stay until you delete.',
  live: 'Live',
  demo: 'Demo data',
  demoHint: 'No app bridge in the browser gallery, so this is sample data. Edits stay in this tab.',
  search: 'Search archived agents',
  searchPlaceholder: 'Search',
  cols: { name: 'Name', role: 'Role', archived: 'Archived', last: 'Last task', disk: 'Disk', actions: 'Actions' },
  empty: { title: 'No archived agents', body: 'Archive someone from the sidebar or their room. They leave the rail, and come back from here.' },
  emptyFiltered: { title: 'Nothing matches', body: 'Clear the search to see everyone in the archive.' },
  loading: 'Loading archived agents',
  error: 'Could not load archived agents.',
  retry: 'Retry',
  reopen: 'Reopen',
  reopenFresh: 'Reopen with a fresh worktree',
  missing: 'Worktree is missing',
  missingBody: 'The worktree folder is gone. Reopen with a fresh worktree to keep memory and inbox.',
  remove: 'Delete permanently',
  diskUnknown: '—',
  never: '—',
  // Stop vs Archive
  stop: 'Stop',
  archive: 'Archive',
  stopTitle: (name: string) => `Stop ${name}?`,
  stopBody: (name: string) =>
    `Ends the process. Memory, inbox and the worktree for ${name} are kept. They stay in the sidebar.`,
  archiveTitle: (name: string) => `Archive ${name}?`,
  archiveBody: (name: string) =>
    `Stops ${name} and hides them from the sidebar. Memory, inbox and the worktree are kept. Reopen later from Archived agents. Triggers will not wake them; mail waits in the inbox.`,
  deleteTitle: (name: string) => `Delete ${name} permanently?`,
  deleteBody: (name: string) =>
    `Removes the worktree and the agent folder. Type ${name} to confirm. This cannot be undone.`,
  deletePrompt: 'Type the agent name',
  cancel: 'Cancel',
  confirmStop: 'Stop',
  confirmArchive: 'Archive',
  confirmDelete: 'Delete permanently',
  stopped: (name: string) => `${name} stopped. Memory and worktree kept.`,
  archived: (name: string) => `${name} archived.`,
  reopened: (name: string) => `${name} is back.`,
  deleted: (name: string) => `${name} deleted.`,
  godLocked: 'Michael cannot be stopped or archived.',
  footer: (n: number) => (n === 1 ? '1 archived' : `${n} archived`),
  keys: { move: 'move', open: 'open', search: 'search' }
};

export type Copy = typeof en;

const zh: Copy = {
  ...en,
  title: '已归档代理',
  subtitle: '已停止并隐藏。记忆、收件箱和工作区会保留，直到你永久删除。',
  live: '实时',
  demo: '演示数据',
  demoHint: '浏览器预览中没有应用桥接，这里是示例数据。修改只保存在此标签页。',
  search: '搜索已归档代理',
  searchPlaceholder: '搜索',
  cols: { name: '名称', role: '角色', archived: '归档时间', last: '最近任务', disk: '磁盘', actions: '操作' },
  empty: { title: '没有已归档的代理', body: '从侧栏或代理房间归档。他们会离开侧栏，从这里重新打开。' },
  emptyFiltered: { title: '没有匹配项', body: '清除搜索以查看全部归档。' },
  loading: '正在加载已归档代理',
  error: '无法加载已归档代理。',
  retry: '重试',
  reopen: '重新打开',
  reopenFresh: '用新工作区重新打开',
  missing: '工作区已丢失',
  missingBody: '工作区文件夹不存在。用新工作区重新打开可保留记忆和收件箱。',
  remove: '永久删除',
  never: '—',
  stop: '停止',
  archive: '归档',
  stopTitle: (name) => `停止 ${name}？`,
  stopBody: (name) => `结束进程。${name} 的记忆、收件箱和工作区会保留，并留在侧栏。`,
  archiveTitle: (name) => `归档 ${name}？`,
  archiveBody: (name) => `停止 ${name} 并从侧栏隐藏。记忆、收件箱和工作区会保留。之后可从已归档代理重新打开。触发器不会唤醒他们；邮件会留在收件箱。`,
  deleteTitle: (name) => `永久删除 ${name}？`,
  deleteBody: (name) => `删除工作区和代理文件夹。输入 ${name} 以确认。此操作无法撤销。`,
  deletePrompt: '输入代理名称',
  cancel: '取消',
  confirmStop: '停止',
  confirmArchive: '归档',
  confirmDelete: '永久删除',
  stopped: (name) => `已停止 ${name}。记忆和工作区已保留。`,
  archived: (name) => `已归档 ${name}。`,
  reopened: (name) => `${name} 已回来。`,
  deleted: (name) => `已删除 ${name}。`,
  godLocked: '无法停止或归档 Michael。',
  footer: (n) => (n === 1 ? '1 个已归档' : `${n} 个已归档`),
  keys: { move: '移动', open: '打开', search: '搜索' }
};

const ar: Copy = {
  ...en,
  title: 'الوكلاء المؤرشفون',
  subtitle: 'متوقفون ومخفيون. تبقى الذاكرة وصندوق الوارد وشجرة العمل حتى الحذف النهائي.',
  live: 'مباشر',
  demo: 'بيانات تجريبية',
  demoHint: 'لا يوجد جسر للتطبيق في معاينة المتصفح، لذا هذه بيانات تجريبية. تبقى التعديلات في هذا التبويب.',
  search: 'بحث في الوكلاء المؤرشفين',
  searchPlaceholder: 'بحث',
  cols: { name: 'الاسم', role: 'الدور', archived: 'أُرشف', last: 'آخر مهمة', disk: 'القرص', actions: 'إجراءات' },
  empty: { title: 'لا وكلاء مؤرشفين', body: 'أرشف من الشريط الجانبي أو غرفة الوكيل. يغادرون الشريط ويعودون من هنا.' },
  emptyFiltered: { title: 'لا تطابق', body: 'امسح البحث لرؤية الجميع في الأرشيف.' },
  loading: 'جارٍ تحميل الوكلاء المؤرشفين',
  error: 'تعذر تحميل الوكلاء المؤرشفين.',
  retry: 'إعادة المحاولة',
  reopen: 'إعادة الفتح',
  reopenFresh: 'إعادة الفتح بشجرة عمل جديدة',
  missing: 'شجرة العمل مفقودة',
  missingBody: 'مجلد شجرة العمل غير موجود. أعد الفتح بشجرة جديدة للاحتفاظ بالذاكرة وصندوق الوارد.',
  remove: 'حذف نهائي',
  stop: 'إيقاف',
  archive: 'أرشفة',
  stopTitle: (name) => `إيقاف ${name}؟`,
  stopBody: (name) => `ينهي العملية. تبقى ذاكرة ${name} وصندوق الوارد وشجرة العمل، ويبقى في الشريط الجانبي.`,
  archiveTitle: (name) => `أرشفة ${name}؟`,
  archiveBody: (name) => `يوقف ${name} ويخفيه من الشريط. تبقى الذاكرة وصندوق الوارد وشجرة العمل. أعد فتحه لاحقًا من الوكلاء المؤرشفين. لن توقظه المشغّلات؛ تبقى الرسائل في الصندوق.`,
  deleteTitle: (name) => `حذف ${name} نهائيًا؟`,
  deleteBody: (name) => `يزيل شجرة العمل ومجلد الوكيل. اكتب ${name} للتأكيد. لا يمكن التراجع.`,
  deletePrompt: 'اكتب اسم الوكيل',
  cancel: 'إلغاء',
  confirmStop: 'إيقاف',
  confirmArchive: 'أرشفة',
  confirmDelete: 'حذف نهائي',
  stopped: (name) => `توقف ${name}. بقيت الذاكرة وشجرة العمل.`,
  archived: (name) => `أُرشف ${name}.`,
  reopened: (name) => `${name} عاد.`,
  deleted: (name) => `حُذف ${name}.`,
  godLocked: 'لا يمكن إيقاف مايكل أو أرشفته.',
  footer: (n) => (n === 1 ? 'مؤرشف واحد' : `${n} مؤرشفين`),
  keys: { move: 'تنقّل', open: 'فتح', search: 'بحث' }
};

const TABLES: Record<string, Copy> = { en, zh, ar };

export function currentLang(): 'en' | 'zh' | 'ar' {
  let lang = '';
  try { lang = new URLSearchParams(window.location.search).get('lang') ?? ''; } catch { /* no window */ }
  if (!lang && typeof document !== 'undefined') lang = document.documentElement.lang || '';
  const l = lang.toLowerCase();
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('ar')) return 'ar';
  return 'en';
}

export function copyFor(lang = currentLang()): Copy {
  return TABLES[lang] ?? en;
}
