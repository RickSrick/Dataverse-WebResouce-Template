import { SolutionCreator } from './SolutionCreator';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rsbuild/core';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact(), SolutionCreator({
    prefix: "con",
    solutionName: "Solution",
    resourceName: "ResourceTemplate",
    publisherName: "Contoso",
    publisherDisplay: "Contoso SRL",
    version: "1.0.0.0"
  })],
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
