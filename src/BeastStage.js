import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const MODEL_DISPLAY_ROTATION_Y = -Math.PI / 3;
const BALL_PICKUP_OFFSET = [0, 0.68, -0.45];
const HEAD_PICKUP_OFFSET = [0.18, 0.48, 0];
const TAIL_PICKUP_OFFSET = [0, 0.26, -0.25];
const EARS_PICKUP_OFFSET = [0, 0.3, 0.16];
const HEAD_LINES_PICKUP_OFFSET = [0.68, 0.3, -0.22];
const ANIMATION_TIME_SCALE = 1.5;
const POINT_CLOUD_COUNT = 3600;
const BLESSING_POINT_CLOUD_COUNT = 10800;
const POINT_CLOUD_GATHER_DURATION = 1.6 * ANIMATION_TIME_SCALE;
const POINT_CLOUD_STAGGER_DURATION = 0.5 * ANIMATION_TIME_SCALE;
const PARTICLE_TRAIL_LENGTH = 0.18;
const BLESSING_ROTATION_SPEED = 0.208 * 2;
const BLESSING_ABSORB_SPEED_MULTIPLIER = 2;
const GESTURE_PREVIEW_LERP = 0.13;
const GESTURE_SETTLE_DURATION = 0.45 * ANIMATION_TIME_SCALE;
const BLESSING_FOLLOW_LERP = 0.2;
const BLESSING_FOLLOW_LOST_GRACE = 0.4;
const BLESSING_FOLLOW_MAX_X = 0.72;
const BLESSING_FOLLOW_MAX_Y = 0.48;
const TWO_PI = Math.PI * 2;
const DEFAULT_STAGE_BACKGROUND = 0xf6efe6;
const BLESSING_STAGE_BACKGROUND = 0x050403;
const MODEL_NORMALIZED_SIZE = 1.155;

export const FORTUNES = [
  {
    id: 'shun',
    label: '顺',
    name: '顺遂',
    color: 0x38a848,
    description: '绿色光流从底部升起，再落下汇成瑞兽轮廓。',
    blessing: '愿你一路顺遂，所行皆有回响。',
  },
  {
    id: 'xi',
    label: '喜',
    name: '喜乐',
    color: 0xf1bc36,
    description: '金黄色光流从底部升起，再落下汇成瑞兽轮廓。',
    blessing: '愿你常有喜乐，心中自带暖光。',
  },
  {
    id: 'yong',
    label: '勇',
    name: '镇护',
    color: 0xffffff,
    description: '纯白光流从底部升起，再落下汇成瑞兽轮廓。',
    blessing: '愿你勇气常在，被温柔稳稳守护。',
  },
  {
    id: 'wang',
    label: '旺',
    name: '兴旺',
    color: 0xd73327,
    description: '红色光流从底部升起，再落下汇成瑞兽轮廓。',
    blessing: '愿你元气兴旺，日日都有新生机。',
  },
];

const DEFAULT_FORTUNE_ID = 'shun';
const DEFAULT_PARTICLE_PROFILE = {
  size: 0.028,
  opacity: 0.92,
  trailLength: PARTICLE_TRAIL_LENGTH,
  groupFloat: 0.01,
  groupSway: 0.018,
};
const PART_PARTICLE_WEIGHTS = {
  head: 2,
  head_lines: 0.3,
};

const RAW_EXPERIENCE_STEPS = [
  {
    id: 'base-small',
    title: '吹起底座 1/3',
    description: '握拳一次，让红色糖团开始鼓起。',
    knowledge: '天门糖塑以麦芽糖为主要材料，视觉上常有温润油亮的糖料光泽。',
    visibleGroups: ['base'],
    baseScale: 0.45,
  },
  {
    id: 'base-mid',
    title: '吹起底座 2/3',
    description: '再次握拳，糖团继续变得饱满。',
    knowledge: '糖塑主体常有圆鼓饱满的体量，带有吹塑形成的轻盈感。',
    visibleGroups: ['base'],
    baseScale: 0.75,
  },
  {
    id: 'base-final',
    title: '吹起底座 3/3',
    description: '第三次握拳，红色葫芦状底座定型。',
    knowledge: '“吹”是本体验借用的糖塑造型语言，用来表现糖料鼓起成形。',
    visibleGroups: ['base'],
    baseScale: 1,
  },
  {
    id: 'body-block',
    title: '取黑色身体糖块',
    description: '握拳一次，黑色身体糖块悬空出现。',
    knowledge: '天门糖塑常用红、绿、黑和糖本色，形成鲜明热烈的民间色彩。',
    visibleGroups: ['base', 'body'],
    baseScale: 1,
    partTransforms: {
      body_core: { scale: 0.7, offset: [0, 0.42, 0] },
    },
  },
  {
    id: 'body-place',
    title: '放置身体',
    description: '捏住黑色糖块向底座移动，身体吸附到底座上。',
    knowledge: '糖塑不只是雕刻，也会通过糖块、糖片的组合形成完整造型。',
    visibleGroups: ['base', 'body'],
    baseScale: 1,
  },
  {
    id: 'front-legs',
    title: '拉出前脚',
    description: '捏住向下拉，前脚像从身体里被慢慢拉出来。',
    knowledge: '拉伸、压痕和轻微不规则，是糖塑手作感的重要来源。',
    visibleGroups: ['base', 'body', 'frontLegs'],
    baseScale: 1,
    enterFrom: {
      front_legs: {
        sourcePart: 'body_core',
        sourceOffset: [0, -0.08, 0],
        scale: [0.18, 0.08, 0.18],
        duration: 0.9,
      },
    },
  },
  {
    id: 'back-legs',
    title: '拉出后脚',
    description: '再次向下拉，后脚从身体里延展出来并落位。',
    knowledge: '糖塑艺人常用有限糖料，快速做出夸张又生动的体量。',
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs'],
    baseScale: 1,
    enterFrom: {
      back_legs: {
        sourcePart: 'body_core',
        sourceOffset: [0, -0.08, 0],
        scale: [0.18, 0.08, 0.18],
        duration: 0.9,
      },
    },
  },
  {
    id: 'back-mustache',
    title: '贴上背部糖衣',
    description: '黄色背部糖衣贴到身体上，形成更强的糖塑装饰感。',
    knowledge: '糖塑装饰常像独立糖片一样贴上去，而不是平面画上去。',
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs', 'backMustache'],
    baseScale: 1,
    enterFrom: {
      back_mustache: { offset: [0, 0.28, -0.18], scale: 0.72, duration: 0.75 },
    },
  },
  {
    id: 'head-block',
    title: '取红色头部糖块',
    description: '握拳一次，红色头部糖块悬空出现。',
    knowledge: '天门糖塑造型常饱满夸张，不追求写实，而强调鲜明特征。',
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs', 'backMustache', 'head'],
    baseScale: 1,
    partTransforms: {
      head: { scale: 0.7, offset: [0.18, 0.48, 0] },
    },
  },
  {
    id: 'head-place',
    title: '安放头部',
    description: '捏住头部糖块向身体前方移动，头部落位。',
    knowledge: '接缝和拼接关系可以被保留下来，让作品更像真实手作糖塑。',
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs', 'backMustache', 'head'],
    baseScale: 1,
  },
  {
    id: 'tail',
    title: '贴上尾巴',
    description: '先把尾巴糖片贴到身体后方。',
    knowledge: '尾巴、耳朵和背部装饰，都可以理解为糖片或糖条的组合。',
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs', 'head', 'tail', 'backMustache'],
    baseScale: 1,
    enterFrom: {
      tail_ears_1: { offset: [0, 0.2, -0.22], scale: 0.7, duration: 0.75 },
    },
  },
  {
    id: 'turn-front',
    title: '转到展示角度',
    description: '做一个旋转手势，让瑞兽转到斜正面的展示角度，准备贴耳朵和头部糖条。',
    knowledge: '糖塑作品常强调动势，造型要有精神，不像静止的工业摆件。',
    frontView: true,
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs', 'head', 'tail', 'backMustache'],
    baseScale: 1,
  },
  {
    id: 'ears',
    title: '贴上两个耳朵',
    description: '再把两个耳朵糖片贴到头部两侧。',
    knowledge: '轻微不对称不是缺陷，它会让糖塑更有民间手作的生命力。',
    frontView: true,
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs', 'head', 'tail', 'ears', 'backMustache'],
    baseScale: 1,
    enterFrom: {
      tail_ears_2: { offset: [0, 0.24, 0.12], scale: 0.7, duration: 0.75 },
    },
  },
  {
    id: 'head-lines',
    title: '贴上头部和嘴部糖条',
    description: '红绿糖条贴到头部和嘴部，形成凸起纹样。',
    knowledge: '糖塑纹样常像被搓、压、贴出来的凸起糖条，而不是印刷图案。',
    frontView: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
    ],
    baseScale: 1,
  },
  {
    id: 'ball-form',
    title: '捏出爪下圆球',
    description: '双手靠近时，圆球糖料先像头部糖块一样在空中出现。',
    knowledge: '传统糖塑常通过简单形体组合，做出更丰富的故事感和吉祥意味。',
    frontView: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
      'ball',
    ],
    baseScale: 1,
    partTransforms: {
      ball: { scale: 0.7, offset: BALL_PICKUP_OFFSET },
    },
    enterFrom: {
      ball: { offset: [0, 0.12, 0], scale: 0.18, duration: 0.65 },
    },
  },
  {
    id: 'ball-place',
    title: '安放爪下圆球',
    description: '捏合向下时，圆球落到爪子下方，瑞兽主体完成。',
    knowledge: '瑞兽、圆球等元素在本体验中用于表达守护、圆满和祝愿。',
    frontView: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
      'ball',
    ],
    baseScale: 1,
    enterFrom: {
      ball: { offset: BALL_PICKUP_OFFSET, scale: 0.7, duration: 0.75 },
    },
  },
  {
    id: 'complete',
    title: '旋转展示',
    description: '伸出一根手指朝上绕一圈，整件作品平行旋转一圈，展示完整瑞兽。',
    knowledge: '本作品是基于天门糖塑艺术语言的数字创意设计，不是传统样式复刻。',
    frontView: true,
    showcaseSpin: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
      'ball',
    ],
    baseScale: 1,
  },
  {
    id: 'fortune-select',
    title: '选择祝福',
    description: '从“顺、喜、勇、旺”里选择一种祝福，准备送给糖塑瑞兽。',
    knowledge: '糖塑常承载喜庆、吉祥、守护等民俗寓意。',
    frontView: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
      'ball',
    ],
    baseScale: 1,
  },
  {
    id: 'lift-blessing',
    title: '托起瑞兽',
    description: '手掌停在瑞兽下方，托起整件作品，让选中的祝福开始流动。',
    knowledge: '这里的祝福粒子是数字化表达，用来延展糖塑作品中的吉祥意味。',
    frontView: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
      'ball',
    ],
    baseScale: 1,
  },
  {
    id: 'fortune-shell',
    title: '祝福显形',
    description: '瑞兽短暂化成由祝福粒子组成的轮廓。捏拳收拢，把这份祝福带走。',
    knowledge: '粒子效果不是传统糖塑技法，而是本体验加入的互动视觉表达。',
    frontView: true,
    ethereal: true,
    blessingSpin: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
      'ball',
    ],
    baseScale: 1,
  },
  {
    id: 'blessing-complete',
    title: '祝福完成',
    description: '你的糖塑瑞兽已收到祝福。它带着这份心意，完成了今天的吹糖造物。',
    knowledge: '真实糖塑制作涉及高温糖料，本体验只做文化感受和数字互动表达。',
    frontView: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
      'headLines',
      'ball',
    ],
    baseScale: 1,
  },
];

