import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/ui-reference/**', '**/visual-before/**', '**/visual-after/**'],
    },
  },
  // @ts-ignore
  test: {
    exclude: ['**/ui-reference/**', '**/node_modules/**', '**/dist/**'],
  },
});
