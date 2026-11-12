# 真实 HGA 试用版 · 2026-11-12

本轮把已经验收的 poster 可视化缓存接进独立网站，供本地试用。没有读取原始 epoch，也没有重跑统计。生成物在 `../lexical_access_site_preview/real-hga-v1/`，源代码仍在独立的 `lexical_access_site` 仓库。

## 查看

- 完整叙事：打开 `meta/interactive-preview-real.html`。
- 直接看动态 HGA：打开后点击 “Explore HGA”；网站版入口为 `meta/site/index.html#hga`。
- 三任务、contour、左右半球、onset/offset、方向筛选、ROI 曲线和保存当前视图链接都可用。移动端保留章节折叠。
- 页面是英文，沿用已接受的 poster 叙事。解码图、作者和 poster PDF 仍是原框架的预留位；本轮真实数据仅覆盖 HGA explorer。

## 数值含义

Activation 使用当前 bipolar poster 的 HGA z；contrast 使用 Nonword − Word 的 ΔHGA z。Nw>W / W>Nw 改变固定电极筛选集合，不翻转差值符号。正式 poster 中的 d′ 曲线没有被当成 HGA z。

Onset 和 offset 读取各自锁时的真实数组，不假设固定词长。每 62.5 ms 取一个真实采样点；页面时间标签四舍五入到 ms。1× 播放按真实时间推进。Onset 范围 −250…1250 ms，offset −250…750 ms。

脑表面颜色是既有核计算的未归一化加权和，受到幅度与电极覆盖共同影响；下方曲线是选中电极的等权均值，汇总左右半球。因此曲线和表面颜色不是同一种统计量。每任务显示真实电极数。ROI 按已有 coarse_roi_mapping_v2.json 分组，作为描述性曲线子集，不冒充 decoding ROI。

动态 contour 是当前帧的等值线，同号重叠才有斜线。它不是逐时点显著性、统计 conjunction 或电极集合交集。本轮未套用静态 poster 的 envelope closing/island 处理。显示网格经过简化，适合先评估交互效果；正式版可以继续比较网格精度与移动设备性能。

## 只读来源

下列路径以 `../lexical_access/` 为根：

- `figs/lexical-access-poster/formal/figure-02/meta/`：bipolar activation NPZ、选择/坐标 CSV 与 validation。
- `figs/lexical-access-poster/formal/figure-03/meta/`：Group 3 task memberships、方向/窗口、CSV/canvas 与 hash validation。
- `figs/lexical-access-paper/draft/contrast/task-average-union-preview/meta/`：已准备好的 Word / Nonword HGA 曲线及 Difference_values。导出时核对差值和正式 task membership。
- 共享可视化代码：`code.worktrees/jia-184-master-integration/viz`；ROI mapping 在该 worktree 的 `final_figures/lexical_access/scripts/`。
- 模板：`/cwork/jq81/cogan_lab_box/ECoG_Recon` 的 avg35 inflated。只发布模板几何及聚合场，不携带被试几何。

Activation 核为 legacy 7 mm / 20 mm reach，contrast 核为 tissue 7 mm / 15 mm reach，保留来源设置。完整源文件 SHA-256、选择集合 hash、量化误差、网格对应关系和输出 hash 位于生成物的 `meta/export-validation.json`。

## 复现

从网站仓库运行；下列变量只指向既有环境与可视化缓存。

```bash
site_python=/hpc/home/jq81/cogan_lab/jq81/miniconda3/envs/Lexical_NoDelay/bin/python
site_workspace=/hpc/home/jq81/cogan_lab/jq81/avalon/lexical_access
site_viz="$site_workspace/code.worktrees/jia-184-master-integration/viz"
site_recon=/cwork/jq81/cogan_lab_box/ECoG_Recon
site_output=/hpc/home/jq81/cogan_lab/jq81/avalon/lexical_access_site_preview/real-hga-v1
"$site_python" scripts/export_real_pilot.py --workspace "$site_workspace" --viz "$site_viz" --recon "$site_recon" --output "$site_output"
"$site_python" tests/validate_real_bundle.py --workspace "$site_workspace" --viz "$site_viz" --recon "$site_recon" --output "$site_output"
python3 scripts/package_real_preview.py --output "$site_output"
SITE_REAL_OUTPUT="$site_output" npm run test:real
```

只调整 ROI 显示分组时，`scripts/refresh_roi_curves.py` 可在验证所有源 hash 后刷新描述性曲线，无须重算表面场。页面代码调整只需重新 package 和浏览器检查。

## 验证范围

18 个 task/cell 的真实时间、筛选、左右半球计数、四组曲线、缺失与 support 检查通过；6 个独立曲面抽查通过量化误差界限；36 项真实页面浏览器检查通过。宽度覆盖 320–1440 px，包括章节全展开、键盘/播放/拖动、事件切换、方向/半球、contour、保存视图、子路径和独立文件。

检查环境为 Chromium 软件 GPU；尚未在实体 iOS Safari / Android 设备上测试。尚未发布 GitHub Pages。数据包约 3.5 MB，只有聚合曲面、曲线和模板网格，不包含被试标识、逐电极数组或原始记录。截图在 `figs/`，报告在 `meta/`。


## Surface / rotation revision

The first export and its source validation remain archived as `real-hga-v1`. The current surface bundle is `surface-v2` (23.5 MB raw, 7.4 MB gzip), using 8% native triangles with native normals and exact retained vertex coordinates. The data export command is unchanged except for `--output .../surface-v2`. Package with `scripts/package_real_preview.py --output .../surface-v2`.

Run `tests/validate_surface_upgrade.py --baseline .../real-hga-v1 --output .../surface-v2 --viz <shared-viz> --recon <template-root>` in the scientific Python environment. This independently checks unchanged scientific summaries and fields at all old retained vertices, plus native normal provenance. Run `SITE_SURFACE_OUTPUT=.../surface-v2 npm run test:surface` for the local public build in `meta/public-site`, or add `SITE_SURFACE_URL=https://gilles-jhqian.github.io/lexical-access/` to test the published revision. The root and `/hga/` card URLs remain stable; optional saved-view `yaw`/`pitch` preserve rotation.
