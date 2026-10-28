import './motion/initMotion';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/noto-sans-devanagari';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