const ACTIVE_STEP_IDS = [
  'base-small',
  'body-block',
  'front-legs',
  'back-mustache',
  'head-block',
  'head-place',
  'tail',
  'ears',
  'head-lines',
  'ball-form',
  'ball-place',
  'complete',
  'lift-blessing',
  'fortune-shell',
  'blessing-complete',
];

const ACTIVE_STEP_OVERRIDES = {
  'base-small': {
    title: '吹起底座',
    description: '先张开手掌准备，再握拳一次，让红色糖团鼓起并定型成底座。',
    knowledge: '天门糖塑用吹制扩充中空体量，称为“泡活”：既节省糖料，又能形成圆鼓饱满的外形。',
    baseScale: 1,
  },
  'body-block': {
    title: '出现并放置身体',
    description: '先松开拳头，再次握拳，黑色身体糖块出现并落到底座上。',
    knowledge: '天门糖塑讲究“吹塑结合”：先吹出中空大体量，再用捏、拉、压、贴完成细节，省糖却显得饱满。',
    partTransforms: null,
  },
  'front-legs': {
    title: '拉出四肢',
    description: '先合拢拇指和食指，再逐渐张开，让前后脚从黑色身体内部延展出来。',
    knowledge: '主体之外的枝节和细部由塑制丰富，这种处理称为“头子活”；四肢抓住动势和轮廓就能显出精神。',
    visibleGroups: ['base', 'body', 'frontLegs', 'backLegs'],
    enterFrom: null,
  },
  'back-mustache': {
    title: '贴上背部糖衣',
    description: '先张开拇指和食指，再逐渐并拢，让黄色背部糖衣贴到身体上。',
    knowledge: '天门糖塑常把糖料压成糖片，再通过剪、贴组成衣纹和装饰；薄处微微透亮，厚处色泽更饱满，贴合处还会保留自然接缝。',
    enterFrom: null,
  },
  'head-block': {
    title: '出现头部',
    description: '张开手掌，让红色头部糖块在空中逐渐出现。',
    knowledge: '天门糖塑重在“传神”：头可以夸张，眼睛和姿态尤其要有精神，让人一眼认出角色的性格。',
    partTransforms: null,
    enterFrom: null,
  },
  'head-place': {
    title: '安放头部',
    description: '先张开手掌准备，再握拳，让头部落到身体前方。',
    knowledge: '',
    enterFrom: null,
  },
  tail: {
    title: '出现尾巴和耳朵',
    description: '先合拢拇指和食指，再逐渐张开，让尾巴和两个耳朵糖片在空中出现。',
    knowledge: '在这件真实瑞兽作品中，尾巴和两只耳朵都用小弹簧连接；轻轻一动，糖片便会微微颤动，让瑞兽更有神气。',
    frontView: true,
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
    ],
    enterFrom: null,
  },
  ears: {
    title: '贴上尾巴和耳朵',
    description: '逐渐并拢拇指和食指，让尾巴和两个耳朵贴到瑞兽上。',
    knowledge: '',
    visibleGroups: [
      'base',
      'body',
      'frontLegs',
      'backLegs',
      'head',
      'tail',
      'ears',
      'backMustache',
    ],
    enterFrom: null,
  },
  'head-lines': {
    title: '贴上头部和嘴部糖条',
    description: '先合拢拇指和食指，再逐渐张开，让红绿糖条贴到头部和嘴部。',
    knowledge: '梳齿纹、卷曲线和凸起糖条是常见装饰语言；红、绿、黑与糖本色形成明快热烈的民间色彩。',
    enterFrom: null,
  },
  'ball-form': {
    title: '出现爪下圆球',
    description: '张开手掌，让圆球糖料在空中逐渐出现。',
    knowledge: '天门糖塑善用圆球、糖片、糖条等简单形体组合，以有限糖料塑出丰富层次，这正是艺人的“讨巧”。',
    partTransforms: null,
    enterFrom: null,
  },
  'ball-place': {
    title: '安放爪下圆球',
    description: '先张开手掌准备，再握拳，让圆球落到瑞兽爪下。',
    knowledge: '糖塑曾走进庙会、婚庆和寿诞等生活场景。瑞兽等题材寄托着吉祥、守护和圆满。',
    enterFrom: null,
  },
  complete: {
    description: '瑞兽主体完成，整件作品将自动旋转一圈并进入赐福。',
    knowledge: '',
    showcaseSpin: true,
    autoAdvanceAfterSpin: true,
  },
  'lift-blessing': {
    description: '先在瑞兽上方张开手掌，再向下移动到瑞兽下方并停留。',
    knowledge: '天门糖塑植根江汉平原民间生活，作品常以生动造型承载喜庆、吉祥和守护的愿望。',
  },
  'fortune-shell': {
    description: '等待祝福粒子完整显形，再握拳收拢，把这份祝福带走。',
    knowledge: '',
  },
  'blessing-complete': {
    knowledge: '天门糖塑是国家级非物质文化遗产代表性项目；本体验用于文化感受，不等同于真实高温制作教学。',
  },
};

