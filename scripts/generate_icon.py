import os
from PIL import Image, ImageDraw

def create_pcb_icon():
    os.makedirs("build", exist_ok=True)
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background: Dark industrial burgundy/carbon (#140E10)
    bg_color = (20, 14, 16, 255)
    border_color = (143, 11, 19, 255) # Signal crimson #8F0B13
    
    # Outer plate with rounded corners
    radius = 48
    draw.rounded_rectangle([(8, 8), (size - 8, size - 8)], radius=radius, fill=bg_color, outline=border_color, width=4)

    # Inner circuit tracks / grid pattern
    track_color = (180, 40, 50, 120)
    accent_gold = (235, 155, 30, 240)
    signal_red = (220, 32, 17, 255)

    # PCB Traces
    draw.line([(40, 60), (90, 60), (120, 90), (120, 120)], fill=track_color, width=4)
    draw.line([(216, 60), (166, 60), (136, 90)], fill=track_color, width=4)
    draw.line([(40, 196), (90, 196), (120, 166), (120, 136)], fill=track_color, width=4)
    draw.line([(216, 196), (166, 196), (136, 166)], fill=track_color, width=4)

    # Via pads (small gold circles)
    for pos in [(40, 60), (216, 60), (40, 196), (216, 196), (90, 60), (166, 60), (90, 196), (166, 196)]:
        draw.ellipse([pos[0]-6, pos[1]-6, pos[0]+6, pos[1]+6], fill=accent_gold, outline=border_color, width=2)
        draw.ellipse([pos[0]-2, pos[1]-2, pos[0]+2, pos[1]+2], fill=(20, 14, 16, 255))

    # Center Chip: Square QFP / BGA chip
    chip_box = [(82, 82), (174, 174)]
    draw.rounded_rectangle(chip_box, radius=12, fill=(28, 20, 23, 255), outline=accent_gold, width=3)

    # Chip pins
    pin_color = (200, 170, 100, 255)
    for i in range(5):
        offset = 96 + i * 16
        # Top & bottom pins
        draw.line([(offset, 74), (offset, 82)], fill=pin_color, width=3)
        draw.line([(offset, 174), (offset, 182)], fill=pin_color, width=3)
        # Left & right pins
        draw.line([(74, offset), (82, offset)], fill=pin_color, width=3)
        draw.line([(174, offset), (182, offset)], fill=pin_color, width=3)

    # Center Crosshair / Optical Inspection Reticle
    center = 128
    # Reticle circle
    draw.ellipse([(center - 28, center - 28), (center + 28, center + 28)], outline=signal_red, width=3)
    # Target center dot
    draw.ellipse([(center - 5, center - 5), (center + 5, center + 5)], fill=signal_red)
    # Crosshair ticks
    draw.line([(center, center - 38), (center, center - 16)], fill=signal_red, width=3)
    draw.line([(center, center + 16), (center, center + 38)], fill=signal_red, width=3)
    draw.line([(center - 38, center), (center - 16, center)], fill=signal_red, width=3)
    draw.line([(center + 16, center), (center + 38, center)], fill=signal_red, width=3)

    # Save PNG
    png_path = os.path.join("build", "icon.png")
    img.save(png_path, format="PNG")

    # Save multi-resolution ICO (256, 128, 64, 48, 32, 16)
    ico_path = os.path.join("build", "icon.ico")
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(ico_path, format="ICO", sizes=sizes)
    print(f"Generated {png_path} and {ico_path}")

if __name__ == "__main__":
    create_pcb_icon()
