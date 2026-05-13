import '../styles/tailwind.css';
import { createRoot } from 'react-dom/client';
import { LibraryApp } from './LibraryApp';

createRoot(document.getElementById('crush-leetcode-root') ?? document.getElementById('root')!).render(<LibraryApp />);
