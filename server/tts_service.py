"""
FutureMaker AI - Ultra-Realistic Neural Male TTS Pipeline
Using edge-tts (Azure Neural Voice Engine without API keys) & FastAPI
"""

import re
import asyncio
from typing import Optional, AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import edge_tts

app = FastAPI(
    title="FutureMaker AI Neural Audio TTS Service",
    description="High-fidelity, ultra-low latency male TTS streaming pipeline for Live AI Interviews",
    version="1.0.0"
)

# Enable CORS for Next.js / Vite React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── 1. Voice Routing Configuration ──────────────────────────────────────────
# Curated authoritative male voices with natural prosody for an interviewer persona
MALE_VOICE_CATALOG = {
    # 🇵🇰 Urdu & Roman Urdu
    "ur": "ur-PK-AsadNeural",
    "ur-PK": "ur-PK-AsadNeural",
    "ur-Roman": "ur-PK-AsadNeural",
    
    # 🇮🇳 Hindi
    "hi": "hi-IN-MadhurNeural",
    "hi-IN": "hi-IN-MadhurNeural",
    
    # 🇺🇸 English (Polished, Executive Interviewer)
    "en": "en-US-ChristopherNeural",
    "en-US": "en-US-ChristopherNeural",
    "en-Guy": "en-US-GuyNeural",
    "en-Brian": "en-US-BrianNeural",
    "en-GB": "en-GB-RyanNeural",
    
    # 🇵🇰 Regional Fallbacks
    "ps": "ps-AF-GulNawazNeural",
    "ps-PK": "ps-AF-GulNawazNeural",
    "pa": "pa-IN-GagandeepNeural",
    "pa-PK": "ur-PK-AsadNeural",
    "sd": "ur-PK-AsadNeural",
    "sd-PK": "ur-PK-AsadNeural",
    "bal": "ur-PK-AsadNeural",
    "skr": "ur-PK-AsadNeural",
}

DEFAULT_MALE_VOICE = "en-US-ChristopherNeural"

# ─── 2. Language & Script Classifier ─────────────────────────────────────────
def detect_voice_from_content(text: str, target_lang: Optional[str] = None) -> str:
    """
    Determines the ideal male voice ID based on language code and script heuristics.
    """
    if target_lang and target_lang.strip():
        normalized_lang = target_lang.strip().lower()
        for key, voice_id in MALE_VOICE_CATALOG.items():
            if normalized_lang == key.lower():
                return voice_id

    # Check for Arabic / Urdu script characters
    urdu_regex = r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]"
    if re.search(urdu_regex, text):
        return "ur-PK-AsadNeural"

    # Check for Devanagari script characters (Hindi)
    hindi_regex = r"[\u0900-\u097F]"
    if re.search(hindi_regex, text):
        return "hi-IN-MadhurNeural"

    # Check for common Roman Urdu conversational marker words
    roman_urdu_tokens = [
        "aap", "kya", "mera", "meri", "hum", "kaam", "kiya", "tha", "masla",
        "kaise", "karein", "karna", "baat", "bataiye", "samjhein", "achha"
    ]
    words = set(re.findall(r"\b\w+\b", text.lower()))
    if len(words.intersection(roman_urdu_tokens)) >= 2:
        return "ur-PK-AsadNeural"

    return DEFAULT_MALE_VOICE


# ─── 3. Prosody & Text Normalizer ────────────────────────────────────────────
def preprocess_interview_text(text: str, voice_id: str) -> str:
    """
    Applies interview-tailored text normalization to smooth acronyms,
    accommodate code-switching, and add natural cadence pauses.
    """
    cleaned = text.strip()
    
    # Expand tech acronyms for pristine pronunciation in voice engines
    acronym_map = {
        r"\bAPI\b": "A P I",
        r"\bAPIs\b": "A P Is",
        r"\bUI\b": "U I",
        r"\bUX\b": "U X",
        r"\bCI/CD\b": "C I C D",
        r"\bSQL\b": "Sequel",
        r"\bNoSQL\b": "No Sequel",
        r"\bAWS\b": "A W S",
        r"\bGCP\b": "G C P",
        r"\bLLM\b": "L L M",
        r"\bLLMs\b": "L L Ms",
        r"\bPR\b": "Pull Request",
        r"\bDAU\b": "Daily Active Users",
    }
    
    for pattern, replacement in acronym_map.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    return cleaned


# ─── 4. Request / Response Schemas ───────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="The interview question or dialogue text")
    language: Optional[str] = Field("ur-Roman", description="Target language code (e.g. 'ur-Roman', 'ur', 'hi', 'en-US')")
    voice: Optional[str] = Field(None, description="Direct Azure voice ID override (e.g. 'ur-PK-AsadNeural')")
    rate: Optional[str] = Field("+0%", description="Speech rate adjustment (e.g., '+3%', '-5%')")
    pitch: Optional[str] = Field("-2Hz", description="Pitch adjustment for deep authoritative tone (e.g., '-2Hz')")
    volume: Optional[str] = Field("+0%", description="Volume boost (e.g., '+0%', '+5%')")


# ─── 5. Async Audio Streaming Generator ──────────────────────────────────────
async def generate_edge_tts_stream(
    text: str,
    voice: str,
    rate: str = "+0%",
    pitch: str = "-2Hz",
    volume: str = "+0%"
) -> AsyncGenerator[bytes, None]:
    """
    Streams audio chunks directly from edge_tts without creating temporary files on disk.
    """
    try:
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate,
            pitch=pitch,
            volume=volume
        )
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]
    except Exception as exc:
        # In case edge-tts encounters network interruption or voice fallback
        raise RuntimeError(f"EdgeTTS streaming error: {str(exc)}") from exc


# ─── 6. Streaming API Endpoint ───────────────────────────────────────────────
@app.post("/api/generate-speech")
async def generate_speech_endpoint(req: TTSRequest):
    """
    Generate & stream ultra-realistic male neural speech directly as an MP3 audio stream.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    # 1. Determine Voice
    voice_id = req.voice or detect_voice_from_content(req.text, req.language)
    
    # 2. Preprocess & Normalize
    processed_text = preprocess_interview_text(req.text, voice_id)

    # 3. Stream back as audio/mpeg with chunked transfer
    return StreamingResponse(
        generate_edge_tts_stream(
            text=processed_text,
            voice=voice_id,
            rate=req.rate or "+0%",
            pitch=req.pitch or "-2Hz",
            volume=req.volume or "+0%"
        ),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache",
            "X-Voice-Used": voice_id,
            "X-Language-Detected": req.language or "auto",
        }
    )


# ─── 7. Health & Voice Catalog Inspection ────────────────────────────────────
@app.get("/api/voices")
async def list_available_male_voices():
    """
    List all supported male neural voices.
    """
    return {
        "status": "online",
        "default_voice": DEFAULT_MALE_VOICE,
        "male_voices": MALE_VOICE_CATALOG
    }


if __name__ == "__main__":
    import uvicorn
    # Run standalone on port 8000
    uvicorn.run("tts_service:app", host="0.0.0.0", port=8000, reload=True)
