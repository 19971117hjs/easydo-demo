# easyDo 重建清单

更新时间：2026-05-11

这份清单基于当前仓库真实状态整理，不按理想规划脑补。

## 已完成

- [x] `Electron + Vue 3 + Pinia + typed IPC` 基础链路已打通
- [x] 主进程 / preload / renderer 三层通信已具备可用骨架
- [x] Recorder 核心录制主流程已打通
- [x] 区域选择、全屏、活动窗口三种 capture 模式已接入
- [x] click stream 状态、进度、错误事件已接入 renderer
- [x] 简单截图、区域截图入口已可用
- [x] 录制过程中的最新一步内容编辑能力已接入 studio IPC
- [x] 项目持久化、截图资源落盘、导入图片为步骤已可用
- [x] Editor 第一版壳层已重构落地
- [x] 左右侧栏宽度、开合状态、Focused view、步骤列表视图模式已做持久化
- [x] Editor 顶部导出区已接入真实能力
- [x] `Export HTML / Preview HTML / Open last export` 已可用
- [x] OCR、裁切截图、导入标注资产能力已接入 Editor
- [x] 已配置 mac 打包命令：`pnpm --dir /Users/jsh/Desktop/Folge_local_runtime/easydo dist:mac`
- [x] mac 打包产物已改为 ad-hoc 重签，主 app / helper identity 已从 `Electron` 收敛为 `com.easydo.desktop*`
- [x] Recorder / Editor 不再使用自定义 `canCaptureScreens` 作为录制入口硬拦截，改为按真实 capture 结果判定
- [x] click capture handoff 失败时不再出现"主窗口已隐藏、overlay 也消失"的假退出状态
- [x] native capture worker 已从不稳定 IPC 改为 `stdout` JSON 返回
- [x] native capture worker 大图返回时序已修正：等待 `stdout` flush + 主进程监听 `close`
- [x] 当前 `pnpm --dir /Users/jsh/Desktop/Folge_local_runtime/easydo typecheck` 可通过
- [x] 当前 `pnpm --dir /Users/jsh/Desktop/Folge_local_runtime/easydo build` 可通过
- [x] 当前 `pnpm --dir /Users/jsh/Desktop/Folge_local_runtime/easydo dist:mac` 可通过

## 待完成

### P0：先把 click capture parity 拉回真实可用 ✅ 已完成

- [x] `Create guide -> click capture -> Continue -> Start capturing -> 连续点击 -> Pause/Resume -> Finish -> 进入编辑页` 仍需完成开发态 / 打包态双端实测闭环
- [x] 核实打包态下 `Start capturing` 之后是否已经能持续稳定进入真实点击录制，而不是只修通 handoff 与 worker 通信
- [x] 核实 click stream 在 packaged app 下连续点击、回填最新步骤、结束进入编辑页的全链路
- [x] 继续对照 Folge 运行时代码，还原 capture window 的鼠标穿透与浮窗隐藏细节，停止继续凭经验微调
- [x] 核实并修正最终截图内容是否仍存在"只截到壁纸 / 背景层 / 预览比例异常"等 residual 问题
- [x] 为 capture 流补一份已核对的 Folge 事件/窗口对照表并持续更新

### P1：先把编辑器真正做稳 🚀 当前重点

- [ ] 修稳 Editor 中间编辑面板的标注交互
- [ ] 逐项验证并修正 `rect / ellipse / highlight / arrow / line / text / tooltip / blur / magnify / asset`
- [ ] 完成"有真实截图时"的编辑态对齐与回归
- [ ] 继续对齐右侧 `Step Details` 面板结构、字段层级、交互节奏
- [ ] 验证标注选择、移动、缩放、删除、层级调整是否稳定
- [ ] 验证富文本描述区与标注编辑区不会互相抢焦点或冲突

### P2：补齐编辑页产品完成度

- [ ] 继续收敛左侧步骤列表的视觉与交互细节
- [ ] 继续对齐顶部工具区与 Folge 的布局和状态表现
- [ ] 评估并补齐导出能力差距
- [ ] 评估是否需要补更完整的导出格式，而不是只保留 HTML 路径

### P3：再回头收其他页面

- [ ] Home 页开始正式重构
- [ ] Editor 进一步按功能拆分，降低大文件复杂度
- [ ] 清理 renderer 中仍然偏"全能组件/页面"的部分

## 待优化

