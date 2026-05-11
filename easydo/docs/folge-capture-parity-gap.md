# Folge Capture Parity Gap

更新时间：2026-05-11

## 目的

这份文档只记录已经核对过的事实，用来约束 easyDo 的 click capture 重构，不允许再凭感觉改动核心流程。

## 已核对的 Folge 参考点

- `/Users/jsh/Desktop/Folge_local_runtime/dist/electron/main.js`
- `/Users/jsh/Desktop/Folge_local_runtime/dist/electron/6.js`
- `/Users/jsh/Desktop/Folge_local_runtime/dist/electron/0.js`
- 已确认的 Folge 主进程事件：
  - `app-event:capture:ignoremouseclick`
  - `app-event:capture:acceptmouseclick`
  - `app-event:capture:resume`
  - `app-action:initiate-capture`
  - `app-action:terminate-capture`
  - `app-command:start`
  - `app-command:stop`
- 已确认的 Folge capture window 行为片段：
  - 通过 `He.setIgnoreMouseEvents(true, { forward: true })` 进入点击穿透
  - 通过 `He.setIgnoreMouseEvents(false)` 恢复 capture window 自身交互
  - capture window 通过 `app-navigate:capture` 驱动页面状态
  - 继续显示 capture window，本身承担录制期的状态切换职责
  - capture renderer 在 `mouseenter / mouseleave` 时显式发送 `acceptmouseclick / ignoremouseclick`
  - capture renderer 在 `app-action:initiate-capture` 后进入真正的录制态
  - 录制中的控制面板、最新步骤编辑、Pause / Finish 都在同一个 capture window 内完成
- 已确认的 Folge 截图后端事实：
  - `dist/electron/0.js` 在 macOS 下加载 `capture.darwin-arm64.node` / `capture.darwin-x64.node`
  - 该 native 模块导出 `Screenshots`
  - `Screenshots` 可用接口已实测确认包括 `all()`、`fromPoint()`、`captureSync()`、`captureAreaSync()`
  - 直接调用该模块已实测能返回真实桌面 PNG，而不是 Electron `desktopCapturer` 缩略图层

## 当前 easyDo 已核对实现

- 主进程窗口实现：
  - [window.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/window.service.ts:89)
  - [window.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/window.service.ts:151)
  - [window.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/window.service.ts:232)
- click stream 主流程：
  - [screen-capture.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/screen-capture.service.ts:396)
  - [screen-capture.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/screen-capture.service.ts:427)
  - [screen-capture.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/screen-capture.service.ts:751)
  - [click-stream.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/click-stream.service.ts:47)
  - [click-stream.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/click-stream.service.ts:146)
- preload / renderer capture API：
  - [preload/index.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/preload/index.ts:29)
  - [CaptureOverlayView.vue](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/renderer/src/views/CaptureOverlayView.vue:383)
  - [CaptureStudioPanel.vue](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/renderer/src/components/capture/CaptureStudioPanel.vue:60)
- native capture 对齐：
  - [native-capture.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/native-capture.service.ts:1)
  - [screen-capture.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/screen-capture.service.ts:1)
  - [permissions.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/permissions.service.ts:1)
  - `resources/native-capture/capture.darwin-arm64.node`
  - `resources/native-capture/capture.darwin-x64.node`

## 当前已确认差异

### 1. 窗口拓扑差异

- Folge 目前已核对到的是“单一 capture window 为主，renderer 驱动该窗口在交互态与穿透态之间切换”。
- easyDo 现在是“overlay window + 独立 controls window”双窗口模型。
- 这个差异会直接影响：
  - 焦点恢复
  - 鼠标穿透
  - 打包态透明窗输入行为
  - 控件窗口是否被错误识别为可点击目标

### 2. 鼠标穿透控制权差异

- Folge：capture renderer 发事件给主进程，显式要求 `ignoremouseclick` 或 `acceptmouseclick`。
- easyDo：主进程 `ScreenCaptureService.syncStudioChrome()` 直接决定 `setCaptureOverlayInteractive(...)`。
- 这意味着 easyDo 当前是“主进程推断状态”，不是“capture 页面声明状态”。
- 这正是打包态最可疑的分叉点之一。

### 3. 录制启动节奏差异

- Folge：已核对片段显示，在 `app-action:initiate-capture` 后，capture window 先进入 ignore mouse click，再发 `app-command:start`。
- easyDo：`startStudioCapture` 先执行 `prepareStudioForRecording()`，再启动 `ClickStreamService.startSession()`。
- 也就是 easyDo 当前是“主进程先切 UI，再开 hook”，与 Folge 的事件链并不一致。

### 4. 点击过滤模型差异

- easyDo 当前在 [click-stream.service.ts](/Users/jsh/Desktop/Folge_local_runtime/easydo/src/main/services/click-stream.service.ts:146) 做了较多主进程过滤：
  - 预热时间过滤
  - suppression 窗口
  - 主窗口区域过滤
  - controls 窗口区域过滤
  - display 边界过滤
  - duplicate click 过滤
- Folge 当前已核对到的核心控制点仍然是 capture window 自身的鼠标穿透切换，尚未证明它使用了同样的主进程过滤模型。
- 在未进一步核对前，easyDo 这些过滤逻辑都不能视为 parity 行为。

### 5. 跨进程接口形态差异

- Folge：capture 主流程更多依赖窗口间事件广播与 capture window 内部状态驱动。
- easyDo：大量使用 typed IPC `invoke` 请求式接口，如：
  - `capture:start-studio-capture`
  - `capture:pause-studio-capture`
  - `capture:resume-studio-capture`
  - `capture:finish-studio-capture`
- typed IPC 本身不是问题，但当前它承载了不少原本应由 capture renderer 主导的生命周期控制。

### 6. 状态完成判定差异

- 仓库里此前把 click capture 主路径标记为“已可走通”，但这与当前真实反馈冲突。
- 这说明 easyDo 之前把“开发态部分可用”误记成了“功能完成”。
- 今后涉及 capture / overlay / 权限 / native hook 的功能，必须同时通过 packaged app 验证才允许标记完成。

## 当前结论

- 目前不能声称 easyDo click capture 已 1:1 复刻 Folge。
- 当前最需要回收的不是某个按钮样式，而是 capture 输入模型和窗口职责分配。
- 后续修复优先级应是：
  1. 继续反查 Folge capture renderer 如何发出 ignore/accept mouse click
  2. 把 easyDo capture 流改回 renderer 显式驱动输入穿透
  3. 再验证 packaged app 下的连续点击、暂停恢复、结束回编辑页

## 禁止事项

- 禁止在未核对 Folge 对应链路前继续改 click capture 的窗口行为
- 禁止把“开发环境可用”描述成“功能完成”
- 禁止把推测性的 Electron 经验包装成“参考 Folge 的实现”
