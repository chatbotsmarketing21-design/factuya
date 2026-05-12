"""Generate FactuYa! Play Store brand assets using Gemini Nano Banana.

Runs ad-hoc (not part of the deployed app). Output files land in
/app/play_assets/ ready to download.
"""
import asyncio
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

API_KEY = os.getenv("EMERGENT_LLM_KEY")
MODEL = "gemini-3.1-flash-image-preview"
OUT_DIR = Path("/app/play_assets")
OUT_DIR.mkdir(exist_ok=True)


async def generate(label: str, prompt: str) -> None:
    """Generate one image, save to /app/play_assets/{label}.png."""
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"factuya-{label}",
        system_message="You are an expert brand designer creating crisp, modern, professional assets.",
    )
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])

    print(f"[{label}] Generating...")
    msg = UserMessage(text=prompt)
    _text, images = await chat.send_message_multimodal_response(msg)

    if not images:
        print(f"[{label}] ❌ No image returned")
        return

    image_bytes = base64.b64decode(images[0]["data"])
    out_path = OUT_DIR / f"{label}.png"
    with out_path.open("wb") as f:
        f.write(image_bytes)
    size_kb = out_path.stat().st_size / 1024
    print(f"[{label}] ✅ Saved {out_path} ({size_kb:.1f} KB)")


# --- Prompts ----------------------------------------------------------------

ICON_A = """Create a Google Play Store app icon for "FactuYa!" — an invoicing app for entrepreneurs and small businesses in Colombia and Latin America.

Style: flat, modern, bold, professional. Strong silhouette readable at very small sizes.

Subject: a single stylized invoice/receipt document, slightly tilted at 10°, with three short horizontal lines at the top suggesting text rows and one prominent green checkmark in the lower-right corner of the document indicating "paid" or "completed".

Colors:
- Background: SOLID apple green #84cc16 (no gradient, no transparency, no patterns)
- Document: pure white #FFFFFF with thin charcoal black #111111 outline
- Text lines on document: medium gray #9CA3AF
- Checkmark: bold black #111111

Composition: document occupies ~60% of the canvas, centered, with generous padding around it. NO text, NO words, NO letters, NO numbers anywhere in the image. Just the iconic document silhouette.

Format: perfectly square 1024x1024, edge-to-edge solid green background, no padding/safe-area marks, no shadows on the canvas edges (only a subtle drop shadow under the document for depth).
"""

ICON_B = """Create a Google Play Store app icon for "FactuYa!" — a fast invoicing app.

Style: flat, modern, energetic. Strong silhouette readable at small sizes.

Subject: an invoice/receipt document combined with a bold lightning bolt overlay. The lightning bolt cuts diagonally across the lower half of the document representing SPEED and "Ya!" (now/instantly in Spanish).

Colors:
- Background: SOLID apple green #84cc16 (no gradient, no transparency)
- Document: pure white #FFFFFF
- Lightning bolt: bold black #111111 with a tiny white inner highlight
- 3 small lines on document: medium gray #9CA3AF

Composition: document fills ~55% of the canvas, slightly tilted, lightning bolt overlapping the lower-right corner. NO TEXT, NO LETTERS, NO NUMBERS anywhere.

Format: perfectly square 1024x1024, edge-to-edge solid green background.
"""

BANNER = """Create a Google Play Store feature graphic banner for "FactuYa!" — a Colombian invoicing app.

CRITICAL aspect ratio: ultra wide horizontal 1024 pixels wide by 500 pixels tall (about 2:1). The composition MUST be horizontal and landscape.

Layout (LEFT to RIGHT):
- LEFT THIRD: bold headline "FactuYa!" in two pieces — "Factu" in solid charcoal black #111111, then "Ya!" in pure white inside a sharp apple-green #84cc16 rectangle, exactly matching the website logo style. Below the logo, a smaller white tagline reads exactly: "Crea facturas profesionales desde tu celular"
- CENTER: clean modern 3D smartphone mockup, slightly tilted, displaying an invoice on its screen with green accents matching the brand color.
- RIGHT THIRD: a few floating invoice/document illustrations in white and light green, plus a subtle lightning bolt suggesting speed.

Background: deep charcoal black #0F172A on the left half, smoothly transitioning to a darker green #3F6212 on the right half. Subtle abstract dots/grid pattern for texture.

Style: professional SaaS marketing banner, similar quality to Notion / Linear / Stripe ads. Crisp, modern, premium.

DO NOT add any unrelated icons, mascots, hands, or human faces. Keep it clean and minimal.

Output one wide horizontal banner, exactly 1024x500 px aspect ratio (not square).
"""


async def main():
    await generate("icon_option_a_document", ICON_A)
    await generate("icon_option_b_lightning", ICON_B)
    await generate("feature_graphic_banner", BANNER)
    print("\n🎉 Done. Files in /app/play_assets/")


if __name__ == "__main__":
    asyncio.run(main())
