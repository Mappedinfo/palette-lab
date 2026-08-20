# Palette Lab · 色卡实验室

Mappedinfo 开源学术配色档案 —— 15 色、8 组搭配、逐色解析、同屏对照。

**线上地址**：https://mappedinfo.github.io/palette-lab/

## 颜色档案

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

- **全色档案**：15 张色卡，点击查看 HEX / RGB / HSL 与黑白底对比度，hover 一键复制
- **搭配方案**：8 组配色语义卡片，每组一键进入全屏比较或剧场
- **全屏比较**：拖拽分割线同屏对照任意两色，实时对比度；←/→ 切换 B 色、↑/↓ 切换 A 色、S 交换、R 随机、Esc 退出
- **全屏剧场**：15 色铺满全屏，hover 显色值，点击复制
- **双主题**：浅色 / 深色一键切换（记忆偏好），圆形展开过渡动效
- **动效**：framer-motion 编排入场、色卡 stagger、浮动拼贴、主题 wipe

## 技术栈

React 19 · Vite 8 · framer-motion · lucide-react（图标）· GitHub Pages（Actions 自动部署）

## 本地开发

```bash
npm install
npm run dev      # 开发
npm run build    # 构建 → dist/
```

推送 `main` 分支即自动触发部署。

## 许可

MIT © Mappedinfo
