/* ============================================================
   Palette Lab · 格物 GEWU 原生适配入口
   构建：npm run build:gewu（vite.gewu.config.js）→ dist-gewu/
   契约：window.GEWU_PLUGIN.register({ id, mount(container, api) })
   特性：
   - shadow DOM 隔离样式（不污染宿主页面）
   - CSS 选择器 :root / body / [data-theme] 作用域化到宿主容器
   - 初始主题跟随格物宿主
   - 独立运行时（无 GEWU_PLUGIN）自动降级为整页应用
   ============================================================ */
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import indexCss from './index.css?inline';
import appCss from './App.css?inline';

/* 字体：宿主页缺失时才注入 */
function ensureFonts() {
  if (document.querySelector('link[href*="fonts.googleapis.com"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Syne:wght@400..800&family=Manrope:wght@300..800&family=JetBrains+Mono:wght@400;600&display=swap';
  document.head.appendChild(link);
}

/* CSS 作用域化：:root → :host；body / html → :host；[data-theme] → :host([data-theme]) */
function scopeCss(css) {
  return css
    .replace(/:root\b/g, ':host')
    .replace(/body::before/g, ':host::before')
    .replace(/body::after/g, ':host::after')
    .replace(/(^|[,}\s])body(?=[\s{.:,])/g, '$1:host')
    .replace(/(^|[,}\s])html(?=[\s{.:,])/g, '$1:host')
    .replace(/\[data-theme=['"]dark['"]\]/g, ":host([data-theme='dark'])");
}

function mountInto(container) {
  const shadow = window.GEWU_PLUGIN
    ? window.GEWU_PLUGIN.attachShadow(container)
    : container;
  shadow.innerHTML = `<style>${scopeCss(indexCss)}</style><style>${scopeCss(appCss)}</style><div id="root"></div>`;
  const root = createRoot(shadow.querySelector('#root'));
  root.render(<App />);
  return () => root.unmount();
}

if (window.GEWU_PLUGIN) {
  ensureFonts();
  window.GEWU_PLUGIN.register({
    id: 'v05-palette',
    mount(container) {
      return mountInto(container);
    },
  });
} else {
  /* 独立运行（palette-lab 自己的站点）：挂载到 #root */
  ensureFonts();
  mountInto(document.getElementById('root'));
}
