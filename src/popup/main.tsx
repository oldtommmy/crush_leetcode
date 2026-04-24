import '../styles/tailwind.css';
import { createRoot } from 'react-dom/client';
import { PopupApp } from './PopupApp';

createRoot(document.getElementById('crush-leetcode-root') ?? document.getElementById('root')!).render(<PopupApp />);
