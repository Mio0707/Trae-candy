"""
edge-tts 音频生成脚本（需要在有网络的环境运行）

使用方法：
1. 安装依赖：pip install edge-tts
2. 运行脚本：python generate-audio-edge-tts.py

生成的音频会保存到 ../assets/audio/ 目录
"""

import asyncio
import edge_tts
import os

OUTPUT_DIR = "../public/assets/audio"

# 使用中文女声，更自然
VOICE = "zh-CN-XiaoxiaoNeural"

AUDIO_TEXTS = [
    {"id": "landing-intro", "text": "天门糖塑距今已有约1400年历史，曾被列为湖北最美非物质文化遗产。通过手势互动，模拟吹、捏、拉、贴等真实工艺，制作一只属于自己的糖塑瑞兽。"},
    {"id": "base-small", "text": "天门糖塑通过吹气扩充糖块中空体量，称为泡活：既节省糖料，又能形成圆鼓饱满的外形"},
    {"id": "body-block", "text": "天门糖塑讲究吹塑结合：先吹出中空大体量"},
    {"id": "front-legs", "text": "再用捏、拉、压、贴完成细节"},
    {"id": "back-mustache", "text": "塑讲究结构和色彩，把糖料压成糖片，再通过剪、贴组成衣纹和装饰"},
    {"id": "head-block", "text": "头部是糖塑最关键的部分，艺人往往先精心构思头部的造型"},
    {"id": "head-place", "text": "天门糖塑重在传神：头可以夸张，眼睛和姿态尤其要有精神，让人一眼认出角色的性格"},
    {"id": "tail", "text": "装饰是糖塑的点睛之笔，尾巴和耳朵能让瑞兽更显灵动"},
    {"id": "ears", "text": "在这件真实瑞兽作品中，尾巴和两只耳朵都用小弹簧连接；轻轻一动，糖片便会微微颤动，让瑞兽更有神气"},
    {"id": "head-lines", "text": "梳齿纹、卷曲线和凸起糖条是常见装饰语言"},
    {"id": "ball-form", "text": "圆球象征圆满吉祥，是天门糖塑中常见的吉祥元素"},
    {"id": "ball-place", "text": "天门糖塑善用圆球、糖条等简单形体组合，以有限糖料塑出丰富层次，这正是艺人的讨巧"},
    {"id": "complete", "text": "红、绿、黑与糖本色形成天门糖塑明快热烈的民间色彩"},
    {"id": "lift-blessing", "text": "糖塑曾走进庙会、婚庆和寿诞等生活场景"},
    {"id": "fortune-shell", "text": "天门糖塑植根江汉平原民间生活，作品常以生动造型承载喜庆、吉祥和守护的愿望"},
    {"id": "blessing-complete", "text": "天门糖塑是国家级非物质文化遗产代表性项目；本体验用于文化感受，不等同于真实高温制作教学。"},
]

async def generate_audio(text: str, output_path: str):
    """使用 edge-tts 生成音频"""
    communicate = edge_tts.Communicate(
        text, 
        VOICE,
        proxy='http://127.0.0.1:18080',
        connect_timeout=30,
        receive_timeout=120
    )
    await communicate.save(output_path)

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"🎤 开始生成音频 (edge-tts, 语音: {VOICE})")
    print("-" * 50)

    for item in AUDIO_TEXTS:
        output_path = os.path.join(OUTPUT_DIR, f"{item['id']}.mp3")
        try:
            await generate_audio(item["text"], output_path)
            size = os.path.getsize(output_path)
            print(f"✓ {item['id']}.mp3  ({size // 1024}KB)")
        except Exception as e:
            print(f"✗ {item['id']} - {e}")

    print("-" * 50)
    print(f"🎉 完成！共生成 {len(AUDIO_TEXTS)} 个音频文件")

if __name__ == "__main__":
    asyncio.run(main())