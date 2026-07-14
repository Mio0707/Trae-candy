/**
 * 吹糖造物：与具体页面、摄像头和三维模型无关的舞台内容。
 * 前端只需读取这里的步骤和文案，再把识别到的手势交给交互控制器。
 */

export const EXPERIENCE_PHASES = [
  { id: 'base', name: '底座', stepIds: ['base-small'] },
  { id: 'body', name: '身体', stepIds: ['body-block'] },
  { id: 'limbs', name: '四肢', stepIds: ['front-legs', 'back-mustache'] },
  { id: 'head', name: '头部', stepIds: ['head-block', 'head-place'] },
  { id: 'decoration', name: '装饰', stepIds: ['tail', 'ears', 'head-lines', 'ball-form', 'ball-place'] },
  { id: 'blessing', name: '赐福', stepIds: ['complete', 'lift-blessing', 'fortune-shell', 'blessing-complete'] },
];

export const FORTUNES = [
  { id: 'shun', label: '顺', name: '顺遂', color: '#38a848', blessing: '愿你一路顺遂，所行皆有回响。', particleHint: '绿色粒子向上流动。' },
  { id: 'xi', label: '喜', name: '喜乐', color: '#f1bc36', blessing: '愿你常有喜乐，心中自带暖光。', particleHint: '黄色粒子轻快散开。' },
  { id: 'yong', label: '勇', name: '镇护', color: '#1f1916', blessing: '愿你勇气常在，被温柔稳稳守护。', particleHint: '黑金粒子聚拢环绕。' },
  { id: 'wang', label: '旺', name: '兴旺', color: '#d73327', blessing: '愿你元气兴旺，日日都有新生机。', particleHint: '红色粒子围绕圆球旋转。' },
];

