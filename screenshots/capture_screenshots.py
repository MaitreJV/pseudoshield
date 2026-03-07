"""
Script de capture des 4 screenshots PseudoShield en 1280x800 JPEG.
Necessite: pip install playwright && python -m playwright install chromium
"""
import subprocess
import time
import threading
import http.server
import os

# Configuration
SCREENSHOTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCREENSHOTS_DIR)
OUTPUT_DIR = os.path.join(PROJECT_DIR, "screenshots", "output")
PORT = 8766
WIDTH = 1280
HEIGHT = 800

# Pages a capturer
PAGES = [
    ("01-avant-apres.html", "pseudoshield-01-avant-apres.jpg"),
    ("02-table-rgpd.html", "pseudoshield-02-table-rgpd.jpg"),
    ("03-journal-rgpd.html", "pseudoshield-03-journal-rgpd.jpg"),
    ("04-plateformes.html", "pseudoshield-04-plateformes.jpg"),
]


def start_server():
    """Demarre un serveur HTTP local pour servir les fichiers."""
    os.chdir(SCREENSHOTS_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(("", PORT), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def capture_all():
    """Capture les 4 pages en JPEG 1280x800 via Playwright."""
    from playwright.sync_api import sync_playwright

    # Creer le dossier de sortie
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Demarrer le serveur
    httpd = start_server()
    time.sleep(1)
    print(f"Serveur HTTP demarre sur le port {PORT}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT})

        for html_file, output_name in PAGES:
            url = f"http://localhost:{PORT}/{html_file}"
            output_path = os.path.join(OUTPUT_DIR, output_name)

            print(f"Capture de {html_file}...")
            page.goto(url)
            page.wait_for_timeout(1000)

            # Capture en JPEG, qualite 95
            page.screenshot(
                path=output_path,
                type="jpeg",
                quality=95,
                full_page=False,  # Viewport uniquement (1280x800)
            )
            print(f"  -> {output_path} ({WIDTH}x{HEIGHT})")

        browser.close()

    httpd.shutdown()
    print(f"\n4/4 screenshots sauvegardes dans {OUTPUT_DIR}")


if __name__ == "__main__":
    capture_all()
