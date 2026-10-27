export const SYSTEM_SANS = 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

// 只允许本机字体与明确以 OFL-1.1 发布的三款字体，不接受上传商业字体文件。
export const FONT_OPTIONS = [
  { id: 'system', name: '系统默认', family: SYSTEM_SANS, license: '本机调用', note: '使用设备已安装字体，不随网站打包字体文件。' },
  { id: 'noto-sans', name: 'Noto Sans SC · 无衬线', family: `"Noto Sans SC", ${SYSTEM_SANS}`, loadFamily: 'Noto Sans SC', license: 'OFL-1.1', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/notosanssc/OFL.txt', cssUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap', note: '中文正文、图表标签与汇报的通用起点。' },
  { id: 'noto-serif', name: 'Noto Serif SC · 衬线', family: '"Noto Serif SC", "Songti SC", serif', loadFamily: 'Noto Serif SC', license: 'OFL-1.1', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/notoserifsc/OFL.txt', cssUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap', note: '适合阅读样张与有意使用衬线层级的版面。' },
  { id: 'jetbrains-mono', name: 'JetBrains Mono · 等宽', family: '"JetBrains Mono", ui-monospace, "PingFang SC", monospace', loadFamily: 'JetBrains Mono', license: 'OFL-1.1', licenseUrl: 'https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt', cssUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap', note: '用于代码和对齐数字；中文回退到本机字体。' },
];

export const TYPE_PROFILES = {
  research: { name: '论文／图表样张', unit: 'pt', sizes: { heading: 18, body: 11, caption: 9, data: 11 }, zoom: 1.5, lineHeight: 1.6, note: '这是论文与图表的排版试样，实际尺寸以目标期刊和最终图版为准。' },
  presentation: { name: '汇报／投影样张', unit: 'pt', sizes: { heading: 38, body: 24, caption: 18, data: 32 }, zoom: 0.75, lineHeight: 1.5, note: '这是投影排版起点，不保证任意房间与观看距离下的可读性。' },
  art: { name: '屏幕版面样张', unit: 'px', sizes: { heading: 42, body: 20, caption: 16, data: 28 }, zoom: 1, lineHeight: 1.7, note: '艺术创作可调整节奏与层级；阅读文字和操作仍需可辨。' },
};
export const TYPE_ROLES = [{ key: 'heading', name: '标题' }, { key: 'body', name: '正文' }, { key: 'caption', name: '图注／辅助' }, { key: 'data', name: '数据／数字' }];