export const STAGE_STEPS = [
  {
    id: 'base-small', phaseId: 'base', title: '吹起底座',
    description: '先张开手掌准备，再握拳一次，让红色糖团鼓起并定型成底座。',
    stageHint: '握拳，将底座吹起来', sequenceHint: '张开手掌 → 握紧拳头',
    gesture: { actions: ['fist'], resetMode: 'release-fist', recognitionHint: '先张掌，再握拳吹起底座' },
    knowledge: '天门糖塑通过吹气扩充糖块中空体量，称为“泡活”：既节省糖料，又能形成圆鼓饱满的外形',
    animation: 'base-grow',
  },
  {
    id: 'body-block', phaseId: 'body', title: '出现并放置身体',
    description: '先松开拳头，再次握拳，黑色身体糖块出现并落到底座上。',
    stageHint: '握拳，把身体糖块吹起并安放', sequenceHint: '张开手掌 → 握紧拳头',
    gesture: { actions: ['fist'], resetMode: 'release-fist', recognitionHint: '先松拳，再次握拳放置身体' },
    knowledge: '天门糖塑讲究“吹塑结合”：先吹出中空大体量',
    animation: 'body-appear-and-place',
  },
  {
    id: 'front-legs', phaseId: 'limbs', title: '拉出四肢',
    description: '先合拢拇指和食指，再逐渐张开，让前后脚从黑色身体内部延展出来。',
    stageHint: '张开两指，从身体中拉出四肢', sequenceHint: '两指合拢 → 逐渐张开',
    gesture: { actions: ['thumb-index-spread'], resetMode: 'thumb-index-closed', recognitionHint: '先合拢拇指和食指，再逐渐张开拉出四肢' },
    knowledge: '再用捏、拉、压、贴完成细节',
    animation: 'limbs-stretch',
  },
  {
    id: 'back-mustache', phaseId: 'limbs', title: '贴上背部糖衣',
    description: '先张开拇指和食指，再逐渐并拢，让黄色背部糖衣贴到身体上。',
    stageHint: '并拢两指，把黄色糖衣贴合到身体上', sequenceHint: '两指张开 → 逐渐并拢',
    gesture: { actions: ['thumb-index-close'], resetMode: 'thumb-index-open', recognitionHint: '先张开拇指和食指，再逐渐并拢贴上糖衣' },
    knowledge: '"塑"讲究结构和色彩，把糖料压成糖片，再通过剪、贴组成衣纹和装饰',
    animation: 'back-coat-attach',
  },
  {
    id: 'head-block', phaseId: 'head', title: '出现头部',
    description: '张开手掌，让红色头部糖块在空中逐渐出现。',
    stageHint: '张开手掌，让头部糖料逐渐成形', sequenceHint: '收拢手指 → 张开手掌',
    gesture: { actions: ['open'], resetMode: 'closed-hand', recognitionHint: '先收拢手指，再张掌让头部出现' },
    knowledge: '头部是糖塑最关键的部分，艺人往往先精心构思头部的造型',
    animation: 'head-form',
  },
  {
    id: 'head-place', phaseId: 'head', title: '安放头部',
    description: '先张开手掌准备，再握拳，让头部落到身体前方。',
    stageHint: '握紧拳头，把头部糖块安放到身体上', sequenceHint: '张开手掌 → 握紧拳头',
    gesture: { actions: ['fist'], resetMode: 'release-fist', recognitionHint: '先张掌，再握拳安放头部' },
    knowledge: '天门糖塑重在“传神”：头可以夸张，眼睛和姿态尤其要有精神，让人一眼认出角色的性格',
    animation: 'head-place',
  },
  {
    id: 'tail', phaseId: 'decoration', title: '出现尾巴和耳朵',
    description: '先合拢拇指和食指，再逐渐张开，让尾巴和两个耳朵糖片在空中出现。',
    stageHint: '张开两指，制作尾巴和耳朵糖片', sequenceHint: '两指合拢 → 逐渐张开',
    gesture: { actions: ['thumb-index-spread'], resetMode: 'thumb-index-closed', recognitionHint: '先合拢拇指和食指，再逐渐张开让尾巴和耳朵出现' },
    knowledge: '装饰是糖塑的点睛之笔，尾巴和耳朵能让瑞兽更显灵动',
    animation: 'tail-and-ears-form',
  },
  {
    id: 'ears', phaseId: 'decoration', title: '贴上尾巴和耳朵',
    description: '逐渐并拢拇指和食指，让尾巴和两个耳朵贴到瑞兽上。',
    stageHint: '并拢两指，装上带弹簧的尾巴和耳朵', sequenceHint: '两指张开 → 逐渐并拢',
    gesture: { actions: ['thumb-index-close'], resetMode: 'thumb-index-open', recognitionHint: '逐渐并拢拇指和食指，贴上尾巴和耳朵' },
    knowledge: '在这件真实瑞兽作品中，尾巴和两只耳朵都用小弹簧连接；轻轻一动，糖片便会微微颤动，让瑞兽更有神气',
    animation: 'tail-and-ears-attach',
  },
  {
    id: 'head-lines', phaseId: 'decoration', title: '贴上头部和嘴部糖条',
    description: '先合拢拇指和食指，再逐渐张开，让红绿糖条贴到头部和嘴部。',
    stageHint: '张开两指，搓拉并贴上装饰糖条', sequenceHint: '两指合拢 → 逐渐张开',
    gesture: { actions: ['thumb-index-spread'], resetMode: 'thumb-index-closed', recognitionHint: '先合拢拇指和食指，再逐渐张开贴上糖条' },
    knowledge: '梳齿纹、卷曲线和凸起糖条是常见装饰语言',
    animation: 'head-lines-attach',
  },
  {
    id: 'ball-form', phaseId: 'decoration', title: '出现爪下圆球',
    description: '张开手掌，让圆球糖料在空中逐渐出现。',
    stageHint: '张开手掌，把糖料团成爪下圆球', sequenceHint: '收拢手指 → 张开手掌',
    gesture: { actions: ['open'], resetMode: 'closed-hand', recognitionHint: '先收拢手指，再张掌让圆球出现' },
    knowledge: '圆球象征圆满吉祥，是天门糖塑中常见的吉祥元素',
    animation: 'ball-form',
  },
  {
    id: 'ball-place', phaseId: 'decoration', title: '安放爪下圆球',
    description: '先张开手掌准备，再握拳，让圆球落到瑞兽爪下。',
    stageHint: '握紧拳头，把圆球安放到瑞兽爪下', sequenceHint: '张开手掌 → 握紧拳头',
    gesture: { actions: ['fist'], resetMode: 'release-fist', recognitionHint: '先张掌，再握拳安放圆球' },
    knowledge: '天门糖塑善用圆球、糖条等简单形体组合，以有限糖料塑出丰富层次，这正是艺人的"讨巧"',
    animation: 'ball-place',
  },
  {
    id: 'complete', phaseId: 'blessing', title: '旋转展示',
    description: '瑞兽主体完成，整件作品将自动旋转一圈并进入赐福。',
    stageHint: '', sequenceHint: '',
    gesture: { actions: [], resetMode: null, recognitionHint: '瑞兽正在自动旋转展示' },
    knowledge: '红、绿、黑与糖本色形成天门糖塑明快热烈的民间色彩',
    animation: 'showcase-spin', autoAdvance: true,
  },
  {
    id: 'lift-blessing', phaseId: 'blessing', title: '托起瑞兽',
    description: '先在瑞兽上方张开手掌，再向下移动到瑞兽下方并停留。',
    stageHint: '张掌向下移动，瑞兽给你带来了一份祝福', sequenceHint: '瑞兽上方张掌 → 向下移动并停留',
    gesture: { actions: ['lift'], resetMode: 'lift-ready', recognitionHint: '在瑞兽上方张掌，向下托住后保持片刻' },
    knowledge: '糖塑曾走进庙会、婚庆和寿诞等生活场景',
    animation: 'lift-and-bless',
  },
  {
    id: 'fortune-shell', phaseId: 'blessing', title: '祝福显形',
    description: '等待祝福粒子完整显形，再握拳收拢，把这份祝福带走。',
    stageHint: '握紧拳头，将祝福收下', sequenceHint: '张开手掌 → 握紧拳头',
    gesture: { actions: ['fist'], resetMode: 'release-fist', recognitionHint: '粒子成形后握拳收下祝福' },
    knowledge: '天门糖塑植根江汉平原民间生活，作品常以生动造型承载喜庆、吉祥和守护的愿望',
    animation: 'fortune-particles',
  },
  {
    id: 'blessing-complete', phaseId: 'blessing', title: '祝福完成',
    description: '你的糖塑瑞兽已收到祝福。它带着这份心意，完成了今天的吹糖造物。',
    stageHint: '造物完成，成功制作了天门糖塑！', sequenceHint: '造物完成',
    gesture: { actions: [], resetMode: null, recognitionHint: '造物完成，可定格欣赏成果' },
    knowledge: '天门糖塑是国家级非物质文化遗产代表性项目；本体验用于文化感受，不等同于真实高温制作教学。',
    animation: 'complete',
  },
];

export function getStep(stepId) {
  return STAGE_STEPS.find((step) => step.id === stepId) ?? null;
}

export function getPhaseIndex(stepId) {
  const index = EXPERIENCE_PHASES.findIndex((phase) => phase.stepIds.includes(stepId));
  return index < 0 ? 0 : index;
}

export function getActionAliases(actionType) {
  const aliases = {
    'open-down': ['open-down', 'down', 'open'],
    'open-hold': ['open-hold', 'hold', 'open'],
    'pinch-down': ['pinch-down', 'pinch-place', 'down', 'pinch'],
    'pinch-place': ['pinch-place', 'down', 'pinch'],
    'one-finger-swipe': ['one-finger-swipe', 'swipe'],
    'two-hands-close': ['two-hands-close', 'open', 'open-hold'],
    'two-hands-apart': ['two-hands-apart'],
    circle: ['circle', 'one-finger-swipe', 'swipe'],
    lift: ['lift'],
  };
  return aliases[actionType] ?? [actionType];
}

export function matchesStepGesture(step, actionType) {
  if (!step?.gesture.actions.length) return false;
  const aliases = getActionAliases(actionType);
  return step.gesture.actions.some((expected) => aliases.includes(expected));
}
