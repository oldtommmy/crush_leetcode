import '../styles/tailwind.css';
import { createRoot } from 'react-dom/client';
import { bootstrapTheme } from '../shared/themeBootstrap';
import { OptionsApp } from './OptionsApp';

bootstrapTheme(document.documentElement);

createRoot(document.getElementById('crush-leetcode-root') ?? document.getElementById('root')!).render(<OptionsApp />);
