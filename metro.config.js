const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const pdfLibEsm = require.resolve('pdf-lib/dist/pdf-lib.esm.js');
const html2canvasEsm = require.resolve('html2canvas/dist/html2canvas.esm.js');
const mammothBrowser = require.resolve('mammoth/mammoth.browser.js');
const xlsxBrowser = require.resolve('xlsx/dist/xlsx.full.min.js');

const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'mammoth') {
    return { type: 'sourceFile', filePath: mammothBrowser };
  }
  if (moduleName === 'xlsx') {
    return { type: 'sourceFile', filePath: xlsxBrowser };
  }

  if (platform === 'web') {
    if (moduleName === 'pdf-lib') {
      return { type: 'sourceFile', filePath: pdfLibEsm };
    }
    if (moduleName === 'html2canvas') {
      return { type: 'sourceFile', filePath: html2canvasEsm };
    }
  }

  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
