import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  dev: {
    lazyCompilation: true,
  },
  html : {
    favicon: undefined,
    template: 'public/index.html',
    title: ""
  },
  performance : {
    chunkSplit : {
      strategy: 'all-in-one'
    },
    printFileSize: {
      diff: true,
    }
  },
  output : {    
    assetPrefix : '.',
    filenameHash : false,
    minify: {
      js: 'always'
    },
    distPath: {
      root: 'build',
      js: 'js',
      css: 'css',
      assets: 'assets',
    },
    cleanDistPath: true
  }
});
