#!/usr/bin/env python3
"""
Updates presentation.html with original authentic application screenshots,
removes all Unsplash stock placeholder images, embeds video modal for talking/idle MP4,
adds an interactive Lightbox for high-resolution zoom, adds an overview grid drawer,
and fixes the slide counter.
"""
import re
import os

def update_html():
    with open('presentation.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Update CSS: Add equalizer, zoom cursor, and modal styles
    extra_css = """
/* ENHANCED SCREENSHOT & MODAL STYLES */
.imf {
  cursor: pointer;
  transition: transform .25s cubic-bezier(.16,1,.3,1), border-color .25s ease, box-shadow .25s ease;
}
.imf:hover {
  transform: translateY(-3px) scale(1.01);
  border-color: rgba(255, 70, 38, .6) !important;
  box-shadow: 0 10px 28px rgba(255, 70, 38, .22), 0 0 1px rgba(255,255,255,.5);
}
.imf::before {
  content: '🔍 CLICK TO EXPAND';
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(5, 7, 15, .82);
  border: 1px solid rgba(255, 255, 255, .2);
  color: var(--t1);
  font-size: .52rem;
  font-family: var(--fm);
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity .2s;
  pointer-events: none;
  z-index: 10;
  backdrop-filter: blur(6px);
}
.imf:hover::before {
  opacity: 1;
}
@keyframes eq {
  0% { height: 4px; }
  100% { height: 18px; }
}
.live-pill {
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(10, 16, 28, .88);
  border: 1px solid rgba(255, 70, 38, .45);
  padding: 3px 8px;
  border-radius: 12px;
  font-size: .56rem;
  font-weight: 700;
  color: var(--ember);
  backdrop-filter: blur(8px);
}
.live-pill.green {
  border-color: rgba(16, 185, 129, .45);
  color: var(--green);
}
.live-pill.cyan {
  border-color: rgba(56, 189, 248, .45);
  color: var(--cyan);
}
.live-pill.orange {
  border-color: rgba(255, 106, 0, .45);
  color: var(--ember2);
}
.tb-btn {
  background: rgba(255, 255, 255, .06);
  border: 1px solid var(--border);
  color: var(--t2);
  font-size: .62rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all .2s;
}
.tb-btn:hover {
  background: rgba(255, 70, 38, .18);
  border-color: var(--ember);
  color: #fff;
}
.tb-btn.active {
  background: var(--ember);
  border-color: var(--ember);
  color: #fff;
  box-shadow: 0 0 10px rgba(255, 70, 38, .6);
}
"""
    if "/* ENHANCED SCREENSHOT & MODAL STYLES */" not in html:
        html = html.replace("</style>", extra_css + "\n</style>")

    # 2. Update top bar navigation to include Grid, Auto-play, and Fullscreen buttons
    old_tb = '<div id="ctr" style="font-family:var(--fm);font-size:.68rem;color:var(--t4)">'
    new_tb = """<div style="display:flex;align-items:center;gap:8px">
      <button class="tb-btn" onclick="toggleOverview()" title="Slide Overview (G)">▦ Grid</button>
      <button class="tb-btn" id="btn-auto" onclick="toggleAutoplay()" title="Auto-Play Slides (A)">▶ Auto</button>
      <button class="tb-btn" onclick="toggleFullscreen()" title="Fullscreen Mode (F)">⛶ Full</button>
      <div id="ctr" style="font-family:var(--fm);font-size:.68rem;color:var(--t4)">"""
    if 'class="tb-btn"' not in html:
        html = html.replace('<div id="ctr">', new_tb, 1)

    # 3. Slide 1 (Cover): Replace Unsplash image with 3D avatar
    s1_old = """    <div class="imf gc" style="height:258px">
      <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=920&q=85&fit=crop&crop=faces" alt="Professional AI interview coaching" loading="lazy"/>
      <div class="imc"><div class="imcl">Live Interview Mode</div><div class="imct">Real adaptive questioning · zero scripts · Gemini 2.5</div></div>
    </div>"""
    s1_new = """    <div class="imf gc" style="height:258px" onclick="openLightbox('client/public/interviewer-avatar.jpg', 'Aiden · AI Principal Engineering Interviewer', 'Authentic 3D cyber avatar powered by Google Gemini Multimodal Live 2.5 with natural Pakistani-accented English and Roman Urdu.')">
      <div class="live-pill"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--ember)"></span>AIDEN · 3D NEURAL AVATAR</div>
      <img src="client/public/interviewer-avatar.jpg" alt="Aiden - AI Principal Engineering Interviewer" loading="lazy" style="object-position:center top"/>
      <div class="imc"><div class="imcl">Live Interviewer Persona</div><div class="imct">Aiden (Puck Neural Voice) · 3D Cyber Avatar · Gemini Live 2.5</div></div>
    </div>"""
    html = html.replace(s1_old, s1_new)

    # 4. Slide 5 (Voice AI Engine): Replace Unsplash image with 3D Avatar + Equalizer + Video Button
    s5_old = """      <div class="imf gc" style="height:175px;margin-bottom:12px">
        <img src="https://images.unsplash.com/photo-1589254065878-42c9da997008?w=920&q=80&fit=crop" alt="Voice AI technology" loading="lazy"/>
        <div class="imc"><div class="imcl">Live Voice Persona</div><div class="imct">Aiden · AI Principal Engineering Interviewer · Puck Neural Voice</div></div>
      </div>"""
    s5_new = """      <div class="imf gc" style="height:175px;margin-bottom:12px" onclick="openLightbox('client/public/interviewer-avatar.jpg', 'Aiden · Puck Neural Voice AI Engine', 'Sub-second bidirectional voice simulation via WebSocket & Gemini Live 2.5 with 24kHz PCM stream and soft gain ramp interruption.')">
        <div class="live-pill cyan"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--cyan)"></span>GEMINI LIVE 2.5 VOICE</div>
        <div style="position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:3px;z-index:2;background:rgba(5,7,15,.78);padding:3px 7px;border-radius:6px;border:1px solid rgba(56,189,248,.3)">
          <span style="display:inline-block;width:3px;height:12px;background:var(--cyan);animation:eq 0.8s ease-in-out infinite alternate"></span>
          <span style="display:inline-block;width:3px;height:16px;background:var(--ember);animation:eq 0.6s ease-in-out infinite alternate 0.2s"></span>
          <span style="display:inline-block;width:3px;height:8px;background:var(--green);animation:eq 0.9s ease-in-out infinite alternate 0.4s"></span>
          <span style="display:inline-block;width:3px;height:14px;background:var(--violet2);animation:eq 0.7s ease-in-out infinite alternate 0.1s"></span>
          <span style="font-size:.55rem;font-family:var(--fm);color:var(--cyan);margin-left:4px">24kHz PCM</span>
        </div>
        <img src="client/public/interviewer-avatar.jpg" alt="Aiden Voice AI Persona" loading="lazy" style="object-position:center top"/>
        <div class="imc"><div class="imcl">Live Voice Persona</div><div class="imct">Aiden · Puck Neural Voice · Sub-500ms Conversational Latency</div></div>
      </div>"""
    html = html.replace(s5_old, s5_new)

    # In Slide 5, add video preview trigger button in the right card:
    s5_card_old = '<div class="sect" style="margin-bottom:9px">Interviewer Persona: Aiden (Puck Neural)</div>'
    s5_card_new = """<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="sect" style="margin-bottom:0">Interviewer Persona: Aiden (Puck Neural)</div>
          <button onclick="openVideoModal('client/public/talking.mp4', 'Aiden — Live Talking Simulation')" style="font-size:.58rem;font-family:var(--fm);background:rgba(255,70,38,.15);border:1px solid rgba(255,70,38,.35);color:var(--ember);padding:2px 8px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:4px">
            <span class="blink" style="width:4px;height:4px;border-radius:50%;background:var(--ember)"></span>▶ Watch Talking Video
          </button>
        </div>"""
    html = html.replace(s5_card_old, s5_card_new, 1)

    # 5. Slide 6 (Live Experience): Replace Unsplash image with live_interview_active.png
    s6_old = """    <div class="imf gc" style="height:175px">
      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=920&q=80&fit=crop&crop=face" alt="Interview candidate" loading="lazy"/>
      <div class="imc"><div class="imcl">Candidate HUD</div><div class="imct">Proctoring badges · live waveform · stage timer</div></div>
    </div>"""
    s6_new = """    <div class="imf gc" style="height:175px" onclick="openLightbox('client/public/screenshots/live_interview_active.png', 'Authentic Live Interview HUD with MediaPipe Vision', 'Real-time candidate telemetry, 60 FPS iris gaze vector, posture stability, stage timer, dynamic audio visualizer, and live ML reinforcement badges.')">
      <div class="live-pill green"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--green)"></span>60 FPS PROCTORING HUD</div>
      <img src="client/public/screenshots/live_interview_active.png" alt="Live Interview Simulation HUD" loading="lazy"/>
      <div class="imc"><div class="imcl">Authentic Production HUD</div><div class="imct">Eye gaze tracking · posture stability · live audio visualizer</div></div>
    </div>"""
    html = html.replace(s6_old, s6_new)

    # 6. Slide 7 (Multilingual Track): Replace Unsplash image with qa_ledger_modal.png
    s7_old = """      <div class="imf gc" style="height:165px;margin-bottom:12px">
        <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=920&q=80&fit=crop" alt="Pakistani university students" loading="lazy"/>
        <div class="imc"><div class="imcl">Target Users</div><div class="imct">Pakistan's 300K+ annual graduates across 8 languages</div></div>
      </div>"""
    s7_new = """      <div class="imf gc" style="height:165px;margin-bottom:12px" onclick="openLightbox('client/public/screenshots/qa_ledger_modal.png', 'Authentic Q&A Ledger Modal (Roman Urdu Transliteration)', 'Real candidate answers recorded in clean Roman script alongside AI scores, key missing concepts, and gold-standard model benchmark answers without script corruption.')">
        <div class="live-pill orange"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--ember2)"></span>ROMAN URDU TRANSLITERATION</div>
        <img src="client/public/screenshots/qa_ledger_modal.png" alt="Roman Urdu Q&A Ledger Modal" loading="lazy"/>
        <div class="imc"><div class="imcl">Q&amp;A Ledger Modal</div><div class="imct">Bilingual Urdu code-switching transliterated to clean Roman script</div></div>
      </div>"""
    html = html.replace(s7_old, s7_new)

    # 7. Slide 10 (Job Radar): Replace Unsplash image with job_radar_dashboard.png
    s10_old = """      <div class="imf gc" style="height:168px;margin-bottom:11px">
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=920&q=80&fit=crop" alt="Data analytics dashboard" loading="lazy"/>
        <div class="imc"><div class="imcl">Job Radar Dashboard</div><div class="imct">Live scraping · skill matching · location-aware</div></div>
      </div>"""
    s10_new = """      <div class="imf gc" style="height:168px;margin-bottom:11px" onclick="openLightbox('client/public/screenshots/job_radar_dashboard.png', 'Interactive Pakistan Job Radar Dashboard', 'Leaflet geospatial map of Pakistani software house hubs (Lahore, Karachi, Islamabad) with live scrapers, Haversine distance, and instant practice triggers.')">
        <div class="live-pill cyan"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--cyan)"></span>PAKISTAN TECH HUBS</div>
        <img src="client/public/screenshots/job_radar_dashboard.png" alt="Pakistan Job Radar Dashboard" loading="lazy"/>
        <div class="imc"><div class="imcl">Interactive Job Radar</div><div class="imct">Leaflet map · Pakistani software houses · Haversine distance</div></div>
      </div>"""
    html = html.replace(s10_old, s10_new)

    # 8. Slide 11 (Company Prep): Replace Unsplash image with dashboard-hero-demo.png
    s11_old = """    <div class="imf gc" style="height:130px">
      <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=920&q=80&fit=crop" alt="Company research office" loading="lazy"/>
      <div class="imc"><div class="imcl">Company Prep</div><div class="imct">30-second AI-generated executive brief</div></div>
    </div>"""
    s11_new = """    <div class="imf gc" style="height:130px" onclick="openLightbox('client/public/screenshots/dashboard-hero-demo.png', 'Company Dossier & Stage Progression Intelligence', 'Automated executive briefs, question forecasts, and bespoke roadmaps for Systems Ltd, Arbisoft, and Careem.')">
      <div class="live-pill"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--ember)"></span>COMPANY INTELLIGENCE</div>
      <img src="client/public/screenshots/dashboard-hero-demo.png" alt="Company Intelligence Dashboard" loading="lazy"/>
      <div class="imc"><div class="imcl">Company Prep</div><div class="imct">30-second AI-generated executive brief</div></div>
    </div>"""
    html = html.replace(s11_old, s11_new)

    # 9. Slide 13 (Analytics): Replace Unsplash image with single_report.png
    s13_old = """      <div class="imf gc" style="height:128px">
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=920&q=80&fit=crop" alt="Analytics dashboard" loading="lazy"/>
        <div class="imc"><div class="imcl">Performance Report</div><div class="imct">Multi-axis radar · stage diagnostics · model answers</div></div>
      </div>"""
    s13_new = """      <div class="imf gc" style="height:128px" onclick="openLightbox('client/public/screenshots/single_report.png', 'Authentic Candidate Evaluation Report', 'Multi-axis Recharts radar chart (Technical, Communication, Problem Solving, Poise) with detailed drills and strength highlights.')">
        <div class="live-pill green"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--green)"></span>RECHARTS RADAR DIAGNOSTICS</div>
        <img src="client/public/screenshots/single_report.png" alt="Actual Candidate Performance Scorecard" loading="lazy"/>
        <div class="imc"><div class="imcl">Performance Report</div><div class="imct">Multi-axis radar · stage diagnostics · model answers</div></div>
      </div>"""
    html = html.replace(s13_old, s13_new)

    # 10. Slide 15 (Impact): Replace Unsplash image with dashboard_hero.png
    s15_old = """      <div class="imf gc" style="height:165px">
        <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=920&q=80&fit=crop" alt="Students collaborating" loading="lazy"/>
        <div class="imc"><div class="imcl">Our Mission</div><div class="imct">Transforming ambitious youth into world-class engineering hires</div></div>
      </div>"""
    s15_new = """      <div class="imf gc" style="height:165px" onclick="openLightbox('client/public/screenshots/dashboard_hero.png', 'CareerTwin AI Platform - 10-Stage Progression Path', 'Scaling across 100,000+ Bano Qabil incubation graduates to prepare for global remote software roles.')">
        <div class="live-pill orange"><span class="blink" style="width:5px;height:5px;border-radius:50%;background:var(--ember2)"></span>100K+ BANO QABIL STUDENTS</div>
        <img src="client/public/screenshots/dashboard_hero.png" alt="CareerTwin Platform Scalability" loading="lazy"/>
        <div class="imc"><div class="imcl">Our Mission</div><div class="imct">Transforming ambitious youth into world-class engineering hires</div></div>
      </div>"""
    html = html.replace(s15_old, s15_new)

    # 11. Slide 16 (Finale): Add 3D Avatar above title
    s16_old = """  <div class="up d0" style="display:inline-flex;align-items:center;gap:7px;font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:rgba(255,106,0,.08);border:1px solid rgba(255,106,0,.22);color:var(--ember2);padding:5px 13px;border-radius:20px">"""
    s16_new = """  <div style="width:68px;height:68px;border-radius:50%;overflow:hidden;border:2px solid var(--ember);box-shadow:0 0 28px rgba(255,70,38,.55);margin-bottom:4px;cursor:pointer" onclick="openLightbox('client/public/interviewer-avatar.jpg', 'CareerTwin AI Avatar', 'Autonomous AI Career Twin & Multimodal Interview Simulation')">
    <img src="client/public/interviewer-avatar.jpg" alt="CareerTwin AI" style="width:100%;height:100%;object-fit:cover;object-position:center top"/>
  </div>
  <div class="up d0" style="display:inline-flex;align-items:center;gap:7px;font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:rgba(255,106,0,.08);border:1px solid rgba(255,106,0,.22);color:var(--ember2);padding:5px 13px;border-radius:20px">"""
    html = html.replace(s16_old, s16_new, 1)

    # 12. Fix Slide Counter and Hint in HTML
    html = html.replace('ctr.textContent=`${p2(cur)} / ${p2(TOTAL-1)}`;', 'ctr.textContent=`${p2(cur)} / ${p2(TOTAL)}`;')
    
    hint_old = '<div id="hint">'
    hint_new = """<div id="hint">Nav: <kbd>←</kbd><kbd>→</kbd> · Fullscreen: <kbd>F</kbd> · Grid: <kbd>G</kbd> · Auto: <kbd>A</kbd> · Click images to Zoom</div>
<!-- Modals Container -->
<div id="lb-modal" style="display:none;position:fixed;inset:0;background:rgba(5,7,15,.93);backdrop-filter:blur(22px);z-index:99999;align-items:center;justify-content:center;padding:20px" onclick="closeLightbox(event)">
  <div style="position:relative;max-width:94vw;max-height:92vh;display:flex;flex-direction:column;align-items:center" onclick="event.stopPropagation()">
    <button onclick="closeLightbox()" style="position:absolute;top:-38px;right:0;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:1.1rem;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s">&times;</button>
    <div style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.18);box-shadow:0 0 50px rgba(0,0,0,.9), 0 0 35px rgba(255,70,38,.3);background:#080c16">
      <img id="lb-img" src="" alt="Screenshot" style="max-width:90vw;max-height:78vh;object-fit:contain;display:block"/>
      <div style="padding:10px 16px;background:rgba(10,16,28,.96);border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div id="lb-title" style="font-family:var(--fh);font-size:.95rem;font-weight:700;color:#fff"></div>
          <div id="lb-desc" style="font-size:.7rem;color:var(--t3);margin-top:2px"></div>
        </div>
        <div style="display:flex;gap:8px">
          <span style="font-size:.6rem;color:var(--ember2);background:rgba(255,106,0,.12);border:1px solid rgba(255,106,0,.25);padding:3px 8px;border-radius:12px;font-family:var(--fm)">AUTHENTIC APP SCREENSHOT</span>
          <button onclick="closeLightbox()" style="font-size:.65rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:var(--t2);padding:3px 8px;border-radius:5px;cursor:pointer">ESC</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="vid-modal" style="display:none;position:fixed;inset:0;background:rgba(5,7,15,.93);backdrop-filter:blur(22px);z-index:99999;align-items:center;justify-content:center;padding:20px" onclick="closeVideoModal(event)">
  <div style="position:relative;max-width:760px;width:92vw;display:flex;flex-direction:column;align-items:center" onclick="event.stopPropagation()">
    <button onclick="closeVideoModal()" style="position:absolute;top:-38px;right:0;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:1.1rem;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center">&times;</button>
    <div style="width:100%;border-radius:14px;overflow:hidden;border:1px solid rgba(255,70,38,.4);box-shadow:0 0 50px rgba(0,0,0,.9),0 0 35px rgba(255,70,38,.3);background:#080c16">
      <div style="padding:10px 16px;background:rgba(15,23,42,.95);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="blink" style="width:7px;height:7px;border-radius:50%;background:var(--ember)"></span>
          <span id="vid-title" style="font-family:var(--fh);font-size:.88rem;font-weight:700;color:#fff">Aiden (Puck Neural Voice) — 3D Video Simulation</span>
        </div>
        <div style="display:flex;gap:6px">
          <button id="btn-talking" onclick="switchVideo('client/public/talking.mp4', 'Talking Simulation')" style="font-size:.65rem;background:rgba(255,70,38,.2);border:1px solid var(--ember);color:#fff;padding:3px 8px;border-radius:5px;cursor:pointer">▶ Talking</button>
          <button id="btn-idle" onclick="switchVideo('client/public/idle.mp4', 'Idle Avatar')" style="font-size:.65rem;background:rgba(255,255,255,.08);border:1px solid var(--border);color:var(--t3);padding:3px 8px;border-radius:5px;cursor:pointer">⏸ Idle</button>
        </div>
      </div>
      <video id="modal-video" controls autoplay loop playsinline style="width:100%;max-height:55vh;display:block;background:#000" src="client/public/talking.mp4"></video>
      <div style="padding:10px 16px;background:rgba(10,16,28,.95);font-size:.7rem;color:var(--t3);display:flex;justify-content:space-between">
        <span>Google Gemini Multimodal Live 2.5 · 24kHz Lip-Sync</span>
        <span style="font-family:var(--fm);color:var(--cyan)">Puck Voice · Sub-500ms Latency</span>
      </div>
    </div>
  </div>
</div>

<div id="grid-modal" style="display:none;position:fixed;inset:0;background:rgba(5,7,15,.95);backdrop-filter:blur(24px);z-index:99999;align-items:center;justify-content:center;padding:28px" onclick="closeOverview(event)">
  <div style="position:relative;max-width:1100px;width:95vw;max-height:90vh;display:flex;flex-direction:column" onclick="event.stopPropagation()">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px">
        <span class="lbl">Slide Overview</span>
        <span style="font-family:var(--fh);font-size:1.1rem;font-weight:700">16 Master Slides</span>
      </div>
      <button onclick="closeOverview()" style="background:rgba(255,255,255,.1);border:1px solid var(--border);color:#fff;font-size:1rem;padding:4px 10px;border-radius:6px;cursor:pointer">✕ Close</button>
    </div>
    <div id="grid-cards" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;overflow-y:auto;padding-right:6px"></div>
  </div>
</div>
"""
    if 'id="lb-modal"' not in html:
        # replace the existing hint
        html = re.sub(r'<div id="hint">.*?</div>', hint_new, html, flags=re.DOTALL)

    # 13. Enhanced JavaScript functions for Lightbox, Video modal, Overview drawer, Auto-play, Fullscreen
    extra_js = """
/* INTERACTIVE MODALS & FEATURES */
function openLightbox(src, title, desc) {
  const m = document.getElementById('lb-modal');
  document.getElementById('lb-img').src = src;
  document.getElementById('lb-title').textContent = title || 'Authentic Application Screenshot';
  document.getElementById('lb-desc').textContent = desc || '';
  m.style.display = 'flex';
}
function closeLightbox(e) {
  const m = document.getElementById('lb-modal');
  m.style.display = 'none';
}
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

function openVideoModal(src, title) {
  const m = document.getElementById('vid-modal');
  const v = document.getElementById('modal-video');
  document.getElementById('vid-title').textContent = title || 'Aiden — 3D Video Simulation';
  v.src = src || 'client/public/talking.mp4';
  v.play().catch(()=>{});
  m.style.display = 'flex';
}
function closeVideoModal(e) {
  const m = document.getElementById('vid-modal');
  const v = document.getElementById('modal-video');
  v.pause();
  m.style.display = 'none';
}
function switchVideo(src, title) {
  const v = document.getElementById('modal-video');
  v.src = src;
  v.play().catch(()=>{});
  document.getElementById('btn-talking').style.background = src.includes('talking') ? 'rgba(255,70,38,.2)' : 'rgba(255,255,255,.08)';
  document.getElementById('btn-talking').style.borderColor = src.includes('talking') ? 'var(--ember)' : 'var(--border)';
  document.getElementById('btn-talking').style.color = src.includes('talking') ? '#fff' : 'var(--t3)';
  document.getElementById('btn-idle').style.background = src.includes('idle') ? 'rgba(56,189,248,.2)' : 'rgba(255,255,255,.08)';
  document.getElementById('btn-idle').style.borderColor = src.includes('idle') ? 'var(--cyan)' : 'var(--border)';
  document.getElementById('btn-idle').style.color = src.includes('idle') ? '#fff' : 'var(--t3)';
}
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;
window.switchVideo = switchVideo;

/* SLIDE OVERVIEW GRID */
const SLIDE_TITLES = [
  "01 · Cover & Hero (CareerTwin AI)",
  "02 · Market Dilemma (Pakistan's Tech Crisis)",
  "03 · 4-Pillar Autonomous Architecture",
  "04 · Full-Stack System Topology",
  "05 · Multimodal Voice AI Engine (Aiden)",
  "06 · Live Interview Simulation HUD",
  "07 · Hackathon Track: Urdu & Roman Script",
  "08 · MediaPipe 60 FPS Computer Vision",
  "09 · Adaptive ML Assessment & Rubric",
  "10 · Interactive Pakistan Job Radar",
  "11 · Company Dossier Intelligence",
  "12 · ATS Resume Engine & Roadmaps",
  "13 · Diagnostic Reports & Scorecards",
  "14 · Alibaba Cloud Scalability Architecture",
  "15 · Bano Qabil Impact & Expansion",
  "16 · Grand Finale & Judges Q&A"
];
function initGrid() {
  const c = document.getElementById('grid-cards');
  if (!c || c.children.length > 0) return;
  SLIDE_TITLES.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'gc gc-s';
    card.style.padding = '12px';
    card.style.cursor = 'pointer';
    card.style.transition = 'all .2s';
    card.innerHTML = `<div style="font-size:.56rem;font-family:var(--fm);color:var(--ember);margin-bottom:4px">SLIDE ${String(i+1).padStart(2,'0')}</div><div style="font-size:.76rem;font-weight:700;line-height:1.4">${t.split(' · ')[1]}</div>`;
    card.onmouseover = () => { card.style.borderColor = 'var(--ember)'; card.style.transform = 'translateY(-2px)'; };
    card.onmouseout = () => { card.style.borderColor = ''; card.style.transform = ''; };
    card.onclick = () => { closeOverview(); go(i); };
    c.appendChild(card);
  });
}
function toggleOverview() {
  const m = document.getElementById('grid-modal');
  if (m.style.display === 'flex') {
    m.style.display = 'none';
  } else {
    initGrid();
    m.style.display = 'flex';
  }
}
function closeOverview() {
  const m = document.getElementById('grid-modal');
  if (m) m.style.display = 'none';
}
window.toggleOverview = toggleOverview;
window.closeOverview = closeOverview;

/* AUTOPLAY */
let autoTimer = null;
function toggleAutoplay() {
  const btn = document.getElementById('btn-auto');
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    btn.classList.remove('active');
    btn.textContent = '▶ Auto';
  } else {
    btn.classList.add('active');
    btn.textContent = '⏸ Pause';
    autoTimer = setInterval(() => {
      if (cur < TOTAL - 1) go(cur + 1);
      else go(0);
    }, 6000);
  }
}
window.toggleAutoplay = toggleAutoplay;

/* FULLSCREEN */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen().catch(()=>{});
  }
}
window.toggleFullscreen = toggleFullscreen;

/* KEYBOARD SHORTCUTS EXTENSION */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeVideoModal();
    closeOverview();
  }
  if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  }
  if (e.key === 'g' || e.key === 'G') {
    toggleOverview();
  }
  if (e.key === 'a' || e.key === 'A') {
    toggleAutoplay();
  }
});
"""
    if "/* INTERACTIVE MODALS & FEATURES */" not in html:
        html = html.replace("</script>", extra_js + "\n</script>")

    with open('presentation.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Successfully updated presentation.html with original images, video modal, lightbox, and overview drawer.")

if __name__ == '__main__':
    update_html()