const GESTURE_SETTLE_STEP_IDS = new Set([
  'base-small',
  'body-block',
  'front-legs',
  'back-mustache',
  'head-block',
  'head-place',
  'tail',
  'ears',
  'head-lines',
  'ball-form',
  'ball-place',
]);

export const EXPERIENCE_STEPS = ACTIVE_STEP_IDS.map((id) => {
  const step = RAW_EXPERIENCE_STEPS.find((item) => item.id === id);
  return {
    ...step,
    ...ACTIVE_STEP_OVERRIDES[id],
  };
});

const PART_GROUPS = {
  base: ['base'],
  body: ['body_core'],
  frontLegs: ['front_legs'],
  backLegs: ['back_legs'],
  head: ['head'],
  tail: ['tail_ears_1'],
  ears: ['tail_ears_2'],
  backMustache: ['back_mustache'],
  headLines: ['head_lines'],
  ball: ['ball'],
};

export class BeastStage extends EventTarget {
  constructor(container, options = {}) {
    super();
    this.container = container;
    this.modelUrl = options.modelUrl ?? '/models/hulushi-web.glb';
    this.stepIndex = 0;
    this.parts = new Map();
    this.originalPartTransforms = new Map();
    this.partGroups = PART_GROUPS;
    this.baseOriginalScale = new THREE.Vector3(1, 1, 1);
    this.materialStates = new Map();
    this.activeTransitions = new Map();
    this.showcaseSpin = null;
    this.gestureSettle = null;
    this.selectedFortune = null;
    this.absorbAnimation = null;
    this.blessingParticles = null;
    this.clock = new THREE.Clock();
    this.lastInteractionLocked = false;
    this.interactionPreview = 0;
    this.interactionPreviewTarget = 0;
    this.blessingFollowTarget = new THREE.Vector3();
    this.blessingFollowLastSeenAt = -Infinity;
    this.blessingFollowRaycaster = new THREE.Raycaster();
    this.blessingFollowPlane = new THREE.Plane();
    this.particleTexture = this.createParticleTexture();

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.interactionPreview = 0;
    this.interactionPreviewTarget = 0;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    this.camera.position.set(0, 1.1, 3.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.35, 0);

    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);

    this.particleRoot = new THREE.Group();
    this.scene.add(this.particleRoot);

