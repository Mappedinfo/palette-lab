export const USE_CASES = [
  {
    id: 'research', name: '科研', title: '先表达数据关系，再考虑装饰。',
    summary: '分清类别、顺序与围绕中心值的差异；保留图例、单位和非颜色线索。',
    goals: ['类别用离散颜色，并结合线型、形状或直接标注。', '连续量优先感知均匀的顺序色图；有明确中心的偏差才用发散色图。', '同一变量跨图保持同一映射，缺失值与零值分别表达。'],
    avoid: '装饰性两色搭配不自动成为定量色图；正文 AA 通过也不证明色盲可区分。',
    presetId: 'clear-blue', ratios: { background: 85, surface: 10, accent: 5 },
    exampleTitle: '类别图例示意', exampleColors: ['#0043CE', '#008E6B', '#9E1D1C'],
    examples: ['● 样本 A', '▲ 样本 B', '■ 样本 C'],
    references: [{ name: 'Matplotlib：选择色图', url: 'https://matplotlib.org/stable/users/explain/colors/colormaps.html' }],
  },
  {
    id: 'presentation', name: '汇报', title: '让听众先看见你要讲的重点。',
    summary: '大面积背景稳定，小面积颜色强调当前结论；为投影与远距离观看留出余量。',
    goals: ['一页控制重点色数量，强调色对应当前要解释的内容。', '正文和数据保持高对比，不能靠极浅的辅助文字承载结论。', '结论、证据和限制各有层级；用文字说明状态，不只改变颜色。'],
    avoid: '不把浅色投影效果或小字可读性当作已经验证；最终仍按实际屏幕与观看距离检查。',
    presetId: 'clear-blue', ratios: { background: 70, surface: 20, accent: 10 },
    exampleTitle: '汇报层级示意', exampleColors: ['#0043CE', '#FFD15D', '#171A20'],
    examples: ['当前重点', '需要关注', '说明与数据'],
    references: [{ name: 'Carbon：色彩角色', url: 'https://www.carbondesignsystem.com/building-blocks/foundations/color/tokens' }],
  },
  {
    id: 'art', name: '艺术创作', title: '允许颜色表达情绪和节奏。',
    summary: '可以探索强对比、色彩关系与不均衡构图，阅读信息和创作画面分别安排。',
    goals: ['用面积、相邻色和明暗关系比较不同情绪，而非只增加颜色数量。', '渐变与近色可以用于氛围；标题、署名或操作仍需清楚可读。', '保留作品自身的媒介、品牌和观看情境，不强制套用科研图例规则。'],
    avoid: '用于装饰的色彩关系不自动支持数据解释；需要印刷时另看实际色彩管理与打样。',
    presetId: 'ice-magenta', ratios: { background: 60, surface: 25, accent: 15 },
    exampleTitle: '情绪与面积示意', exampleColors: ['#CCA4E3', '#90E0D6', '#EE1969'],
    examples: ['氛围', '过渡', '焦点'],
    references: [{ name: 'Radix：组合配色', url: 'https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette' }],
  },
];
export const getUseCase = (id) => USE_CASES.find((c) => c.id === id) || USE_CASES[0];
