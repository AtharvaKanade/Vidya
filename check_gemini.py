"""Quick diagnostic tool to verify if the Gemini API key is valid and working."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Set UTF-8 encoding for standard outputs on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

print("=" * 60)
print(" VIDYA GEMINI API STATUS CHECK")
print("=" * 60)

if not api_key or api_key == "your_gemini_api_key_here" or api_key.startswith("your-"):
    print("[STATUS]: [!] NO API KEY FOUND in .env")
    print("Vidya is currently running in FALLBACK MODE (using calibrated question bank).")
    print("To enable live AI generation, open .env and set GEMINI_API_KEY=AIzaSy...")
    sys.exit(0)

masked_key = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "***"
print(f"[STATUS]: Key detected ({masked_key})")
print("[STATUS]: Sending test prompt to Gemini 2.0 Flash...")

try:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Explain what a neural network perceptron is in exactly one sentence.",
        config=types.GenerateContentConfig(max_output_tokens=60),
    )
    print("\n[SUCCESS]: Gemini API is LIVE and generating content!")
    print(f"[MODEL]: gemini-2.0-flash")
    print(f"[SAMPLE OUTPUT]: \"{response.text.strip()}\"\n")
    print("=" * 60)
except Exception as e:
    print(f"\n[ERROR]: Gemini API call failed: {e}")
    print("Please verify that your key is valid and has Gemini 2.0 Flash access enabled.")
    print("=" * 60)
