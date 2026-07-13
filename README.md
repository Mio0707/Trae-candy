# 六阶段糖塑体验交接包

这是给新前端直接使用的完整材料包，包含当前糖塑瑞兽模型、六阶段流程、手势识别和原舞台动画代码。

## 文件清单

| 文件 | 用途 |
|---|---|
| `assets/hulushi-web.glb` | 当前正在使用的完整糖塑瑞兽三维模型。 |
| `src/BeastStage.js` | 原舞台代码：加载模型、按步骤显示部件、处理瑞兽旋转与祝福粒子。 |
| `src/GestureInput.js` | 摄像头手势识别代码。 |
| `src/stage-content.js` | 15 个步骤的手势提示、舞台提示、非遗小识、六阶段名称和祝福文案。 |
| `src/stage-interaction.js` | 不依赖画面的流程推进代码，可用于全新前端。 |
| `runtime/hand_landmarker.task` | 手势识别所需文件。 |
| `runtime/mediapipe-wasm/` | 手势识别运行所需文件。 |

## 六阶段与步骤

1. 底座：吹起底座。
2. 身体：出现并放置身体。
3. 四肢：拉出四肢、贴上背部糖衣。
4. 头部：出现头部、安放头部。
5. 装饰：尾巴耳朵出现并贴合、贴糖条、出现并安放圆球。
6. 赐福：自动旋转展示、托起瑞兽、祝福显形、收下祝福。

完整的标题、提示、手势规则和非遗小识都在 `src/stage-content.js`，前端不要自己另写一份，以免和现有体验不一致。

## 使用方式

### 方案 A：保留当前三维舞台

安装 `three` 和 `@mediapipe/tasks-vision` 后，把模型路径传给舞台：

```js
import { BeastStage } from './src/BeastStage.js';

const stage = new BeastStage(document.querySelector('#beast-stage'), {
  // 先把 assets/hulushi-web.glb 放入新项目的 public/assets/ 目录。
  modelUrl: '/assets/hulushi-web.glb',
});

stage.addEventListener('stepchange', (event) => {
  const { step, selectedFortune } = event.detail;
  // 用 step.title、step.description、step.knowledge 更新界面
  // selectedFortune 用于完成时显示祝福和粒子颜色
});
```

原舞台的 `next()`、`prev()`、`reset()` 分别用于继续、上一步和重置；`setGesturePreview(progress)` 可让模型在动作完成前跟随手势逐渐变化。

### 方案 B：重新做界面和动画

如果前端希望完全重做舞台，不使用 `BeastStage.js`，只需使用：

```js
import { StageInteraction } from './src/stage-interaction.js';

const interaction = new StageInteraction();
interaction.addEventListener('stepchange', (event) => {
  const { step, phaseIndex, selectedFortune } = event.detail.state;
  // 自己根据 step.animation 播放动画，并显示 step 的全部文案
});
```

摄像头识别到手势后调用：

```js
interaction.acceptGesture({ type: 'fist' });
```

按钮备用方式调用：

```js
interaction.next({ source: 'button' });
```

`complete` 是自动旋转步骤：动画完成后调用 `interaction.finishAutoAnimation()`。进入“托起瑞兽”时，会自动随机得到“顺、喜、勇、旺”中的一种祝福。

## 手势识别接入

`GestureInput` 可以直接使用。新项目若不是部署在 `/six-stage-sugar-experience/` 路径下，请在创建时传入自己的运行文件路径：

```js
const input = new GestureInput({
  videoElement,
  wasmBaseUrl: '/你的公开路径/runtime/mediapipe-wasm',
  onAction: (action) => interaction.acceptGesture(action),
  onStatus: (status) => console.log(status),
});
```

必须保留“继续造物”按钮：摄像头没有授权、被占用或识别失败时，用户仍然能完整走完体验。

## 模型注意事项

- `hulushi-web.glb` 是当前完整瑞兽模型，包含可被逐步显示的独立部件。
- 不要随意改动模型内部部件名称，否则原 `BeastStage.js` 无法按步骤控制。
- 模型与内容用于非遗文化互动，不是高温糖塑教学，也不应表述为艺人标准制作流程。
