import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 시스템 테마 변경 반영
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let t = 'system';
  try { t = localStorage.getItem('theme') || 'system'; } catch {}
  if (t === 'system') document.documentElement.classList.toggle('dark', e.matches);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
