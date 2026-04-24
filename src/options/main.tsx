import '../styles/tailwind.css';
import { createRoot } from 'react-dom/client';
import { OptionsApp } from './OptionsApp';

createRoot(document.getElementById('crush-leetcode-root') ?? document.getElementById('root')!).render(<OptionsApp />);
