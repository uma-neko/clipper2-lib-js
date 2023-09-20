import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target:"es2020",
    minify:false,
    lib: {
      entry: resolve(__dirname, 'src/clipper2lib.ts'),
      name: 'clipper2lib',
      fileName: (format, entryname) => {
        switch(format){
          case 'es':
            return `${entryname}.module.js`;
          case 'cjs':
            return `${entryname}.cjs`;
          case 'umd':
            return `${entryname}.umd.js`;
          case 'iife':
            return `${entryname}.js`;

        }
      },
      formats: ['es', 'cjs', 'iife']
    },
    rollupOptions: {
      external: [],
      output: {},
    },
    outDir:"build"
  },
})