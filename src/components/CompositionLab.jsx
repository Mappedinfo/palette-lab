import { useState } from 'react';
import { Copy, Download, RotateCcw } from 'lucide-react';
import { ALL_COLORS, textOn } from '../data/colors';
import { COMPOSITION_PRESETS, COLOR_ROLES, RATIO_PRESETS, SEMANTIC_COLORS } from '../data/compositions';
import { COMPOSITION_KEY, isHex, normaliseComposition, normaliseRatios, contrastChecks, exportComposition, compositionCSS } from '../lib/composition';

function HexInput({ role, value, onChange, onError }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    if (isHex(draft)) onChange(draft.toUpperCase());
    else { setDraft(value); onError('请输入 #RRGGBB 格式的颜色，已保留原值。'); }
  };
  return <input id={`composition-${role.key}`} value={draft} list="composition-archive" maxLength={7} spellCheck="false" onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />;
}

function ColorField({ role, value, onChange, onError }) {
  return (
    <div className="composition-color">
      <label htmlFor={`composition-${role.key}`}>{role.label}</label>
      <div>
        <input type="color" value={value} aria-label={`选择${role.label}`} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <HexInput key={value} role={role} value={value} onChange={onChange} onError={onError} />
      </div>
    </div>
  );
}

function PagePreview({ mode }) {
  return (
    <div className={`composition-page composition-page--${mode}`}>
      {mode === 'workspace' && <aside className="composition-page__sidebar"><b>FIELD NOTES</b><span className="is-current">总览</span><span>资料目录</span><span>观察笔记</span><span>已保存</span></aside>}
      <div className="composition-page__content">
        <div className="composition-page__top"><span>示例内容 · {mode === 'workspace' ? '工作台' : '阅读页'}</span><span>Palette Lab</span></div>
        <h3>{mode === 'workspace' ? '把重点，留给重要的信息。' : '让颜色安静，让内容清晰。'}</h3>
        <p>清晰的文字、充足的留白，以及有分工的颜色，让阅读和操作各有位置。</p>
        {mode === 'workspace' ? (
          <>
            <div className="composition-page__cards">{[['12', '观察笔记'], ['04', '资料分组'], ['03', '重点条目']].map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
            <div className="composition-page__table"><div><b>条目</b><b>状态</b></div>{[['空间观察', 'success', '已整理'], ['资料校对', 'warning', '待确认'], ['来源链接', 'danger', '需更新']].map(([title, status, label]) => <div key={title}><span>{title}</span><span style={{ color: SEMANTIC_COLORS[status] }}>● {label}</span></div>)}</div>
          </>
        ) : (
          <>
            <div className="composition-page__quote"><b>颜色是一种分工。</b><p>基底提供阅读空间，辅助面组织内容，强调色只在关键处出现。</p></div>
            <p>辅助文字也需要清楚可读。正文与背景、按钮与底色，都应按实际组合判断，而不是只看一张漂亮的色卡。</p>
          </>
        )}
        <div className="composition-page__bottom"><span className="composition-page__action">查看重点 ↗</span><span>正文 18px · 辅助文字 15px</span></div>
      </div>
    </div>
  );
}

export default function CompositionLab() {
  const [composition, updateComposition] = useState(() => {
    try { return normaliseComposition(JSON.parse(localStorage.getItem(COMPOSITION_KEY))); }
    catch { return normaliseComposition(null); }
  });
  const [mode, setMode] = useState('workspace');
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState(false);
  const setComposition = (update) => {
    const next = typeof update === 'function' ? update(composition) : update;
    updateComposition(next);
    try { localStorage.setItem(COMPOSITION_KEY, JSON.stringify(next)); setSaveError(false); }
    catch { setSaveError(true); }
  };
  const preset = COMPOSITION_PRESETS.find((p) => p.id === composition.presetId);
  const { colors, ratios } = composition;
  const checks = contrastChecks(composition);
  const style = Object.fromEntries(Object.entries(colors).map(([key, value]) => [`--lab-${key}`, value]));
  style['--lab-on-accent'] = textOn(colors.accent);
  const updateColor = (key, value) => setComposition((c) => ({ ...c, colors: { ...c.colors, [key]: value } }));
  const updateRatio = (key, value) => setComposition((c) => ({ ...c, ratios: normaliseRatios({ ...c.ratios, [key]: value }) }));
  const copyCSS = async () => {
    try { await navigator.clipboard.writeText(compositionCSS(composition)); setNotice('CSS 已复制，可直接用于网页主题。'); }
    catch { setNotice('浏览器未允许复制，请使用下载方案保存当前配色。'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportComposition(composition), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'palette-lab-theme.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('已生成当前方案的 JSON 文件。');
  };
  return (
    <section id="composition" className="section composition-section">
      <div className="container">
        <div className="section__head"><div><div className="eyebrow">COMPOSITION · 配比实验</div><h2>颜色，更要看面积与角色。</h2></div><p className="section__desc">从清亮底色和高对比文字开始。调整面积、替换色值，在页面里看它们如何相处。</p></div>
        <div className="composition-presets" aria-label="配色起点">{COMPOSITION_PRESETS.map((p) => <button key={p.id} type="button" aria-pressed={composition.presetId === p.id} onClick={() => { setComposition(normaliseComposition({ presetId: p.id })); setNotice(''); }}><span className="composition-preset__colors" aria-hidden="true">{['background', 'surface', 'accent'].map((key) => <i key={key} style={{ background: p.colors[key] }} />)}</span><b>{p.name}</b><span>{p.ratios.background} / {p.ratios.surface} / {p.ratios.accent}</span></button>)}</div>
        <p className="composition-note">{preset.note} 这些比例是可调的构图起点。</p>
        <div className="composition-layout">
          <div className="composition-controls">
            <fieldset><legend>面积分工</legend><div className="composition-ratio-labels"><span>基底 <b>{ratios.background}%</b></span><span>辅助面 <b>{ratios.surface}%</b></span><span>强调 <b>{ratios.accent}%</b></span></div>
              {['surface', 'accent'].map((key) => <label className="composition-slider" key={key}><span>{key === 'surface' ? '辅助面' : '强调色'} <output>{ratios[key]}%</output></span><input type="range" min="0" max={key === 'surface' ? 60 : 30} step="1" value={ratios[key]} onChange={(e) => updateRatio(key, e.target.value)} /></label>)}
              <div className="composition-ratio-presets">{RATIO_PRESETS.map((p) => <button type="button" key={p.name} onClick={() => setComposition((c) => ({ ...c, ratios: { ...p.ratios } }))}>{p.name}</button>)}</div>
            </fieldset>
            <fieldset><legend>按角色选色</legend><div className="composition-color-fields">{COLOR_ROLES.map((role) => <ColorField key={role.key} role={role} value={colors[role.key]} onChange={(value) => updateColor(role.key, value)} onError={setNotice} />)}</div><datalist id="composition-archive">{ALL_COLORS.map((c) => <option key={c.hex} value={c.hex}>{c.name}</option>)}</datalist></fieldset>
            <div className="composition-export"><button type="button" onClick={copyCSS}><Copy size={16} /> 复制 CSS</button><button type="button" onClick={download}><Download size={16} /> 下载方案</button><button type="button" className="composition-reset" onClick={() => { setComposition(normaliseComposition({ presetId: composition.presetId })); setNotice('已恢复当前起点。'); }}><RotateCcw size={15} /> 复原</button></div>
            <p className="composition-notice" role="status">{notice || (saveError ? '浏览器未允许保存，请导出当前方案。' : '调整后自动保存在本浏览器。')}</p>
          </div>
          <div className="composition-stage" style={style}>
            <div className="composition-area" aria-label={`面积示意：基底 ${ratios.background}%，辅助面 ${ratios.surface}%，强调 ${ratios.accent}%`}>{['background', 'surface', 'accent'].map((key) => <span key={key} style={{ width: `${ratios[key]}%`, background: colors[key], color: textOn(colors[key]) }}>{ratios[key] >= 5 ? `${ratios[key]}%` : ''}</span>)}</div>
            <div className="composition-preview-head"><b>页面中的配色</b><div aria-label="预览场景">{[['workspace', '工作台'], ['article', '阅读页']].map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div></div>
            <PagePreview mode={mode} />
            <p className="composition-note">面积条精确显示比例；页面展示颜色角色，不代表实际页面像素占比。预览中的数值为示例。</p>
            <div className="composition-contrast"><div><b>实际文字组合</b><span>正文 AA：4.5 : 1</span></div>{checks.map((c) => <div key={c.label}><span>{c.label}</span><b>{c.ratio.toFixed(2)} : 1</b><span className={c.passed ? 'is-pass' : 'is-warning'}>{c.passed ? '通过' : '需调整'}</span></div>)}</div>
          </div>
        </div>
        <p className="composition-sources">按角色组织色彩，参考 <a href="https://www.carbondesignsystem.com/building-blocks/foundations/color/tokens" target="_blank" rel="noreferrer">Carbon 色彩角色</a> 与 <a href="https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette" target="_blank" rel="noreferrer">Radix 配色组合</a>。对比度只评价列出的文字组合。</p>
      </div>
    </section>
  );
}
