import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/sortable-table.ts',
      name: 'SortableTable',
      fileName: (format) => `sortable-table.${format}.js`,
    },
  },
});