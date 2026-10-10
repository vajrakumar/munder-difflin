import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PaperApp } from './paper/PaperApp';
import { isClassicUi } from './paper/classicFlag';
import brandLogo from '@brand/logo.png?url';
import './design/global.css';
import './design/paper/tokens.css';
import './ui/ui.css';
import './i18n';

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = brandLogo;
document.head.appendChild(favicon);

const splashMark = document.querySelector('#cth-splash .mk');
if (splashMark) {
  const img = document.createElement('img');
  img.src = brandLogo;
  img.alt = 'Vajra';
  img.style.cssText = 'height:56px;width:auto;display:block';
  splashMark.replaceWith(img);
}

const root = document.getElementById('root');
if (!root) throw new Error('No root element');

const classic = isClassicUi();
if (!classic) {
  document.getElementById('cth-splash')?.remove();
}

createRoot(root).render(
  <StrictMode>
    {classic ? <App /> : <PaperApp />}
  </StrictMode>
);
