# Palette Lab · 色卡实验室

Mappedinfo 开源配色实验室 —— 按科研、汇报、艺术选择颜色，比较面积比例、实际角色、字号与字体。

<!-- archive-summary:start -->
全色档案共 **30 个去重色值**：经典搭配 15 色、界面角色 17 色、语义状态 3 色。来源之间有重复，同一 HEX 可以承担多个角色。数量直接由数据源生成。
<!-- archive-summary:end -->

**线上地址**：https://mappedinfo.github.io/palette-lab/

## 配比与角色实验

首页新增「配比实验」：清亮工作台、暖白与朱砂、翡翠与象牙、冰蓝与品红四个起点。调整基底／辅助面／强调色（合计100%），为背景、辅助面、正文、辅助文字和强调色指定色值；在工作台／阅读页查看实际角色，按真实文字组合计算对比度，可复制 CSS 或下载 JSON。设置仅保存在当前浏览器，图片提色仍不上传。

面积条准确显示所设比例；界面预览展示角色，不统计实际像素面积。比例是设计起点，不能代替可读性或完整无障碍评估。网站 UI 跟随系统浅／深色，并监听系统变化实时切换；旧的手动主题缓存不再控制 UI。配色画布保留自选方案，不随 UI 主题改写色值。

角色组织参考 [Carbon 色彩 tokens](https://www.carbondesignsystem.com/building-blocks/foundations/color/tokens) 与 [Radix 配色组合](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)。原有比较、剧场、提色和格物适配继续使用同一应用。

## 使用场合、字号与字体

- **科研**：区分类别、顺序与有明确中心的发散映射；保留图例、单位、形状／线型，不把装饰配色当作已校准的定量色图。
- **汇报**：突出当前重点，保留说明与限制；考虑投影、观看距离和字号层级。
- **艺术创作**：可以探索情绪、色彩关系与构图，不强制套用科研图例；阅读文字与操作单独保证清楚。

三个场景共用配比实验的起点按钮与字号样张。字号区分别展示标题、正文、图注和数字，可调整原始字号、显示缩放并复制 CSS。论文／图表与投影样张用 pt，屏幕版面用 px；缩放只影响样张，导出保留原始单位与数值。样张不是期刊规范或投影效果的保证。

字体限制为系统默认，以及 [Noto Sans SC](https://github.com/google/fonts/blob/main/ofl/notosanssc/OFL.txt)、[Noto Serif SC](https://github.com/google/fonts/blob/main/ofl/notoserifsc/OFL.txt)、[JetBrains Mono](https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt) 三款 OFL-1.1 字体。系统字体只调用本机资源；三款开源字体在用户选择后从 Google Fonts 按需加载，失败时使用系统回退并显示状态。不打包或分发商业字体文件；字体许可独立于网站代码的 MIT 许可，分发字体文件时需保留其适用许可。

参考 [Matplotlib 色图分类](https://matplotlib.org/stable/users/explain/colors/colormaps.html)、[Carbon 色彩角色](https://www.carbondesignsystem.com/building-blocks/foundations/color/tokens) 与 [Radix 配色组合](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette)。

## 经典搭配（原档案保留）

| 组 | 名称 | 颜色 |
|---|---|---|
| 1 | 晨光 Morning Glow | `#FFE59D` 奶油黄 · `#64BBCF` 天蓝 |
| 2 | 琥珀 Amber | `#FFD15D` |
| 3 | 宣纸与朱砂 Rice Paper & Vermilion | `#F5E6D0` · `#9E1D1C`（对比度 6.47:1） |
| 4 | 冰蓝与品红 Ice & Magenta | `#F1F6FF` · `#EE1969` |
| 5 | 薄荷与珊瑚 Mint & Coral | `#90E0D6` · `#E97A46` |
| 6 | 香芋与青草 Lilac & Grass | `#F2E1FF` · `#61AC4C` |
| 7 | 紫罗兰与靛蓝 Violet & Indigo | `#CCA4E3` · `#6583E0` |
| 8 | 翡翠与象牙 Jade & Ivory | `#008E6B` · `#FBFFF2` |

## 功能

- **全色档案**：经典搭配、界面角色与语义状态按 HEX 去重，数量自动统计；支持来源筛选及名称／HEX／角色搜索，每色保留全部来源。
- **搭配方案**：原有经典配色卡片，每组一键进入全屏比较或剧场
- **全屏比较**：拖拽分割线同屏对照任意两色，实时对比度；←/→ 切换 B 色、↑/↓ 切换 A 色、S 交换、R 随机、Esc 退出
- **全屏剧场**：完整颜色档案铺满全屏，hover 显色值，点击复制
- **自动主题**：跟随系统浅／深色实时变化，配色画布不受 UI 主题改写。
- **动效**：framer-motion 编排入场、色卡 stagger、浮动拼贴、主题 wipe

## 技术栈

React 19 · Vite 8 · framer-motion · lucide-react（图标）· GitHub Pages（Actions 自动部署）

## 本地开发

```bash
npm install
npm run dev      # 开发
npm run build    # 构建 → dist/，同步 AI 色彩档案
npm test         # 档案去重、配比、导出、字号单位和系统主题订阅的轻量检查
npm run lint     # 既有 oxlint 检查
npm run build:gewu # 更新既有格物原生适配包
```

推送 `main` 分支即自动触发部署。

## 许可

MIT © Mappedinfo
