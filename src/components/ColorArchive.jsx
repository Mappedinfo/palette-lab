import { useState } from 'react';
import { ALL_COLORS, LEGACY_COLORS } from '../data/colors';
import PaletteGrid from './PaletteGrid';

const FILTERS = [{ id: 'all', name: '全部' }, { id: 'classic', name: '经典搭配' }, { id: 'interface', name: '界面角色' }, { id: 'semantic', name: '语义状态' }];
export default function ColorArchive({ onOpen, onCompare }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const filtered = ALL_COLORS.filter((c) => (filter === 'all' || c.families.includes(filter)) && [c.hex, c.name, c.en, ...c.roles, ...c.origins].join(' ').toLowerCase().includes(needle));
  return (
    <section id="palette" className="section"><div className="container">
      <div className="section__head"><div><div className="eyebrow">ARCHIVE · 全色档案</div><h2>{ALL_COLORS.length} 色 · 按来源与角色查找</h2></div><p className="section__desc">保留 {LEGACY_COLORS.length} 色经典档案，汇入界面角色色与语义色。相同 HEX 只显示一次，可有多个角色。</p></div>
      <div className="archive-toolbar"><div aria-label="档案来源">{FILTERS.map((f) => <button type="button" key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.name}</button>)}</div><label><span>搜索颜色</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名称、HEX、角色或来源" /></label><span aria-live="polite">{filtered.length} / {ALL_COLORS.length} 色</span></div>
      {filtered.length ? <PaletteGrid colors={filtered} onOpen={onOpen} onCompare={onCompare} /> : <p className="archive-empty">没有匹配的颜色。可以更换关键词或来源筛选。</p>}
    </div></section>
  );
}
