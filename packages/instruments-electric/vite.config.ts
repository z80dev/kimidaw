import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'electric-worklet': resolve(__dirname, 'src/worklet/electric-worklet.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['@daw/engine-core', '@daw/dsp-runtime', '@daw/plugin-api'],
    },
    target: 'es2022',
  },
});
