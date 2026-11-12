# 项目介绍页大纲 · 初稿

定位：手机优先的交互式 poster companion；英文访客正文；实验室风格参考 https://www.coganlab.org/ 。白/浅灰底、深蓝文字、克制的排版与脑图；任务沿用 Passive 绿、Decision 酒红、Repetition 蓝。网页阅读字号不套用纸质 poster 的 pt 规则。

## 两条入口

1. 日常介绍卡 → 网站根路径：问题 → 实验 → 动态证据 → 三成分 → 解码 → 总结。
2. Poster session 卡 → 同一网站 #hga：自动展开动态区并定位，停在可直接播放的状态；仍可向下/返回阅读完整故事。

每章原生折叠；Question 与 HGA 默认打开，其余默认折叠；支持全部展开/折叠、章节锚点、键盘操作。最终 URL 确定后再生成两种二维码，避免临时地址印卡。

## 章节与叙事

| 章节 | 要回答的问题 | 本轮框架 | 后续内容接口 |
| --- | --- | --- | --- |
| 封面 | 听到声音后如何进入词义？ | From sound to meaning；双入口 | 最终作者、机构与 poster 标题 |
| 01 Question | 哪些加工无需输出，哪些随输出需求招募？ | 完整引言、两层工作假说、参考文献入口 | 最终文案校对 |
| 02 Design | 如何区分输出需求与输出形式？ | 同一 words/nonwords，Passive / Decision / Repetition；iEEG → HGA → ROI decoding | 实验设计图、核实后的样本/方法数字 |
| 03 In motion | HGA activation 与 contrast 随时间如何变化？ | 播放/暂停/拖动/速度/复位；onset/offset；三任务同步；轮廓叠加；交集；区域曲线 | 小型公开 aggregate、真实脑表面与统计定义 |
| 04 Components | 三个时空效应分别是什么？ | ST late stimulus Nw>Wd 三任务；Ventral+Frontal late stimulus Wd>Nw 两 active；ST+Frontal post-offset Nw>Wd 两 active | 原 poster 相应图板；按钮接入动态视图 |
| 05 Shared information | ROI 内的信息能否跨任务泛化？ | ST 三任务；Ventral 与 Frontal 两 active；1D time-resolved ROI decoding；训练→测试示意 | 当前 JIA-272 的真实曲线，明确实际 train/test 方向 |
| 06 Discussion | 两层关系和下一步是什么？ | output-independent / output-engaged, output-invariant；onset/peak/duration；encoding | 定量时序与 acoustic/phonological/lexical–semantic 模型 |
| References & sharing | 如何继续阅读和分享？ | 文献、实验室链接、两类复制链接、作者/下载接口 | 最终 PDF、作者/联系、GitHub Pages 地址与 QR |

## 两种共同效应展示

A. Three tasks：相同时间、相同配色/标尺；桌面三列，手机紧凑三行。优点是保留每个任务的差异，成本是占屏更多。

B. Contour overlay：同一脑形叠加三任务轮廓，任务颜色/虚线区分；可高亮 all three 或 Decision + Repetition，或只看轮廓。模拟交集以同符号、同时间、同显示阈值的几何重叠生成，不称作显著性或 shared code。

两种视图共享 metric/time/alignment/ROI 状态，可来回比较。真实数据版本需单独确认 overlap、统计门、空间平滑与显示阈值。

## 来源和范围

完整叙事依据 2026-11-05 Notion sfn26 poster Draft 1（JIA-273）：https://app.notion.com/p/40fc602ca33381db9ec0eca1e1059302 。三个成分和 ROI decoding 依据该草稿，不由网页模拟数据推导。本轮只搭框架，未加载/拷贝真实神经数据，未补造样本数、作者、统计量或显著性。

原文尚为 draft；当前页面覆盖其全部叙事章节，最终 PDF 与作者区待接入。旧 UP/cohort/ablation/2D temporal-generalization 叙事不回填。
