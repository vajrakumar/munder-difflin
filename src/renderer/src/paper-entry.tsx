import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyPaperTheme } from './design/paper';
import { hydrateAppearance } from './paper/appearancePref';
import { PaperApp } from './paper/PaperApp';
import './i18n';
import './design/fonts.css';
import './design/paper/tokens.css';
import './ui/ui.css';

applyPaperTheme('light');
hydrateAppearance();
const root = document.getElementById('root');
if (!root) throw new Error('No root');
createRoot(root).render(
  <StrictMode>
    <PaperApp />
  </StrictMode>
);
