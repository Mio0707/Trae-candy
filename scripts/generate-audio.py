import os
import subprocess
import shutil

OUTPUT_DIR = "../assets/audio"

AUDIO_TEXTS = [
    {"id": "landing-intro", "text": "天门糖塑距今已有约1400年历史，曾被列为湖北最美非物质文化遗产。通过手势互动，模拟吹、捏、拉、贴等真实工艺，制作一只属于自己的糖塑瑞兽。"},
    {"id": "base-small", "text": "天门糖塑用吹制扩充中空体量，称为泡活：既节省糖料，又能形成圆鼓饱满的外形。"},
    {"id": "body-block", "text": "天门糖塑讲究吹塑结合：先吹出中空大体量，再用捏、拉、压、贴完成细节，省糖却显得饱满。"},
    {"id": "front-legs", "text": "主体之外的枝节和细部由塑制丰富，这种处理称为头子活；四肢抓住动势和轮廓就能显出精神。"},
    {"id": "back-mustache", "text": "天门糖塑常把糖料压成糖片，再通过剪、贴组成衣纹和装饰；薄处微微透亮，厚处色泽更饱满，贴合处还会保留自然接缝。"},
    {"id": "head-block", "text": "天门糖塑重在传神：头可以夸张，眼睛和姿态尤其要有精神，让人一眼认出角色的性格。"},
    {"id": "tail", "text": "在这件真实瑞兽作品中，尾巴和两只耳朵都用小弹簧连接；轻轻一动，糖片便会微微颤动，让瑞兽更有神气。"},
    {"id": "head-lines", "text": "梳齿纹、卷曲线和凸起糖条是常见装饰语言；红、绿、黑与糖本色形成明快热烈的民间色彩。"},
    {"id": "ball-form", "text": "天门糖塑善用圆球、糖片、糖条等简单形体组合，以有限糖料塑出丰富层次，这正是艺人的讨巧。"},
    {"id": "ball-place", "text": "糖塑曾走进庙会、婚庆和寿诞等生活场景。瑞兽等题材寄托着吉祥、守护和圆满。"},
    {"id": "lift-blessing", "text": "天门糖塑植根江汉平原民间生活，作品常以生动造型承载喜庆、吉祥和守护的愿望。"},
    {"id": "blessing-complete", "text": "天门糖塑是国家级非物质文化遗产代表性项目；本体验用于文化感受，不等同于真实高温制作教学。"},
]

ESPEAK_SPEED = 150

def text_to_mp3(text, output_path):
    """使用 espeak-ng 生成 wav，再用 ffmpeg 转 mp3"""
    tmp_wav = output_path.replace(".mp3", ".tmp.wav")

    # 1. 用 espeak-ng 生成 wav
    result = subprocess.run(
        ["espeak-ng", "-v", "zh", "-s", str(ESPEAK_SPEED), text, "-w", tmp_wav],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"espeak-ng 失败: {result.stderr}")

    # 2. 用 ffmpeg 转 mp3
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", tmp_wav, "-codec:a", "libmp3lame", "-qscale:a", "4", output_path],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg 失败: {result.stderr}")

    # 3. 清理临时文件
    os.remove(tmp_wav)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 清理旧的空文件
    for f in os.listdir(OUTPUT_DIR):
        path = os.path.join(OUTPUT_DIR, f)
        if os.path.getsize(path) == 0:
            os.remove(path)
            print(f"  清理空文件: {f}")

    print(f"🎤 开始生成音频 (espeak-ng + ffmpeg)")
    print("-" * 50)

    success = 0
    for item in AUDIO_TEXTS:
        output_path = os.path.join(OUTPUT_DIR, f"{item['id']}.mp3")
        try:
            text_to_mp3(item["text"], output_path)
            size = os.path.getsize(output_path)
            print(f"✓ {item['id']}.mp3  ({size // 1024}KB)")
            success += 1
        except Exception as e:
            print(f"✗ {item['id']} - {e}")

    print("-" * 50)
    print(f"🎉 完成！成功 {success}/{len(AUDIO_TEXTS)} 个音频文件")

if __name__ == "__main__":
    main()
