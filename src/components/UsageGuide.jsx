import { USE_CASES, getUseCase } from '../data/use-cases';
import { textOn } from '../data/colors';

export default function UsageGuide({ active, onChange }) {
  const context = getUseCase(active);
  return (
    <section id="usage" className="section usage-section"><div className="container">
      <div className="section__head"><div><div className="eyebrow">PURPOSE · 使用场合</div><h2>先选用途，再选颜色。</h2></div><p className="section__desc">同一种颜色可以承担不同角色，科研、汇报和创作的判断标准也不同。</p></div>
      <div className="usage-tabs" aria-label="使用场合">{USE_CASES.map((c) => <button type="button" key={c.id} aria-pressed={active === c.id} onClick={() => onChange(c.id)}><b>{c.name}</b><span>{c.summary}</span></button>)}</div>
      <div className="usage-detail"><div><h3>{context.title}</h3><ul>{context.goals.map((g) => <li key={g}>{g}</li>)}</ul><p className="usage-boundary">{context.avoid}</p></div><div className="usage-example"><b>{context.exampleTitle}</b><div className="usage-color-example">{context.exampleColors.map((hex, i) => <span key={hex} style={{ background: hex, color: textOn(hex) }}>{context.examples[i]}</span>)}</div>{active === 'research' && <dl className="usage-encodings"><div><dt>类别</dt><dd>离散颜色 + 形状／线型</dd></div><div><dt>连续量</dt><dd>顺序色图，如 viridis</dd></div><div><dt>中心差异</dt><dd>明确中心的发散色图，如 RdBu</dd></div></dl>}<p className="composition-note">示意用于比较角色，不是对任意数据集的色图认证。</p><div className="usage-references">{context.references.map((ref) => <a href={ref.url} key={ref.url} target="_blank" rel="noreferrer">{ref.name} ↗</a>)}</div></div></div>
    </div></section>
  );
}
