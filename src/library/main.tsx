import '../styles/tailwind.css';
import { createRoot } from 'react-dom/client';
import { bootstrapTheme } from '../shared/themeBootstrap';
import { LibraryApp } from './LibraryApp';

bootstrapTheme(document.documentElement);

createRoot(document.getElementById('crush-leetcode-root') ?? document.getElementById('root')!).render(<LibraryApp />);
