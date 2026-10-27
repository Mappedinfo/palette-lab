import { useRef, useState } from 'react';
import { FONT_OPTIONS, TYPE_PROFILES, TYPE_ROLES } from '../data/typography';
import { getUseCase } from '../data/use-cases';
import { normaliseTypography, specimenPixels, typographyCSS, loadSampleFont } from '../lib/typography';

export default function TypographyLab({ useCase }) {
  const [settings, setSettings] = useState({});
  const [fontId, setFontId] = useState('system');
  const [fontStatus, setFontStatus] = useState('使用本机字体，不下载字体文件。');
  const [notice, setNotice] = useState('');
  const fontRequest = useRef(0);
  const context = getUseCase(useCase);
  const profile = TYPE_PROFILES[context.id];
  const state = normaliseTypography(context.id, { ...settings[context.id], fontId });
  const font = FONT_OPTIONS.find((f) => f.id === state.fontId);
  const update = (patch) => setSettings((all) => ({ ...all, [context.id]: { ...state, ...patch } }));
  const chooseFont = async (id) => {
    const choice = FONT_OPTIONS.find((f) => f.id === id);
    const request = ++fontRequest.current;
    setNotice('');
    setFontId(choice.id); setFontStatus(choice.cssUrl ? '正在按需加载开源字体…' : '使用本机字体，不下载字体文件。');
    try { await loadSampleFont(choice); if (request === fontRequest.current && choice.cssUrl) setFontStatus('所选开源字体已加载。'); }
    catch { if (request === fontRequest.current) setFontStatus('字体连接不可用，当前使用系统回退。'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(typographyCSS(context.id, state)); setNotice('排版 CSS 已复制；保留原始字号，不包含样张缩放。'); }
    catch { setNotice('浏览器未允许复制；当前字号仍可直接查看。'); }
  };
  const size = (key) => ({ fontSize: `${specimenPixels(state.sizes[key], state.unit, state.zoom)}px` });
  return (
    <section id="typography" className="section typography-section"><div className="container">
      <div className="section__head"><div><div className="eyebrow">TYPE · 字号与字体</div><h2>让字号回到实际阅读。</h2></div><p className="section__desc">当前场景：{context.name}。区分原始字号与屏幕缩放，比较标题、正文、图注和数字。</p></div>
      <div className="typography-layout"><div className="typography-controls">
        <label className="type-font-select">字体<select value={fontId} onChange={(e) => chooseFont(e.target.value)}>{FONT_OPTIONS.map((f) => <option value={f.id} key={f.id}>{f.name}</option>)}</select></label>
        <div className="type-size-controls">{TYPE_ROLES.map((role) => <label key={role.key}>{role.name}<span><input key={`${context.id}-${role.key}-${state.sizes[role.key]}`} type="number" min="6" max="96" defaultValue={state.sizes[role.key]} onBlur={(e) => { const n = Number(e.target.value); if (e.target.value && Number.isFinite(n)) update({ sizes: { ...state.sizes, [role.key]: n } }); else e.target.value = state.sizes[role.key]; }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><b>{state.unit}</b></span></label>)}</div>
        <label className="type-font-select">样张显示缩放<select value={state.zoom} onChange={(e) => update({ zoom: Number(e.target.value) })}>{[0.5, 0.75, 1, 1.5, 2].map((z) => <option key={z} value={z}>{z * 100}%</option>)}</select></label>
        <p className="composition-note">{profile.note} pt 按 1pt = 4/3 CSS px 展示；缩放仅用于屏幕比较。</p>
        <button type="button" className="type-copy" onClick={copy}>复制排版 CSS</button><p role="status" className="composition-note">{notice || fontStatus}</p>
        <div className="font-license"><b>{font.license}</b><p>{font.note}</p>{font.licenseUrl && <a href={font.licenseUrl} target="_blank" rel="noreferrer">查看该字体原始许可 ↗</a>}</div>
      </div><div className="type-specimen" style={{ fontFamily: font.family, lineHeight: state.lineHeight }}>
        <div className="type-specimen__label">{profile.name} · 显示 {state.zoom * 100}%</div>
        <h3 style={size('heading')}>城市观察<br />Field notes</h3><span className="type-size-caption">标题 {state.sizes.heading}{state.unit}</span>
        <p style={size('body')}>颜色服务于信息层级，字号服务于真实阅读。保持单位、图例与核心结论清楚可见。</p><span className="type-size-caption">正文 {state.sizes.body}{state.unit}</span>
        <div className="type-specimen__data" style={size('data')}>128.60 → 149.25</div><span className="type-size-caption">数字 {state.sizes.data}{state.unit} · 示例数据</span>
        <p style={size('caption')}>图 1 · 中文、English 与 0123456789。图注仍应包含理解图表所需的信息。</p><span className="type-size-caption">图注 {state.sizes.caption}{state.unit}</span>
      </div></div>
      <div className="font-policy"><b>简单的字体约束</b><p>默认使用系统字体；可选项只包含 Noto Sans SC、Noto Serif SC、JetBrains Mono 三款 OFL-1.1 字体，选择后才从 Google Fonts 加载。网站不提供商业字体上传或分发。使用或分发字体文件时保留相应许可，系统字体文件的授权另行遵守。</p><div>{FONT_OPTIONS.filter((f) => f.licenseUrl).map((f) => <a key={f.id} href={f.licenseUrl} target="_blank" rel="noreferrer">{f.name} · 许可 ↗</a>)}</div></div>
    </div></section>
  );
}
