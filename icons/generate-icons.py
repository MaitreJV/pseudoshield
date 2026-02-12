"""
generate-icons.py
Génère les icônes pour l'extension Anonymizator
Inspirées du logo hexagonal Lawgitech avec cadenas central
Technique : supersampling 4x puis downscale pour anti-aliasing propre
"""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

# Palette Lawgitech
RED_MAIN = (219, 68, 55)       # #DB4437
RED_DARK = (183, 28, 28)       # #B71C1C
CORAL = (239, 108, 77)         # #EF6C4D
CORAL_LIGHT = (245, 140, 110)  # #F58C6E
WHITE = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

SUPERSAMPLE = 4  # Facteur de supersampling


def hex_points(cx, cy, radius):
    """Retourne les 6 sommets d'un hexagone régulier (pointe en haut)"""
    return [
        (cx + radius * math.cos(math.radians(60 * i - 90)),
         cy + radius * math.sin(math.radians(60 * i - 90)))
        for i in range(6)
    ]


def draw_hex(draw, cx, cy, radius, fill):
    """Dessine un hexagone rempli"""
    draw.polygon(hex_points(cx, cy, radius), fill=fill)


def draw_lock(draw, cx, cy, scale):
    """Dessine un cadenas centré à (cx, cy)"""
    s = scale

    # Anse du cadenas (arc + barres verticales)
    anse_w = int(6 * s)
    anse_h = int(8 * s)
    anse_thick = max(int(2.5 * s), 2)

    # Barres verticales de l'anse
    draw.rectangle(
        [cx - anse_w, cy - anse_h, cx - anse_w + anse_thick, cy],
        fill=WHITE
    )
    draw.rectangle(
        [cx + anse_w - anse_thick, cy - anse_h, cx + anse_w, cy],
        fill=WHITE
    )
    # Arc du haut
    draw.arc(
        [cx - anse_w, cy - anse_h - int(2 * s), cx + anse_w, cy - anse_h + int(6 * s)],
        180, 0, fill=WHITE, width=anse_thick
    )

    # Corps du cadenas
    body_w = int(8 * s)
    body_h = int(9 * s)
    body_r = int(2 * s)
    draw.rounded_rectangle(
        [cx - body_w, cy - int(1 * s), cx + body_w, cy + body_h],
        radius=body_r, fill=WHITE
    )

    # Trou de serrure
    hole_r = int(2 * s)
    hole_cy = cy + int(2.5 * s)
    draw.ellipse(
        [cx - hole_r, hole_cy - hole_r, cx + hole_r, hole_cy + hole_r],
        fill=RED_DARK
    )
    # Petite barre sous le trou
    bar_w = max(int(1 * s), 1)
    draw.rectangle(
        [cx - bar_w, hole_cy, cx + bar_w, hole_cy + int(3 * s)],
        fill=RED_DARK
    )


def draw_circuit_node(draw, px, py, r_outer, r_inner):
    """Dessine un point de circuit (cercle blanc + point coloré)"""
    draw.ellipse([px - r_outer, py - r_outer, px + r_outer, py + r_outer], fill=WHITE)
    draw.ellipse([px - r_inner, py - r_inner, px + r_inner, py + r_inner], fill=RED_MAIN)


def generate_master(target_size):
    """
    Génère l'icône à une taille cible via supersampling.
    Rendu à 4x la taille, puis downscale avec LANCZOS.
    """
    ss = SUPERSAMPLE
    size = target_size * ss
    img = Image.new('RGBA', (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    cx = size // 2
    cy = int(size * 0.47)  # Légèrement au-dessus du centre
    base_r = int(size * 0.42)

    # Couche 1 : Hexagone extérieur rouge
    draw_hex(draw, cx, cy, base_r, RED_MAIN)

    # Couche 2 : Espace blanc (anneau)
    draw_hex(draw, cx, cy, int(base_r * 0.78), WHITE)

    # Couche 3 : Hexagone corail
    draw_hex(draw, cx, cy, int(base_r * 0.72), CORAL)

    # Couche 4 : Espace blanc intérieur
    draw_hex(draw, cx, cy, int(base_r * 0.50), WHITE)

    # Couche 5 : Hexagone rouge foncé central
    draw_hex(draw, cx, cy, int(base_r * 0.44), RED_DARK)

    # Couche 6 : Disque blanc pour le cadenas
    lock_r = int(base_r * 0.28)
    draw.ellipse(
        [cx - lock_r, cy - lock_r, cx + lock_r, cy + lock_r],
        fill=WHITE
    )

    # Cadenas
    lock_scale = base_r / 100.0
    draw_lock(draw, cx, cy - int(2 * lock_scale), lock_scale)

    # Points circuit (seulement pour tailles >= 32)
    if target_size >= 32:
        # Point en haut à droite
        pts = hex_points(cx, cy, int(base_r * 0.78))
        # Entre sommet 0 (haut) et sommet 1 (droite-haut)
        node_x = int((pts[0][0] + pts[1][0]) / 2)
        node_y = int((pts[0][1] + pts[1][1]) / 2)
        r_out = int(4 * lock_scale)
        r_in = int(2 * lock_scale)
        draw_circuit_node(draw, node_x, node_y, r_out, r_in)

        # Ligne de circuit vers le haut
        line_w = max(int(2 * lock_scale), 1)
        draw.line(
            [(node_x, node_y - r_out), (node_x, node_y - r_out - int(10 * lock_scale))],
            fill=WHITE, width=line_w
        )

    if target_size >= 48:
        # Point à droite-milieu
        node2_x = int((pts[1][0] + pts[2][0]) / 2) - int(4 * lock_scale)
        node2_y = int((pts[1][1] + pts[2][1]) / 2)
        draw_circuit_node(draw, node2_x, node2_y, r_out, r_in)

        # Ligne de circuit vers la droite
        draw.line(
            [(node2_x + r_out, node2_y), (node2_x + r_out + int(10 * lock_scale), node2_y)],
            fill=WHITE, width=line_w
        )

    # Downscale avec LANCZOS (anti-aliasing de qualité)
    result = img.resize((target_size, target_size), Image.LANCZOS)
    return result


def main():
    icons_dir = os.path.dirname(os.path.abspath(__file__))

    for target in [16, 32, 48, 128]:
        img = generate_master(target)
        filepath = os.path.join(icons_dir, f'icon-{target}.png')
        img.save(filepath, 'PNG', optimize=True)
        print(f'  icon-{target}.png ({os.path.getsize(filepath)} bytes)')

    print('\nIcones generees avec succes.')


if __name__ == '__main__':
    main()
