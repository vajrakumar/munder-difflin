import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyPaperTheme } from './design/paper';
import { hydrateAppearance } from './paper/appearancePref';
import { PaperApp } from './paper/PaperApp';
import { DetachedApp, readDetachTarget } from './paper/DetachedApp';
import './i18n';
import './design/fonts.css';
import './design/paper/tokens.css';
import './ui/ui.css';

applyPaperTheme('light');
hydrateAppearance();
const root = document.getElementById('root');
if (!root) throw new Error('No root');
const detached = readDetachTarget();
createRoot(root).render(
  <StrictMode>
    {detached ? <DetachedApp target={detached} /> : <PaperApp />}
  </StrictMode>
);
