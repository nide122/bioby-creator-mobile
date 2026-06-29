import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { type ThemePalette } from '@/constants/tokens';
import { emailHtmlBaseCss, emailHtmlImageCss } from '@/src/lib/email-html-images';

const WEBVIEW_BOOTSTRAP_SCRIPT = `
(function() {
  function postHeight() {
    var height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: height }));
  }
  function wireImages() {
    document.querySelectorAll('.bioby-email-html img').forEach(function(img) {
      if (img.getAttribute('data-bioby-preview')) return;
      img.setAttribute('data-bioby-preview', '1');
      img.style.cursor = 'pointer';
      img.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        var src = img.getAttribute('src');
        if (!src) return;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'imagePreview', src: src }));
      });
    });
  }
  postHeight();
  wireImages();
  if (document.images) {
    Array.prototype.forEach.call(document.images, function(img) {
      if (img.complete) return;
      img.addEventListener('load', function() {
        postHeight();
        wireImages();
      });
      img.addEventListener('error', postHeight);
    });
  }
  setTimeout(postHeight, 250);
  setTimeout(function() {
    postHeight();
    wireImages();
  }, 1000);
})();
true;
`;

export function buildEmailHtmlPage(html: string, theme: ThemePalette): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
      }
      ${emailHtmlBaseCss(theme)}
      ${emailHtmlImageCss()}
    </style>
  </head>
  <body>
    <div class="bioby-email-html">${html}</div>
  </body>
</html>`;
}

type Props = {
  html: string;
  onImagePress?: (src: string) => void;
  theme: ThemePalette;
};

function parseWebViewMessage(raw: string): { type: 'height'; value: number } | { type: 'imagePreview'; src: string } | null {
  try {
    const payload = JSON.parse(raw) as { type?: string; value?: number; src?: string };
    if (payload.type === 'height' && typeof payload.value === 'number' && payload.value > 0) {
      return { type: 'height', value: payload.value };
    }
    if (payload.type === 'imagePreview' && payload.src) {
      return { type: 'imagePreview', src: payload.src };
    }
  } catch {
    const legacyHeight = Number.parseInt(raw, 10);
    if (Number.isFinite(legacyHeight) && legacyHeight > 0) {
      return { type: 'height', value: legacyHeight };
    }
  }
  return null;
}

export function EmailHtmlBodyNative({ html, onImagePress, theme }: Props) {
  const [height, setHeight] = useState(120);
  const pageHtml = useMemo(() => buildEmailHtmlPage(html, theme), [html, theme]);

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={['*']}
        source={{ html: pageHtml, baseUrl: '' }}
        style={[styles.webview, { height }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled={false}
        onMessage={(event) => {
          const message = parseWebViewMessage(event.nativeEvent.data);
          if (!message) return;
          if (message.type === 'height') {
            setHeight(message.value);
            return;
          }
          onImagePress?.(message.src);
        }}
        injectedJavaScript={WEBVIEW_BOOTSTRAP_SCRIPT}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url ?? '';
          if (!url || url === 'about:blank' || url.startsWith('data:')) {
            return true;
          }
          if (/^https?:\/\//i.test(url)) {
            void Linking.openURL(url);
          }
          return false;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  webview: {
    width: '100%',
    backgroundColor: 'transparent',
  },
});