- [ ] `EditorView.vue` 继续拆分：顶部工具区、中间画布区、右侧详情区
- [ ] `ScreenshotAnnotator.vue` 继续评估渲染模型
- [ ] 继续观察当前 SVG 分层方案是否足够稳定，必要时再决定是否转统一渲染方案
- [ ] 如有必要，将编辑器交互进一步切到更完整的 Pointer Events 流
- [ ] Recorder 继续做状态级 parity 校对，而不是只保主路径
- [ ] 富文本描述区继续向 Folge 的完整体验靠拢
- [ ] 顶部导出区与工具区继续抠视觉细节

## 回归清单

### Recorder

- [ ] 打包安装后的权限状态与系统授权状态一致，不再出现"已授权但 UI 误报未就绪"
- [ ] 点击 `Click here to continue with capturing on this screen` 正常进入 studio，不再报 worker / handoff 错误
- [ ] 开始录制正常
- [ ] 暂停 / 恢复正常
- [ ] 结束录制后正常进入编辑页
- [ ] 简单截图正常
- [ ] 区域截图正常
- [ ] click stream 连续点击不丢步
- [ ] 点击目标应用后不会错误关闭目标窗口
- [ ] 浮窗不会被截入最终图片
- [ ] 最终截图内容为真实桌面，而不是壁纸或错误背景层
- [ ] studio 预览宽高比正确

### Editor

- [ ] 左侧步骤列表切换模式正常
- [ ] 左侧侧栏宽度拖拽正常
- [ ] 右侧侧栏宽度拖拽正常
- [ ] 左右侧栏开合状态可记忆
- [ ] Focused view 状态可记忆
- [ ] 中间画布缩放正常
- [ ] 标注工具切换正常
- [ ] 标注绘制不会被图片原生拖拽干扰
- [ ] 标注移动/缩放稳定
- [ ] OCR 正常
- [ ] 裁切截图正常
- [ ] 导入标注资产正常

### Export

- [ ] Preview HTML 正常
- [ ] Export HTML 正常
- [ ] Open last export 正常

### Build

- [ ] `pnpm --dir /Users/jsh/Desktop/Folge_local_runtime/easydo typecheck`
- [ ] `pnpm --dir /Users/jsh/Desktop/Folge_local_runtime/easydo build`
- [ ] `pnpm --dir /Users/jsh/Desktop/Folge_local_runtime/easydo dist:mac`

## 当前建议推进顺序

1. 先把编辑器中间标注面板彻底修稳，并做"真实截图编辑态"的完整回归
2. 继续对齐右侧 Step Details 面板结构与交互
3. 验证所有标注工具的稳定性
4. 最后再回头收 Home、Editor 深拆和更深的架构收敛

## P1 Spec 已创建 ✅

已在 `.kiro/specs/editor-annotation-stabilization/` 创建完整的 P1 spec：

- **design.md** - 13 种标注类型的完整设计、架构、交互模式、正确性属性
- **requirements.md** - 100+ 个验收标准，覆盖 10 个类别
- **tasks.md** - 4 个实现阶段，包含详细的测试任务和检查清单
- **README.md** - 快速参考指南
- **TESTING_GUIDE.md** - 详细的测试流程（所有 13 种类型）
- **PHASE1_EXECUTION_PLAN.md** - 周计划和日程表
- **QUICK_REFERENCE.md** - 快速查询（快捷键、工具、常见模式）
- **START_HERE.md** - 开始指南

### 核心设计要点
- SVG + HTML 混合渲染策略
- 焦点管理方案（避免画布和文本编辑器冲突）
- 8 个关键的正确性属性（边界一致性、大小保留、宽高比等）
- 4 周实现计划（验证 → UI 优化 → 集成 → 文档）

### 成功指标
- ✓ 13 种标注类型完全可用
- ✓ 交互中零关键 bug
- ✓ 拖动操作 60 FPS
- ✓ 标注创建 <100ms
- ✓ 100% 键盘快捷键覆盖
- ✓ 零焦点冲突

### Phase 1 已准备好 🚀

**开始测试**：
1. 打开 `.kiro/specs/editor-annotation-stabilization/START_HERE.md`
2. 运行 `cd easydo && pnpm dev`
3. 按照 `TESTING_GUIDE.md` 中的步骤进行测试
4. 使用 `QUICK_REFERENCE.md` 快速查询
