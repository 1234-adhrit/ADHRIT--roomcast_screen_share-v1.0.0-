"""Generate the README illustrations and short Roomcast walkthrough GIF.

Uses Pillow from the bundled Codex Python runtime; Pillow is not an app dependency.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUT = Path(__file__).parent / "images"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1280, 720
BG = "#101116"
PANEL = "#191a22"
LINE = "#30313b"
TEXT = "#f3f2f8"
MUTED = "#9999a6"
PURPLE = "#aa91ff"
MINT = "#9de5c6"


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


F = {
    "small": font(12), "label": font(13, True), "body": font(16),
    "sub": font(18), "heading": font(25, True), "hero": font(58, True),
    "logo": font(23, True), "tiny": font(10), "code": font(18, True),
}


def rounded(draw, box, radius=12, fill=PANEL, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def base():
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.ellipse((-220, 150, 470, 820), fill="#15131e")
    d.ellipse((800, 480, 1460, 1120), fill="#111a18")
    d.rectangle((0, 72, W, 73), fill="#25262f")
    rounded(d, (56, 20, 87, 51), 10, PURPLE)
    d.rectangle((63, 29, 76, 43), outline="#211936", width=2)
    d.polygon([(77, 33), (82, 30), (82, 42), (77, 39)], fill="#211936")
    d.text((99, 21), "roomcast", fill=TEXT, font=F["logo"])
    d.text((194, 21), ".", fill=PURPLE, font=F["logo"])
    d.ellipse((1000, 30, 1008, 38), fill=MINT)
    d.text((1018, 27), "Private rooms  ·  No account needed", fill=MUTED, font=F["small"])
    return im


def draw_home(step=None):
    im = base()
    d = ImageDraw.Draw(im)
    d.text((75, 160), "YOUR SPACE, YOUR SCREEN", fill="#bcaaff", font=F["label"])
    d.text((75, 211), "Good things", fill=TEXT, font=F["hero"])
    d.text((75, 276), "are better", fill=TEXT, font=F["hero"])
    d.text((75, 341), "shared.", fill=PURPLE, font=F["hero"])
    d.multiline_text((78, 431), "Start a room, invite your people with one simple\ncode, and put your screen in the middle of the\nconversation.", fill="#aaaab5", font=F["body"], spacing=8)
    for i, label in enumerate(("Instant rooms", "Up to 8 people", "No downloads")):
        x = 78 + i * 154
        d.ellipse((x, 543, x + 17, 560), outline="#8571bf", width=2)
        d.text((x + 4, 543), "✓", fill="#c5b3ff", font=F["tiny"])
        d.text((x + 24, 544), label, fill="#d5d3df", font=F["tiny"])

    x, y, w, h = 728, 119, 465, 540
    rounded(d, (x, y, x + w, y + h), 18, "#1b1c24", "#363641")
    d.line((x, y + 62, x + w, y + 62), fill=LINE)
    d.text((x + 72, y + 21), "Create a room", fill=TEXT, font=F["label"])
    d.text((x + 297, y + 21), "Join a room", fill="#888894", font=F["label"])
    d.line((x + 40, y + 61, x + 211, y + 61), fill=PURPLE, width=3)
    rounded(d, (x + 29, y + 88, x + 68, y + 127), 11, "#302a40")
    d.text((x + 40, y + 94), "+", fill="#c5b3ff", font=F["heading"])
    d.text((x + 82, y + 89), "Your room starts here", fill=TEXT, font=F["label"])
    d.text((x + 82, y + 112), "Set it up in a few seconds.", fill=MUTED, font=F["tiny"])
    d.text((x + 31, y + 163), "Your name", fill="#d0cfda", font=F["small"])
    rounded(d, (x + 30, y + 185, x + w - 30, y + 229), 8, "#15161c", "#383943")
    d.text((x + 45, y + 198), "Alex", fill=TEXT, font=F["small"])
    d.text((x + 31, y + 250), "How many people, including you?", fill="#d0cfda", font=F["small"])
    rounded(d, (x + 30, y + 273, x + w - 30, y + 317), 8, "#15161c", "#383943")
    d.text((x + 45, y + 286), "4 people", fill=TEXT, font=F["small"])
    d.text((x + w - 57, y + 281), "⌄", fill=MUTED, font=F["sub"])
    rounded(d, (x + 30, y + 346, x + w - 30, y + 393), 8, PURPLE)
    d.text((x + 161, y + 360), "Create your room   →", fill="#211936", font=F["label"])
    d.arc((x + 47, y + 419, x + 58, y + 432), 180, 360, fill="#a4a3af", width=2)
    rounded(d, (x + 45, y + 426, x + 60, y + 438), 2, None, "#a4a3af", 2)
    d.text((x + 68, y + 426), "Your room is private. Only people with your code can join.", fill="#90909c", font=F["tiny"])
    if step:
        step_badge(d, step)
    return im


def step_badge(draw, text):
    rounded(draw, (1020, 88, 1205, 119), 14, "#2a2634", "#484052")
    draw.ellipse((1032, 99, 1040, 107), fill=MINT)
    draw.text((1050, 96), text, fill="#e9e5f5", font=F["tiny"])


def draw_monitor(draw, x, y, w, h, variant, accent):
    rounded(draw, (x, y, x + w, y + h), 7, "#0d0e13", "#383943")
    draw.rectangle((x + 1, y + 1, x + w - 1, y + 18), fill="#20212a")
    for j, col in enumerate(("#ed7f83", "#e9c677", "#8cd6a9")):
        draw.ellipse((x + 8 + j * 12, y + 7, x + 14 + j * 12, y + 13), fill=col)
    if variant == 0:
        for j in range(5):
            draw.line((x + 15, y + 34 + j * 21, x + w - 18 - (j % 2) * 40, y + 34 + j * 21), fill="#57536c" if j % 2 else accent, width=3)
        rounded(draw, (x + 18, y + h - 46, x + 88, y + h - 29), 5, "#3b3153")
    elif variant == 1:
        rounded(draw, (x + 19, y + 37, x + w - 18, y + h - 30), 6, "#202b2a")
        draw.ellipse((x + w // 2 - 22, y + 52, x + w // 2 + 22, y + 96), fill=accent)
        draw.arc((x + w // 2 - 39, y + 82, x + w // 2 + 39, y + 136), 180, 360, fill=accent, width=10)
        draw.line((x + 28, y + h - 45, x + w - 28, y + h - 45), fill="#52665f", width=3)
    else:
        rounded(draw, (x + 22, y + 34, x + w - 22, y + h - 24), 4, "#30344b")
        draw.polygon([(x + 23, y + h - 25), (x + 91, y + 62), (x + 145, y + 98), (x + w - 23, y + 53), (x + w - 23, y + h - 25)], fill="#555276")
        draw.ellipse((x + w - 74, y + 42, x + w - 50, y + 66), fill="#e3c98c")


def draw_room(page=1, step=None, invite=False):
    im = base()
    d = ImageDraw.Draw(im)
    rounded(d, (52, 94, 88, 130), 10, "#1a1b22", "#383943")
    d.text((63, 101), "‹", fill="#c2bfcc", font=F["heading"])
    d.text((103, 96), "LIVE ROOM", fill="#bcaaff", font=F["tiny"])
    d.text((103, 111), "Room with Alex", fill=TEXT, font=F["sub"])
    d.text((798, 101), "ROOM CODE", fill=MUTED, font=F["tiny"])
    rounded(d, (884, 91, 1000, 128), 8, "#1c1c24", "#403d49")
    d.text((898, 100), "MINT24", fill="#d5caff", font=F["label"])
    rounded(d, (1020, 91, 1197, 130), 8, PURPLE)
    d.rectangle((1040, 103, 1054, 114), outline="#211936", width=2)
    d.line((1047, 114, 1047, 119), fill="#211936", width=2)
    d.text((1062, 103), "Share screen", fill="#211936", font=F["small"])

    sx, sy, sw, sh = 52, 151, 844, 493
    rounded(d, (sx, sy, sx + sw, sy + sh), 14, "#16171d", "#30313b")
    rounded(d, (sx + sw - 141, sy + 13, sx + sw - 12, sy + 47), 9, "#191a22", "#393844")
    d.text((sx + sw - 127, sy + 21), "‹     1 / 2     ›", fill="#d8d0f0", font=F["small"])
    data = [("Alex’s screen", 0, PURPLE), ("Jamie’s screen", 1, MINT), ("Your screen", 2, "#f0c291")]
    if invite:
        data = []
    elif page == 2:
        data = [("Morgan’s screen", 1, MINT), ("Riley’s screen", 2, "#f0c291"), ("Taylor’s screen", 0, PURPLE)]
    tile_y = sy + 79
    tile_w, tile_h, gap = 258, 315, 12
    for idx, (name, variant, accent) in enumerate(data):
        tx = sx + 17 + idx * (tile_w + gap)
        rounded(d, (tx, tile_y, tx + tile_w, tile_y + tile_h), 10, "#0b0c10", "#3b3b47")
        draw_monitor(d, tx + 8, tile_y + 9, tile_w - 16, tile_h - 34, variant, accent)
        rounded(d, (tx + 15, tile_y + tile_h - 37, tx + 137, tile_y + tile_h - 12), 6, "#111219")
        d.ellipse((tx + 24, tile_y + tile_h - 28, tx + 31, tile_y + tile_h - 21), fill=MINT)
        d.text((tx + 38, tile_y + tile_h - 33), name, fill="#f1eef6", font=F["tiny"])
    if invite:
        rounded(d, (sx + 184, sy + 126, sx + sw - 184, sy + 342), 18, "#1c1b25", "#3a3547")
        rounded(d, (sx + sw // 2 - 23, sy + 150, sx + sw // 2 + 23, sy + 196), 13, "#302a40")
        d.text((sx + sw // 2 - 12, sy + 155), "+", fill="#c5b3ff", font=F["heading"])
        d.text((sx + 236, sy + 211), "Your room is ready", fill=TEXT, font=F["heading"])
        d.text((sx + 223, sy + 251), "Share this code to invite people", fill=MUTED, font=F["small"])
        rounded(d, (sx + 299, sy + 282, sx + 545, sy + 326), 9, "#24222d", "#494352")
        d.text((sx + 368, sy + 291), "MINT24", fill="#d5caff", font=F["code"])
    d.line((sx, sy + sh - 43, sx + sw, sy + sh - 43), fill="#292a34")
    d.ellipse((sx + 16, sy + sh - 26, sx + 23, sy + sh - 19), fill=MINT)
    d.text((sx + 34, sy + sh - 29), "ROOM IS OPEN" if invite else "3 SCREENS LIVE", fill="#d7d3df", font=F["tiny"])
    d.text((sx + sw - 222, sy + sh - 29), "Waiting for people to join" if invite else "3 participants are sharing", fill="#9695a1", font=F["tiny"])

    px, py, pw = 914, 151, 313
    rounded(d, (px, py, px + pw, py + sh), 13, "#191a22", "#30313b")
    d.text((px + 17, py + 17), "In this room", fill=TEXT, font=F["label"])
    d.text((px + 17, py + 39), "4 of 6 people", fill=MUTED, font=F["tiny"])
    for i, (name, role, color) in enumerate((("Alex", "Room host", PURPLE), ("Jamie", "Guest", MINT), ("Morgan", "Guest", "#efc4ac"), ("You", "You", "#c3a6f0"))):
        yy = py + 72 + i * 42
        rounded(d, (px + 15, yy, px + 44, yy + 29), 9, "#28263a" if i % 2 == 0 else "#254039")
        d.text((px + 25, yy + 7), name[0], fill=color, font=F["small"])
        d.text((px + 55, yy + 2), name, fill="#dedde5", font=F["tiny"])
        d.text((px + 55, yy + 16), role, fill="#888894", font=F["tiny"])
        d.text((px + 250, yy + 8), "● Here", fill="#77cba3", font=F["tiny"])
    chat_y = py + 250
    rounded(d, (px + 12, chat_y, px + pw - 12, py + sh - 13), 9, "#15161c", "#30313b")
    d.text((px + 25, chat_y + 12), "Room chat", fill=TEXT, font=F["label"])
    d.text((px + 25, chat_y + 32), "Messages are shared with everyone", fill=MUTED, font=F["tiny"])
    d.line((px + 13, chat_y + 55, px + pw - 13, chat_y + 55), fill="#292a33")
    rounded(d, (px + 22, chat_y + 67, px + 189, chat_y + 111), 8, "#212129", "#30313a")
    d.text((px + 31, chat_y + 74), "Jamie · 10:42", fill="#a8a6b2", font=F["tiny"])
    d.text((px + 31, chat_y + 91), "Can you see my screen?", fill="#e1dfe8", font=F["tiny"])
    rounded(d, (px + 98, chat_y + 120, px + 280, chat_y + 164), 8, "#30283f", "#4a3c68")
    d.text((px + 110, chat_y + 127), "You · 10:42", fill="#b8adc9", font=F["tiny"])
    d.text((px + 110, chat_y + 144), "Yep, looks great!", fill="#eeeaf5", font=F["tiny"])
    if step:
        step_badge(d, step)
    return im


def make_gif():
    scenes = [
        draw_home("1   CREATE A ROOM"),
        draw_room(1, "2   SHARE THE CODE", invite=True),
        draw_room(1, "3   SHARE TOGETHER"),
        draw_room(2, "4   BROWSE MORE SHARES"),
    ]
    frames, durations = [], []
    for i, current in enumerate(scenes):
        # Hold each step long enough to read, then softly transition to the next.
        frames.extend([current.copy(), current.copy(), current.copy()])
        durations.extend([320, 320, 320])
        if i < len(scenes) - 1:
            following = scenes[i + 1]
            for alpha in (0.25, 0.5, 0.75):
                frames.append(Image.blend(current, following, alpha))
                durations.append(75)
    frames = [frame.resize((960, 540), Image.Resampling.LANCZOS).convert("P", palette=Image.Palette.ADAPTIVE, colors=128) for frame in frames]
    frames[0].save(OUT / "roomcast-walkthrough.gif", save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True, disposal=2)


if __name__ == "__main__":
    draw_home().save(OUT / "create-room.png", optimize=True)
    draw_room(1).save(OUT / "room-sharing.png", optimize=True)
    make_gif()
