import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// For GitHub Pages: use your repo name. If repo is "Documentary", base is '/Documentary/'.
// For a custom domain or user site (username.github.io), use base: '/'.
const base = process.env.GITHUB_PAGES === 'true' ? '/Documentary/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
});