    this.setupLights();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate();
  }

  createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);

    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.82)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xfff7ef, 0x5c3b24, 2.2);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(2.5, 3.5, 4);
    key.castShadow = true;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffd7a3, 1.2);
    fill.position.set(-3, 1.5, -2);
    this.scene.add(fill);
  }

  async load() {
    const loader = new GLTFLoader();

    // fetch + parse instead of loadAsync to avoid large file timeout issues
    const response = await fetch(this.modelUrl);
    if (!response.ok) {
      throw new Error(`模型请求失败: HTTP ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    });
    this.modelRoot.clear();
    this.modelRoot.add(gltf.scene);

    this.parts.clear();
    gltf.scene.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      this.parts.set(node.name, node);
      node.userData.targetVisible = false;
      node.userData.fade = 0;
    });

    this.normalizeModel(gltf.scene);
    this.originalPartTransforms.clear();
    for (const [name, part] of this.parts) {
      this.originalPartTransforms.set(name, {
        position: part.position.clone(),
        rotation: part.rotation.clone(),
        scale: part.scale.clone(),
      });
    }

    const base = this.parts.get('base');
    if (base) this.baseOriginalScale.copy(base.scale);
    this.captureMaterialStates();
    this.setStep(0);
    return this.getReport();
  }

  normalizeModel(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const scale = MODEL_NORMALIZED_SIZE / maxAxis;

    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -center.y * scale + 0.15, -center.z * scale);
  }

  setStep(index) {
    this.stepIndex = THREE.MathUtils.clamp(index, 0, EXPERIENCE_STEPS.length - 1);
    const step = EXPERIENCE_STEPS[this.stepIndex];
    const visiblePartNames = new Set();
    this.activeTransitions.clear();
    this.showcaseSpin = null;
    this.gestureSettle = null;
    this.absorbAnimation = null;
    this.interactionPreview = 0;
    this.interactionPreviewTarget = 0;
    this.clearBlessingParticles();
    this.modelRoot.position.y = 0;
    this.particleRoot.position.set(0, 0, 0);
    this.blessingFollowTarget.set(0, 0, 0);
    this.blessingFollowLastSeenAt = -Infinity;
    this.scene.background = null;

    for (const groupName of step.visibleGroups) {
      for (const partName of this.partGroups[groupName] ?? []) {
        visiblePartNames.add(partName);
      }
    }

    for (const [partName, part] of this.parts) {
      const shouldShow = visiblePartNames.has(partName);
      this.restorePartTransform(partName, part);
      part.visible = shouldShow;
      part.userData.targetVisible = shouldShow;
      part.userData.fade = shouldShow ? 1 : 0;
    }

    const base = this.parts.get('base');
    if (base) {
      base.scale.copy(this.baseOriginalScale).multiplyScalar(step.baseScale ?? 1);
      base.visible = true;
    }

    this.applyStepTransforms(step);
    this.applyEnterTransitions(step);
    this.applyGesturePreview(step, 0);
    if (step.id === 'lift-blessing' && !this.selectedFortune) {
      this.selectedFortune = this.getRandomFortune();
    }
    this.setModelEthereal(Boolean(step.ethereal));
    if (step.frontView) this.focusFrontView();
    if (step.showcaseSpin) {
      this.startShowcaseSpin({ advanceOnComplete: Boolean(step.autoAdvanceAfterSpin) });
    }
    if (step.id === 'fortune-shell') {
      if (!this.selectedFortune) this.selectedFortune = FORTUNES[0];
      this.createBlessingParticles({ count: BLESSING_POINT_CLOUD_COUNT });
    }
    if (step.id === 'blessing-complete') {
      this.setModelEthereal(false);
    }

    this.dispatchEvent(new CustomEvent('stepchange', { detail: this.getState() }));
  }

  restorePartTransform(partName, part) {
    const original = this.originalPartTransforms.get(partName);
    if (!original) return;

    part.position.copy(original.position);
    part.rotation.copy(original.rotation);
    part.scale.copy(original.scale);
  }

  applyStepTransforms(step) {
    if (!step.partTransforms) return;

    for (const [partName, transform] of Object.entries(step.partTransforms)) {
      const part = this.parts.get(partName);
      const original = this.originalPartTransforms.get(partName);
      if (!part || !original) continue;

      if (transform.scale != null) {
        part.scale.copy(this.getScaledVector(original.scale, transform.scale));
      }

      if (transform.offset) {
        part.position.copy(original.position).add(new THREE.Vector3(...transform.offset));
      }
    }
  }

  applyEnterTransitions(step) {
    if (!step.enterFrom) return;

    const now = this.clock.getElapsedTime();

    for (const [partName, transform] of Object.entries(step.enterFrom)) {
      const part = this.parts.get(partName);
      if (!part || !part.visible) continue;

      const targetPosition = part.position.clone();
      const targetScale = part.scale.clone();
      const fromPosition = this.getTransitionStartPosition(part, targetPosition, transform);
      const fromScale = this.getScaledVector(targetScale, transform.scale ?? 1);

      part.position.copy(fromPosition);
      part.scale.copy(fromScale);

      this.activeTransitions.set(partName, {
        part,
        fromPosition,
        targetPosition,
        fromScale,
        targetScale,
        start: now,
        duration: (transform.duration ?? 0.75) * ANIMATION_TIME_SCALE,
      });
    }
  }

  getTransitionStartPosition(part, targetPosition, transform) {
    if (transform.sourcePart) {
      const sourcePart = this.parts.get(transform.sourcePart);

      if (sourcePart) {
        const sourceBox = new THREE.Box3().setFromObject(sourcePart);
        const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
        const localSourceCenter = part.parent
          ? part.parent.worldToLocal(sourceCenter.clone())
          : sourceCenter;

        return localSourceCenter.add(new THREE.Vector3(...(transform.sourceOffset ?? [0, 0, 0])));
      }
    }

    return targetPosition.clone().add(new THREE.Vector3(...(transform.offset ?? [0, 0, 0])));
  }

  getScaledVector(baseScale, scale) {
    if (Array.isArray(scale)) {
      return baseScale.clone().multiply(new THREE.Vector3(...scale));
    }

    return baseScale.clone().multiplyScalar(scale);
  }

  setGesturePreview(progress) {
    if (this.isInteractionLocked()) return;
    this.interactionPreviewTarget = THREE.MathUtils.clamp(progress, 0, 1);
  }

  setBlessingHandTarget(normalizedX, normalizedY) {
    const step = EXPERIENCE_STEPS[this.stepIndex];
    // 粒子跟随手只在 fortune-shell 步骤生效
    if (step?.id !== 'fortune-shell' || !this.blessingParticles || this.absorbAnimation) return;

    const elapsed = this.clock.getElapsedTime();
    const gatherTime = elapsed - this.blessingParticles.start;
    if (gatherTime < POINT_CLOUD_GATHER_DURATION + POINT_CLOUD_STAGGER_DURATION) return;

    const center = this.blessingParticles.center;
    const planeNormal = this.camera.getWorldDirection(new THREE.Vector3());
    this.blessingFollowPlane.setFromNormalAndCoplanarPoint(planeNormal, center);
    this.blessingFollowRaycaster.setFromCamera(
      new THREE.Vector2(
        THREE.MathUtils.clamp(normalizedX, 0, 1) * 2 - 1,
        1 - THREE.MathUtils.clamp(normalizedY, 0, 1) * 2,
      ),
      this.camera,
    );

    const hit = this.blessingFollowRaycaster.ray.intersectPlane(
      this.blessingFollowPlane,
      new THREE.Vector3(),
    );
    if (!hit) return;

    this.blessingFollowTarget.set(
      THREE.MathUtils.clamp(hit.x - center.x, -BLESSING_FOLLOW_MAX_X, BLESSING_FOLLOW_MAX_X),
      THREE.MathUtils.clamp(hit.y - center.y, -BLESSING_FOLLOW_MAX_Y, BLESSING_FOLLOW_MAX_Y),
      0,
    );
    this.blessingFollowLastSeenAt = elapsed;
  }

  clearBlessingHandTarget() {
    if (this.clock.getElapsedTime() - this.blessingFollowLastSeenAt < BLESSING_FOLLOW_LOST_GRACE) return;
    this.blessingFollowTarget.set(0, 0, 0);
  }

  updateBlessingHandFollow(step) {
    if (this.absorbAnimation) return;
    if (step?.id !== 'fortune-shell' || !this.blessingParticles) {
      this.blessingFollowTarget.set(0, 0, 0);
    }

    this.particleRoot.position.lerp(this.blessingFollowTarget, BLESSING_FOLLOW_LERP);
    if (this.particleRoot.position.distanceToSquared(this.blessingFollowTarget) < 0.000001) {
      this.particleRoot.position.copy(this.blessingFollowTarget);
    }
  }

  updateGesturePreview(step) {
    if (this.activeTransitions.size > 0 || this.showcaseSpin || this.absorbAnimation) return;

    this.interactionPreview = THREE.MathUtils.lerp(
      this.interactionPreview,
      this.interactionPreviewTarget,
      GESTURE_PREVIEW_LERP,
    );
    if (Math.abs(this.interactionPreview - this.interactionPreviewTarget) < 0.001) {
      this.interactionPreview = this.interactionPreviewTarget;
    }
    this.applyGesturePreview(step, this.interactionPreview);
  }

  applyGesturePreview(step, progress) {
    if (step.id === 'base-small') {
      const base = this.parts.get('base');
      if (base) {
        base.scale.copy(this.baseOriginalScale).multiplyScalar(THREE.MathUtils.lerp(0.52, 1, progress));
      }
      return;
    }

    if (step.id === 'body-block') {
      this.applyPartPreview('body_core', progress, { offset: [0, 0.42, 0], minScale: 0.55 });
      return;
    }

    if (step.id === 'front-legs') {
      this.applyLegExtensionPreview('front_legs', progress);
      this.applyLegExtensionPreview('back_legs', progress);
      return;
    }

    if (step.id === 'back-mustache') {
      this.applyPartPreview('back_mustache', progress, {
        offset: [0, 0.28, -0.18],
        minScale: 0.68,
      });
      return;
    }

    if (step.id === 'head-block') {
      this.applyFloatingPartPreview('head', progress, {
        offset: HEAD_PICKUP_OFFSET,
        pickupScale: 0.7,
      });
      return;
    }

    if (step.id === 'head-place') {
      this.applyPartPlacementPreview('head', progress, {
        offset: HEAD_PICKUP_OFFSET,
        pickupScale: 0.7,
      });
      return;
    }

    if (step.id === 'tail') {
      this.applyFloatingPartPreview('tail_ears_1', progress, {
        offset: TAIL_PICKUP_OFFSET,
        pickupScale: 0.7,
      });
      this.applyFloatingPartPreview('tail_ears_2', progress, {
        offset: EARS_PICKUP_OFFSET,
        pickupScale: 0.7,
      });
      return;
    }

    if (step.id === 'ears') {
      this.applyPartPlacementPreview('tail_ears_1', progress, {
        offset: TAIL_PICKUP_OFFSET,
        pickupScale: 0.7,
      });
      this.applyPartPlacementPreview('tail_ears_2', progress, {
        offset: EARS_PICKUP_OFFSET,
        pickupScale: 0.7,
      });
      return;
    }

    if (step.id === 'head-lines') {
      this.applyPartPreview('head_lines', progress, {
        offset: HEAD_LINES_PICKUP_OFFSET,
        minScale: 0.74,
      });
      return;
    }

    if (step.id === 'ball-form') {
      this.applyBallAppearPreview(progress);
      return;
    }

    if (step.id === 'ball-place') {
      this.applyBallPlacementPreview(progress);
      return;
    }

    if (step.id === 'lift-blessing') {
      this.modelRoot.position.y = THREE.MathUtils.lerp(0, 0.18, progress);
      return;
    }

    this.modelRoot.position.y = 0;
  }

  applyPartPreview(partName, progress, { offset = [0, 0, 0], minScale = 0.6 } = {}) {
    const part = this.parts.get(partName);
    const original = this.originalPartTransforms.get(partName);
    if (!part || !original) return;

    const remaining = 1 - THREE.MathUtils.clamp(progress, 0, 1);
    part.position.copy(original.position).addScaledVector(new THREE.Vector3(...offset), remaining);
    part.rotation.copy(original.rotation);
    part.scale.copy(original.scale);

    if (Array.isArray(minScale)) {
      part.scale.multiply(new THREE.Vector3(
        THREE.MathUtils.lerp(minScale[0], 1, progress),
        THREE.MathUtils.lerp(minScale[1], 1, progress),
        THREE.MathUtils.lerp(minScale[2], 1, progress),
      ));
    } else {
      part.scale.multiplyScalar(THREE.MathUtils.lerp(minScale, 1, progress));
    }
  }

  applyFloatingPartPreview(partName, progress, { offset, pickupScale = 0.7 }) {
    const part = this.parts.get(partName);
    const original = this.originalPartTransforms.get(partName);
    if (!part || !original) return;

    const normalized = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = normalized * normalized * (3 - 2 * normalized);
    part.visible = normalized > 0.015;
    part.position.copy(original.position).add(new THREE.Vector3(...offset));
    part.rotation.copy(original.rotation);
    part.scale.copy(original.scale).multiplyScalar(
      THREE.MathUtils.lerp(pickupScale * 0.18, pickupScale, eased),
    );
  }

  applyPartPlacementPreview(partName, progress, { offset, pickupScale = 0.7 }) {
    const part = this.parts.get(partName);
    const original = this.originalPartTransforms.get(partName);
    if (!part || !original) return;

    const normalized = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = normalized * normalized * (3 - 2 * normalized);
    const pickupPosition = original.position.clone().add(new THREE.Vector3(...offset));
    part.visible = true;
    part.position.lerpVectors(pickupPosition, original.position, eased);
    part.rotation.copy(original.rotation);
    part.scale.copy(original.scale).multiplyScalar(
      THREE.MathUtils.lerp(pickupScale, 1, eased),
    );
  }

  applyLegExtensionPreview(partName, progress) {
    const part = this.parts.get(partName);
    const original = this.originalPartTransforms.get(partName);
    if (!part || !original) return;

    const normalized = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = normalized * normalized * (3 - 2 * normalized);
    const sourcePosition = this.getTransitionStartPosition(part, original.position, {
      sourcePart: 'body_core',
      sourceOffset: [0, -0.06, 0],
    });

    part.visible = normalized > 0.015;
    part.position.lerpVectors(sourcePosition, original.position, eased);
    part.rotation.copy(original.rotation);
    part.scale.copy(original.scale).multiply(new THREE.Vector3(
      THREE.MathUtils.lerp(0.16, 1, eased),
      THREE.MathUtils.lerp(0.035, 1, eased),
      THREE.MathUtils.lerp(0.16, 1, eased),
    ));
  }

  applyBallAppearPreview(progress) {
    const part = this.parts.get('ball');
    const original = this.originalPartTransforms.get('ball');
    if (!part || !original) return;

    const normalized = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = normalized * normalized * (3 - 2 * normalized);
    part.visible = normalized > 0.015;
    part.position.copy(original.position).add(new THREE.Vector3(...BALL_PICKUP_OFFSET));
    part.rotation.copy(original.rotation);
    part.scale.copy(original.scale).multiplyScalar(THREE.MathUtils.lerp(0.05, 0.7, eased));
  }

  applyBallPlacementPreview(progress) {
    const part = this.parts.get('ball');
    const original = this.originalPartTransforms.get('ball');
    if (!part || !original) return;

    const normalized = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = normalized * normalized * (3 - 2 * normalized);
    const pickupPosition = original.position.clone().add(new THREE.Vector3(...BALL_PICKUP_OFFSET));
    part.visible = true;
    part.position.lerpVectors(pickupPosition, original.position, eased);
    part.rotation.copy(original.rotation);
    part.scale.copy(original.scale).multiplyScalar(THREE.MathUtils.lerp(0.7, 1, eased));
  }

  focusFrontView() {
    this.camera.position.set(0, 1.1, 3.2);
    this.controls.target.set(0, 0.35, 0);
    this.controls.update();
    this.modelRoot.rotation.y = MODEL_DISPLAY_ROTATION_Y;
  }

  startShowcaseSpin({ advanceOnComplete = false } = {}) {
    if (this.showcaseSpin) return false;

    this.showcaseSpin = {
      start: this.clock.getElapsedTime(),
      duration: 2.4 * ANIMATION_TIME_SCALE,
      from: MODEL_DISPLAY_ROTATION_Y,
      to: MODEL_DISPLAY_ROTATION_Y + Math.PI * 2,
      advanceOnComplete,
    };
    this.emitInteractionStateIfChanged(true);
    return true;
  }

  advanceToLiftBlessing() {
    this.selectedFortune = this.getRandomFortune();
    const liftIndex = EXPERIENCE_STEPS.findIndex((step) => step.id === 'lift-blessing');
    this.setStep(liftIndex >= 0 ? liftIndex : this.stepIndex + 1);
  }

  next() {
    const step = EXPERIENCE_STEPS[this.stepIndex];
    const isFinalStep = this.stepIndex >= EXPERIENCE_STEPS.length - 1;

    if (isFinalStep || this.isInteractionLocked()) return false;

    if (step.id === 'complete') {
      return this.startShowcaseSpin({ advanceOnComplete: true });
    }

    if (step.id === 'lift-blessing') {
      if (!this.selectedFortune) this.selectedFortune = FORTUNES[0];
      this.setStep(this.stepIndex + 1);
      return true;
    }

    if (step.id === 'fortune-shell') {
      this.startAbsorbFortune();
      this.emitInteractionStateIfChanged(true);
      return true;
    }

    if (GESTURE_SETTLE_STEP_IDS.has(step.id)) {
      return this.startGestureSettle();
    }

    this.setStep(this.stepIndex + 1);
    return true;
  }

  startGestureSettle() {
    if (this.gestureSettle) return false;

    this.interactionPreviewTarget = 1;
    this.gestureSettle = {
      start: this.clock.getElapsedTime(),
      duration: GESTURE_SETTLE_DURATION,
      from: this.interactionPreview,
      nextIndex: this.stepIndex + 1,
    };
    this.emitInteractionStateIfChanged(true);
    return true;
  }

  updateGestureSettle(elapsed, step) {
    if (!this.gestureSettle) return;

    const progress = THREE.MathUtils.clamp(
      (elapsed - this.gestureSettle.start) / this.gestureSettle.duration,
      0,
      1,
    );
    const eased = progress * progress * (3 - 2 * progress);
    this.interactionPreview = THREE.MathUtils.lerp(this.gestureSettle.from, 1, eased);
    this.interactionPreviewTarget = 1;
    this.applyGesturePreview(step, this.interactionPreview);

    if (progress >= 1) {
      const nextIndex = this.gestureSettle.nextIndex;
      this.gestureSettle = null;
      this.setStep(nextIndex);
    }
  }

  prev() {
    this.setStep(this.stepIndex - 1);
  }

  reset() {
    this.selectedFortune = null;
    this.setModelEthereal(false);
    this.setStep(0);
  }

  showAll() {
    this.setStep(EXPERIENCE_STEPS.length - 1);
  }

  selectFortune(fortuneId) {
    this.selectedFortune = FORTUNES.find((fortune) => fortune.id === fortuneId) ?? FORTUNES[0];
    const liftIndex = EXPERIENCE_STEPS.findIndex((step) => step.id === 'lift-blessing');

    if (liftIndex >= 0 && this.stepIndex < liftIndex) {
      this.setStep(liftIndex);
    } else {
      this.dispatchEvent(new CustomEvent('stepchange', { detail: this.getState() }));
    }
  }

  getRandomFortune() {
    return FORTUNES[Math.floor(Math.random() * FORTUNES.length)] ?? FORTUNES[0];
  }

  getFortuneParticleProfile() {
    return { ...DEFAULT_PARTICLE_PROFILE };
  }

  getBlessingParticleOrigin({ center, radius, targetX, targetY, targetZ, phase }) {
    const dx = targetX - center.x;
    const dy = targetY - center.y;
    const dz = targetZ - center.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    const floatOut = radius * (0.06 + Math.random() * 0.22);
    const side = radius * (Math.random() - 0.5) * 0.18;

    return {
      x: targetX + (dx / length) * floatOut + Math.cos(phase) * side,
      y: targetY + (dy / length) * floatOut + Math.sin(phase * 1.27) * side,
      z: targetZ + (dz / length) * floatOut + Math.sin(phase) * side,
    };
  }

  createBlessingParticles(options = {}) {
    this.clearBlessingParticles();

    const fortune = this.selectedFortune ?? FORTUNES[0];
    const profile = this.getFortuneParticleProfile();
    const particleSize = options.particleSize ?? profile.size;
    const particleOpacity = options.opacity ?? profile.opacity;
    const particleBlending = options.blending ?? THREE.AdditiveBlending;
    const hasTrails = options.trails ?? false;
    const sample = this.sampleModelSurfacePoints(options.count ?? POINT_CLOUD_COUNT);
    const { targets, center, radius } = sample;
    const count = targets.length / 3;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const origins = new Float32Array(count * 3);
    const seeds = [];
    const particleColor = new THREE.Color(fortune.color);

    for (let index = 0; index < count; index += 1) {
      const x = targets[index * 3];
      const y = targets[index * 3 + 1];
      const z = targets[index * 3 + 2];
      const phase = Math.random() * TWO_PI;
      const normalX = x - center.x;
      const normalY = y - center.y;
      const normalZ = z - center.z;
      const normalLength = Math.hypot(normalX, normalY, normalZ) || 1;
      const nx = normalX / normalLength;
      const ny = normalY / normalLength;
      const nz = normalZ / normalLength;
      const tx = -nz;
      const tz = nx;
      const tangentLength = Math.hypot(tx, tz) || 1;
      const tangentX = tx / tangentLength;
      const tangentY = 0;
      const tangentZ = tz / tangentLength;
      const crossX = ny * tangentZ - nz * tangentY;
      const crossY = nz * tangentX - nx * tangentZ;
      const crossZ = nx * tangentY - ny * tangentX;
      const brightness = 0.68 + Math.random() * 0.5;
      const origin = this.getBlessingParticleOrigin({
        center,
        radius,
        targetX: x,
        targetY: y,
        targetZ: z,
        phase,
      });

      origins[index * 3] = origin.x;
      origins[index * 3 + 1] = origin.y;
      origins[index * 3 + 2] = origin.z;
      positions[index * 3] = origin.x;
      positions[index * 3 + 1] = origin.y;
      positions[index * 3 + 2] = origin.z;
      colors[index * 3] = particleColor.r * brightness;
      colors[index * 3 + 1] = particleColor.g * brightness;
      colors[index * 3 + 2] = particleColor.b * brightness;
      seeds.push({
        phase,
        speed: 0.72 + Math.random() * 1.25,
        drift: radius * (0.012 + Math.random() * 0.034),
        delay: Math.random() * 0.08,
        trailScale: 0.85 + Math.random() * 0.72,
        normalX: nx,
        normalY: ny,
        normalZ: nz,
        tangentX,
        tangentY,
        tangentZ,
        crossX,
        crossY,
        crossZ,
        floatOut: radius * (0.018 + Math.random() * 0.075),
        cloudOut: radius * (0.04 + Math.random() * 0.18),
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, count);

    const material = new THREE.PointsMaterial({
      size: particleSize,
      map: this.particleTexture,
      transparent: true,
      opacity: particleOpacity,
      alphaTest: 0.02,
      depthWrite: false,
      vertexColors: true,
      blending: particleBlending,
    });

    const points = new THREE.Points(geometry, material);
    this.particleRoot.add(points);

    const trail = hasTrails ? this.createParticleTrail(positions, colors, particleOpacity) : null;
    if (trail) this.particleRoot.add(trail);

    this.blessingParticles = {
      points,
      trail,
      seeds,
      fortune,
      profile,
      origins,
      targets,
      center,
      radius,
      mode: 'gather',
      start: this.clock.getElapsedTime(),
    };
  }

  createParticleTrail(positions, colors, opacity) {
    const count = positions.length / 3;
    const trailPositions = new Float32Array(count * 2 * 3);
    const trailColors = new Float32Array(count * 2 * 3);

    for (let index = 0; index < count; index += 1) {
      const pointOffset = index * 3;
      const lineOffset = index * 6;
      trailPositions[lineOffset] = positions[pointOffset];
      trailPositions[lineOffset + 1] = positions[pointOffset + 1];
      trailPositions[lineOffset + 2] = positions[pointOffset + 2];
      trailPositions[lineOffset + 3] = positions[pointOffset];
      trailPositions[lineOffset + 4] = positions[pointOffset + 1];
      trailPositions[lineOffset + 5] = positions[pointOffset + 2];

      trailColors[lineOffset] = colors[pointOffset];
      trailColors[lineOffset + 1] = colors[pointOffset + 1];
      trailColors[lineOffset + 2] = colors[pointOffset + 2];
      trailColors[lineOffset + 3] = colors[pointOffset] * 0.35;
      trailColors[lineOffset + 4] = colors[pointOffset + 1] * 0.35;
      trailColors[lineOffset + 5] = colors[pointOffset + 2] * 0.35;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    geometry.setDrawRange(0, count * 2);

    const material = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: Math.min(0.46, opacity * 0.62),
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.LineSegments(geometry, material);
  }

  sampleModelSurfacePoints(count) {
    const visibleMeshes = [...this.parts.values()].filter((part) => part.visible && part.geometry);
    const targets = new Float32Array(count * 3);
    const vector = new THREE.Vector3();
    const bounds = new THREE.Box3();
    const meshBounds = new THREE.Box3();
    const weightedMeshes = [];
    let totalWeight = 0;

    if (visibleMeshes.length === 0) {
      return {
        targets,
        center: new THREE.Vector3(),
        radius: 1,
      };
    }

    this.modelRoot.updateWorldMatrix(true, true);
    for (const mesh of visibleMeshes) {
      bounds.union(meshBounds.setFromObject(mesh));
      const weight = PART_PARTICLE_WEIGHTS[mesh.name] ?? 1;
      if (weight <= 0) continue;
      totalWeight += weight;
      weightedMeshes.push({ mesh, totalWeight });
    }

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 1);

    for (let index = 0; index < count; index += 1) {
      const pick = Math.random() * totalWeight;
      const mesh = weightedMeshes.find((item) => pick <= item.totalWeight)?.mesh
        ?? weightedMeshes[weightedMeshes.length - 1].mesh;
      const positions = mesh.geometry.attributes.position;
      const vertexIndex = Math.floor(Math.random() * positions.count);

      vector.fromBufferAttribute(positions, vertexIndex);
      mesh.localToWorld(vector);

      targets[index * 3] = vector.x;
      targets[index * 3 + 1] = vector.y;
      targets[index * 3 + 2] = vector.z;
    }

    return {
      targets,
      center,
      radius,
    };
  }

  startAbsorbFortune() {
    if (!this.blessingParticles) {
      this.createBlessingParticles();
    }

    const positions = this.blessingParticles.points.geometry.attributes.position.array;
    const origins = new Float32Array(positions);
    const orbs = new Float32Array(positions.length);
    const targets = new Float32Array(positions.length);
    const seeds = [];
    const { center, radius } = this.blessingParticles;
    this.blessingParticles.points.geometry.setDrawRange(0, positions.length / 3);
    if (this.blessingParticles.trail) {
      this.blessingParticles.trail.geometry.setDrawRange(0, (positions.length / 3) * 2);
    }

    for (let index = 0; index < positions.length / 3; index += 1) {
      const originX = origins[index * 3];
      const originY = origins[index * 3 + 1];
      const originZ = origins[index * 3 + 2];
      const angle = index * 2.399963 + Math.random() * 0.55;
      const vertical = 0.18 + Math.random() * 0.58;
      const orbRadius = radius * (0.025 + Math.random() * 0.065);
      const orbVertical = (Math.random() - 0.5) * radius * 0.055;
      const orbCenterY = center.y + radius * 0.08;
      const direction = new THREE.Vector3(
        (originX - center.x) * 0.55 + Math.cos(angle) * radius * 0.62,
        (originY - center.y) * 0.22 + vertical * radius,
        (originZ - center.z) * 0.55 + Math.sin(angle) * radius * 0.62,
      ).normalize();
      const distance = radius * (0.62 + Math.random() * 0.62);

      orbs[index * 3] = center.x + Math.cos(angle) * orbRadius;
      orbs[index * 3 + 1] = orbCenterY + orbVertical;
      orbs[index * 3 + 2] = center.z + Math.sin(angle) * orbRadius;
      targets[index * 3] = originX + direction.x * distance;
      targets[index * 3 + 1] = originY + direction.y * distance;
      targets[index * 3 + 2] = originZ + direction.z * distance;
      seeds.push({
        phase: Math.random() * TWO_PI,
        delay: Math.random() * 0.28,
        swirl: (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.16),
        lift: radius * (0.08 + Math.random() * 0.18),
      });
    }

    this.absorbAnimation = {
      start: this.clock.getElapsedTime(),
      duration: (2.4 * ANIMATION_TIME_SCALE) / BLESSING_ABSORB_SPEED_MULTIPLIER,
      origins,
      orbs,
      targets,
      seeds,
    };
  }

  clearBlessingParticles() {
    if (!this.blessingParticles) return;

    this.particleRoot.remove(this.blessingParticles.points);
    this.blessingParticles.points.geometry.dispose();
    this.blessingParticles.points.material.dispose();
    if (this.blessingParticles.trail) {
      this.particleRoot.remove(this.blessingParticles.trail);
      this.blessingParticles.trail.geometry.dispose();
      this.blessingParticles.trail.material.dispose();
    }
    this.blessingParticles = null;
    this.particleRoot.position.set(0, 0, 0);
    this.blessingFollowTarget.set(0, 0, 0);
    this.blessingFollowLastSeenAt = -Infinity;
  }

  captureMaterialStates() {
    this.materialStates.clear();

    for (const part of this.parts.values()) {
      const materials = Array.isArray(part.material) ? part.material : [part.material];

      for (const material of materials) {
        if (!material || this.materialStates.has(material)) continue;

        this.materialStates.set(material, {
          transparent: material.transparent,
          opacity: material.opacity,
          depthWrite: material.depthWrite,
        });
      }
    }
  }

  setModelEthereal(enabled) {
    for (const [material, original] of this.materialStates) {
      if (enabled) {
        material.transparent = true;
        material.opacity = 0;
        material.depthWrite = false;
      } else {
        material.transparent = original.transparent;
        material.opacity = original.opacity;
        material.depthWrite = original.depthWrite;
      }

      material.needsUpdate = true;
    }
  }

  getState() {
    return {
      index: this.stepIndex,
      step: EXPERIENCE_STEPS[this.stepIndex],
      steps: EXPERIENCE_STEPS,
      fortunes: FORTUNES,
      selectedFortune: this.selectedFortune,
      interactionLocked: this.isInteractionLocked(),
      report: this.getReport(),
    };
  }

  isInteractionLocked() {
    if (this.showcaseSpin || this.gestureSettle || this.absorbAnimation || this.activeTransitions.size > 0) return true;

    const step = EXPERIENCE_STEPS[this.stepIndex];
    if (step?.id === 'fortune-shell' && this.blessingParticles) {
      const gatherTime = this.clock.getElapsedTime() - this.blessingParticles.start;
      return gatherTime < POINT_CLOUD_GATHER_DURATION + POINT_CLOUD_STAGGER_DURATION;
    }

    return false;
  }

  emitInteractionStateIfChanged(force = false) {
    const interactionLocked = this.isInteractionLocked();
    if (!force && interactionLocked === this.lastInteractionLocked) return;

    this.lastInteractionLocked = interactionLocked;
    this.dispatchEvent(new CustomEvent('interactionchange', {
      detail: { interactionLocked, state: this.getState() },
    }));
  }

  getReport() {
    const found = [...this.parts.keys()].sort();
    const missing = Object.values(this.partGroups)
      .flat()
      .filter((name) => !this.parts.has(name));

    return { found, missing, groups: this.partGroups };
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const elapsed = this.clock.getElapsedTime();
    const step = EXPERIENCE_STEPS[this.stepIndex];
    this.updateModelRotation(elapsed, step);
    this.updateBlessingHandFollow(step);
    this.updateTransitions(elapsed);
    this.updateGesturePreview(step);
    this.updateGestureSettle(elapsed, step);
    this.updateBlessingParticles(elapsed);
    this.updateAbsorbAnimation(elapsed);
    this.emitInteractionStateIfChanged();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  updateBlessingParticles(elapsed) {
    if (!this.blessingParticles || this.absorbAnimation || this.blessingParticles.mode === 'dissolve') return;

    const { points, trail, seeds, origins, targets, start, profile } = this.blessingParticles;
    const positions = points.geometry.attributes.position.array;
    const trailPositions = trail?.geometry.attributes.position.array;
    const time = elapsed - start;
    points.geometry.setDrawRange(0, seeds.length);
    if (trail) trail.geometry.setDrawRange(0, seeds.length * 2);

    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      const progress = THREE.MathUtils.clamp(
        (time - seed.delay) / POINT_CLOUD_GATHER_DURATION,
        0,
        1,
      );
      const settle = progress * progress * (3 - 2 * progress);
      const looseness = 1 - settle;
      const pulse = Math.sin(time * seed.speed + seed.phase);
      const sidePulse = Math.cos(time * seed.speed * 0.73 + seed.phase * 1.41);
      const cloudPulse = Math.sin(time * 0.64 + seed.phase * 0.47);
      const originX = origins[index * 3];
      const originY = origins[index * 3 + 1];
      const originZ = origins[index * 3 + 2];
      const targetX = targets[index * 3];
      const targetY = targets[index * 3 + 1];
      const targetZ = targets[index * 3 + 2];

      const previousX = positions[index * 3];
      const previousY = positions[index * 3 + 1];
      const previousZ = positions[index * 3 + 2];
      const baseX = THREE.MathUtils.lerp(originX, targetX, settle);
      const baseY = THREE.MathUtils.lerp(originY, targetY, settle);
      const baseZ = THREE.MathUtils.lerp(originZ, targetZ, settle);
      const surfaceShimmer = seed.floatOut * 0.06 * Math.sin(time * 1.8 + seed.phase);
      const outward = (seed.floatOut * pulse + seed.cloudOut * cloudPulse) * looseness + surfaceShimmer * settle;
      const side = seed.drift * sidePulse * looseness;
      const cross = seed.drift * Math.sin(time * seed.speed * 1.17 + seed.phase * 0.83) * looseness;
      const nextX = baseX
        + seed.normalX * outward
        + seed.tangentX * side
        + seed.crossX * cross;
      const nextY = baseY
        + seed.normalY * outward
        + seed.tangentY * side
        + seed.crossY * cross;
      const nextZ = baseZ
        + seed.normalZ * outward
        + seed.tangentZ * side
        + seed.crossZ * cross;

      positions[index * 3] = nextX;
      positions[index * 3 + 1] = nextY;
      positions[index * 3 + 2] = nextZ;

      if (trailPositions) {
        const dx = nextX - previousX;
        const dy = nextY - previousY;
        const dz = nextZ - previousZ;
        const length = Math.hypot(dx, dy, dz) || 1;
        const trailLength = profile.trailLength * seed.trailScale * (0.6 + Math.sin(progress * Math.PI) * 0.85);
        const lineOffset = index * 6;

        trailPositions[lineOffset] = nextX;
        trailPositions[lineOffset + 1] = nextY;
        trailPositions[lineOffset + 2] = nextZ;
        trailPositions[lineOffset + 3] = nextX - (dx / length) * trailLength;
        trailPositions[lineOffset + 4] = nextY - (dy / length) * trailLength;
        trailPositions[lineOffset + 5] = nextZ - (dz / length) * trailLength;
      }
    }

    points.material.opacity = THREE.MathUtils.lerp(0.24, profile.opacity, Math.min(1, time / 0.9));
    points.rotation.y = Math.sin(time * 0.42) * profile.groupSway;
    points.position.y = Math.sin(time * 0.8) * profile.groupFloat;
    if (trail) {
      const trailEnter = Math.min(1, time / 0.55);
      const trailExit = 1 - THREE.MathUtils.clamp(
        (time - POINT_CLOUD_GATHER_DURATION - POINT_CLOUD_STAGGER_DURATION) / 1.05,
        0,
        1,
      );
      trail.material.opacity = THREE.MathUtils.lerp(
        0.14,
        Math.min(0.58, profile.opacity * 0.62),
        trailEnter,
      ) * trailExit;
      trail.rotation.copy(points.rotation);
      trail.position.copy(points.position);
      trail.geometry.attributes.position.needsUpdate = true;
    }
    points.geometry.attributes.position.needsUpdate = true;
  }

  updateAbsorbAnimation(elapsed) {
    if (!this.absorbAnimation || !this.blessingParticles) return;

    const { points, trail } = this.blessingParticles;
    const positions = points.geometry.attributes.position.array;
    const trailPositions = trail?.geometry.attributes.position.array;
    const progress = THREE.MathUtils.clamp(
      (elapsed - this.absorbAnimation.start) / this.absorbAnimation.duration,
      0,
      1,
    );
    const collapseProgress = THREE.MathUtils.clamp(progress / 0.42, 0, 1);
    const burstProgress = THREE.MathUtils.clamp((progress - 0.38) / 0.62, 0, 1);
    const collapseEase = collapseProgress * collapseProgress * (3 - 2 * collapseProgress);
    const burstEase = 1 - Math.pow(1 - burstProgress, 3);

    for (let index = 0; index < positions.length / 3; index += 1) {
      const seed = this.absorbAnimation.seeds[index];
      const localBurst = THREE.MathUtils.clamp((burstProgress - seed.delay) / (1 - seed.delay), 0, 1);
      const localBurstEase = 1 - Math.pow(1 - localBurst, 3);
      const bloom = Math.sin(localBurst * Math.PI);
      const originX = this.absorbAnimation.origins[index * 3];
      const originY = this.absorbAnimation.origins[index * 3 + 1];
      const originZ = this.absorbAnimation.origins[index * 3 + 2];
      const orbX = this.absorbAnimation.orbs[index * 3];
      const orbY = this.absorbAnimation.orbs[index * 3 + 1];
      const orbZ = this.absorbAnimation.orbs[index * 3 + 2];
      const targetX = this.absorbAnimation.targets[index * 3];
      const targetY = this.absorbAnimation.targets[index * 3 + 1];
      const targetZ = this.absorbAnimation.targets[index * 3 + 2];
      const angle = seed.phase + burstEase * Math.PI * 1.25;
      const swirlX = Math.cos(angle) * seed.swirl * bloom;
      const swirlZ = Math.sin(angle) * seed.swirl * bloom;

      const collapseX = THREE.MathUtils.lerp(originX, orbX, collapseEase);
      const collapseY = THREE.MathUtils.lerp(originY, orbY, collapseEase);
      const collapseZ = THREE.MathUtils.lerp(originZ, orbZ, collapseEase);
      const nextX = THREE.MathUtils.lerp(collapseX, targetX, localBurstEase) + swirlX;
      const nextY = THREE.MathUtils.lerp(collapseY, targetY, localBurstEase) + seed.lift * bloom;
      const nextZ = THREE.MathUtils.lerp(collapseZ, targetZ, localBurstEase) + swirlZ;

      positions[index * 3] = nextX;
      positions[index * 3 + 1] = nextY;
      positions[index * 3 + 2] = nextZ;

      if (trailPositions) {
        const tailProgress = Math.max(0, localBurstEase - 0.08);
        const tailX = THREE.MathUtils.lerp(collapseX, targetX, tailProgress);
        const tailY = THREE.MathUtils.lerp(collapseY, targetY, tailProgress);
        const tailZ = THREE.MathUtils.lerp(collapseZ, targetZ, tailProgress);
        const lineOffset = index * 6;

        trailPositions[lineOffset] = nextX;
        trailPositions[lineOffset + 1] = nextY;
        trailPositions[lineOffset + 2] = nextZ;
        trailPositions[lineOffset + 3] = tailX;
        trailPositions[lineOffset + 4] = tailY;
        trailPositions[lineOffset + 5] = tailZ;
      }
    }

    points.material.opacity = 0.82 * (1 - Math.max(0, progress - 0.78) / 0.22);
    if (trail) {
      trail.material.opacity = 0.28 * (1 - Math.max(0, progress - 0.48) / 0.52);
      trail.geometry.attributes.position.needsUpdate = true;
    }
    points.geometry.attributes.position.needsUpdate = true;

    if (progress >= 1) {
      this.absorbAnimation = null;
      this.setModelEthereal(false);
      this.clearBlessingParticles();
      this.setStep(this.stepIndex + 1);
    }
  }

  updateModelRotation(elapsed, step) {
    if (this.showcaseSpin) {
      const progress = THREE.MathUtils.clamp(
        (elapsed - this.showcaseSpin.start) / this.showcaseSpin.duration,
        0,
        1,
      );
      const eased = 1 - Math.pow(1 - progress, 3);

      this.modelRoot.rotation.y = THREE.MathUtils.lerp(
        this.showcaseSpin.from,
        this.showcaseSpin.to,
        eased,
      );

      if (progress >= 1) {
        this.modelRoot.rotation.y = MODEL_DISPLAY_ROTATION_Y;
        const shouldAdvance = this.showcaseSpin.advanceOnComplete;
        this.showcaseSpin = null;
        if (shouldAdvance) {
          this.advanceToLiftBlessing();
        }
      }

      return;
    }

    if (step.blessingSpin && this.blessingParticles) {
      const time = elapsed - this.blessingParticles.start;
      const settle = THREE.MathUtils.smoothstep(time, POINT_CLOUD_GATHER_DURATION, POINT_CLOUD_GATHER_DURATION + 1.2);
      const rotation = MODEL_DISPLAY_ROTATION_Y + Math.max(0, time - POINT_CLOUD_GATHER_DURATION) * BLESSING_ROTATION_SPEED * settle;

      this.modelRoot.rotation.y = rotation;
      this.particleRoot.rotation.y = rotation - MODEL_DISPLAY_ROTATION_Y;
      return;
    }

    this.particleRoot.rotation.y = 0;
    this.modelRoot.rotation.y = step.frontView
      ? MODEL_DISPLAY_ROTATION_Y
      : Math.sin(elapsed * 0.25) * 0.04;
  }

  updateTransitions(elapsed) {
    for (const [partName, transition] of this.activeTransitions) {
      const progress = THREE.MathUtils.clamp(
        (elapsed - transition.start) / transition.duration,
        0,
        1,
      );
      const eased = progress * progress * (3 - 2 * progress);

      transition.part.position.lerpVectors(transition.fromPosition, transition.targetPosition, eased);
      transition.part.scale.lerpVectors(transition.fromScale, transition.targetScale, eased);

      if (progress >= 1) {
        transition.part.position.copy(transition.targetPosition);
        transition.part.scale.copy(transition.targetScale);
        this.activeTransitions.delete(partName);
      }
    }
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.controls.dispose();
    this.container.replaceChildren();
  }
}
