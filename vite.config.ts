import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// For GitHub Pages: must match repo name. Site will be at https://jajjer.github.io/documentaryGame/
const base = process.env.GITHUB_PAGES === 'true' ? '/documentaryGame/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
});

