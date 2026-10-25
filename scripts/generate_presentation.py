#!/usr/bin/env python3
"""
CareerTwin AI - Master Presentation Generator
Alibaba Cloud × Bano Qabil AI Hackathon 2026 Edition
Generates a 16-slide high-impact presentation deck in .pptx format.
"""
import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation(output_path="CareerTwin_AI_Master_Presentation.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette Tokens - Dark Obsidian Cyber Theme
    C_BG = RGBColor(8, 12, 22)           # #080C16 Deep Obsidian
    C_CARD = RGBColor(16, 24, 42)        # #10182A Dark Glass Card
    C_CARD_BORDER = RGBColor(35, 53, 84) # #233554 Slate Border
    C_ACCENT_RED = RGBColor(255, 70, 38) # #FF4626 Coral Red (CareerTwin Signature)
    C_ACCENT_CYAN = RGBColor(56, 189, 248) # #38BDF8 Sky Cyan
    C_ACCENT_GREEN = RGBColor(16, 185, 129) # #10B981 Emerald
    C_ACCENT_GOLD = RGBColor(245, 158, 11)  # #F59E0B Amber Gold
    C_ACCENT_PURPLE = RGBColor(168, 85, 247) # #A855F7 Purple
    C_ACCENT_ORANGE = RGBColor(255, 107, 0)  # Alibaba Cloud Orange
    C_TEXT_WHITE = RGBColor(255, 255, 255)
    C_TEXT_MUTED = RGBColor(148, 163, 184)
    C_TEXT_DARK = RGBColor(203, 213, 225)

    blank_layout = prs.slide_layouts[6]

    def add_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG
        bg.line.fill.background()
        return bg

    def add_header(slide, category_tag, title_text, subtitle_text=None, tag_color=C_ACCENT_RED):
        # Category Tag Pill
        tag_w = Inches(max(2.8, len(category_tag) * 0.13))
        tag_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.42), tag_w, Inches(0.35))
        tag_box.fill.solid()
        tag_box.fill.fore_color.rgb = RGBColor(22, 32, 54)
        tag_box.line.color.rgb = tag_color
        tag_box.line.width = Pt(1)
        tf_tag = tag_box.text_frame
        tf_tag.vertical_anchor = MSO_ANCHOR.MIDDLE
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = category_tag.upper()
        p_tag.alignment = PP_ALIGN.CENTER
        p_tag.font.size = Pt(9.5)
        p_tag.font.bold = True
        p_tag.font.color.rgb = tag_color
        p_tag.font.name = "Arial"

        # Hackathon Header Corner Badge
        h_badge = slide.shapes.add_textbox(Inches(7.5), Inches(0.38), Inches(5.0), Inches(0.4))
        tf_hb = h_badge.text_frame
        tf_hb.word_wrap = True
        p_hb = tf_hb.paragraphs[0]
        p_hb.text = "ALIBABA CLOUD × BANO QABIL AI HACKATHON 2026"
        p_hb.alignment = PP_ALIGN.RIGHT
        p_hb.font.size = Pt(9)
        p_hb.font.bold = True
        p_hb.font.color.rgb = C_ACCENT_ORANGE

        # Main Title
        txBox = slide.shapes.add_textbox(Inches(0.8), Inches(0.82), Inches(11.7), Inches(0.8))
        tf = txBox.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(25)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_WHITE
        p.font.name = "Arial"

        if subtitle_text:
            p2 = tf.add_paragraph()
            p2.text = subtitle_text
            p2.font.size = Pt(12)
            p2.font.color.rgb = C_TEXT_MUTED
            p2.font.name = "Calibri"

    def add_card(slide, left, top, width, height, border_color=C_CARD_BORDER, fill_color=C_CARD):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = fill_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        return card

    # =========================================================================
    # SLIDE 1: Cover & Hackathon Title
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide1)

    # Glowing Top Stripe
    glow = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.12))
    glow.fill.solid()
    glow.fill.fore_color.rgb = C_ACCENT_RED
    glow.line.fill.background()

    # Hackathon Banner Tag
    h_pill = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.5), Inches(5.6), Inches(0.42))
    h_pill.fill.solid()
    h_pill.fill.fore_color.rgb = RGBColor(28, 20, 15)
    h_pill.line.color.rgb = C_ACCENT_ORANGE
    h_pill.line.width = Pt(1.5)
    tf_hp = h_pill.text_frame
    tf_hp.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_hp = tf_hp.paragraphs[0]
    p_hp.text = "🏆 ALIBABA CLOUD × BANO QABIL AI HACKATHON 2026"
    p_hp.alignment = PP_ALIGN.CENTER
    p_hp.font.size = Pt(10.5)
    p_hp.font.bold = True
    p_hp.font.color.rgb = C_ACCENT_ORANGE

    # Left: Title, Vision & Metrics
    t_box = slide1.shapes.add_textbox(Inches(0.8), Inches(1.15), Inches(6.8), Inches(2.6))
    tf1 = t_box.text_frame
    tf1.word_wrap = True
    
    p = tf1.paragraphs[0]
    p.text = "CareerTwin AI"
    p.font.size = Pt(46)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_WHITE
    p.font.name = "Arial"

    p_sub = tf1.add_paragraph()
    p_sub.text = "Autonomous AI Career Twin & Multimodal Interview Simulation"
    p_sub.font.size = Pt(16.5)
    p_sub.font.color.rgb = C_ACCENT_CYAN
    p_sub.font.name = "Calibri"

    p_desc = tf1.add_paragraph()
    p_desc.text = "Empowering 100,000+ Pakistani graduates & global tech jobseekers with sub-second Gemini Live 2.5 voice simulation, 60 FPS in-browser computer vision proctoring, adaptive reinforcement questioning, and localized global job radar."
    p_desc.font.size = Pt(11.5)
    p_desc.font.color.rgb = C_TEXT_MUTED
    p_desc.font.name = "Calibri"

    # Right: New 3D Avatar Image
    avatar_path = "client/public/interviewer-avatar.jpg"
    if os.path.exists(avatar_path):
        # Card frame around avatar
        add_card(slide1, Inches(7.8), Inches(0.9), Inches(4.7), Inches(5.8), border_color=C_ACCENT_RED)
        slide1.shapes.add_picture(avatar_path, Inches(7.95), Inches(1.05), Inches(4.4), Inches(4.7))
        
        # Caption below avatar
        cap_box = slide1.shapes.add_textbox(Inches(7.95), Inches(5.85), Inches(4.4), Inches(0.7))
        tf_cap = cap_box.text_frame
        tf_cap.word_wrap = True
        p_cap1 = tf_cap.paragraphs[0]
        p_cap1.text = "Aiden · AI Principal Engineering Interviewer"
        p_cap1.alignment = PP_ALIGN.CENTER
        p_cap1.font.size = Pt(11.5)
        p_cap1.font.bold = True
        p_cap1.font.color.rgb = C_ACCENT_RED
        p_cap2 = tf_cap.add_paragraph()
        p_cap2.text = "Powered by Google Gemini Multimodal Live 2.5 (Puck Voice)"
        p_cap2.alignment = PP_ALIGN.CENTER
        p_cap2.font.size = Pt(9.5)
        p_cap2.font.color.rgb = C_TEXT_MUTED

    # Bottom 3 Feature Pills
    features = [
        ("Sub-500ms Voice", "Gemini Live 24kHz bidirectional audio stream", C_ACCENT_CYAN),
        ("60 FPS Vision", "MediaPipe eye gaze & posture proctoring", C_ACCENT_GREEN),
        ("Adaptive RL", "4-dimension ML answer evaluation", C_ACCENT_PURPLE),
    ]
    card_w = Inches(2.15)
    for i, (title, desc, col) in enumerate(features):
        x = Inches(0.8) + i * Inches(2.3)
        add_card(slide1, x, Inches(4.75), card_w, Inches(1.95), border_color=col)
        tb = slide1.shapes.add_textbox(x + Inches(0.12), Inches(4.85), card_w - Inches(0.24), Inches(1.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = col
        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(10)
        p2.font.color.rgb = C_TEXT_MUTED

    # Footer
    f_box = slide1.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(11.7), Inches(0.4))
    tf_f = f_box.text_frame
    p_f = tf_f.paragraphs[0]
    p_f.text = "Track: Urdu & Regional Tech · Education & Youth Employability · Open Innovation"
    p_f.font.size = Pt(10)
    p_f.font.color.rgb = RGBColor(100, 116, 139)

    # =========================================================================
    # SLIDE 2: Problem Statement & Hackathon Motivation
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide2)
    add_header(slide2, "Market Dilemma", "The Tech Hiring Crisis: Why 90% of Pakistani Graduates Fail Technical Interviews", "Bridging the massive gulf between academic courses (Bano Qabil) and competitive global tech hiring")

    problems = [
        ("The Spoken Latency & Pressure Gap", 
         "Text-based chatbots (ChatGPT/Claude) cannot prepare students for live verbal pressure. Under audio scrutiny, candidates freeze when explaining system design trade-offs, concurrency, and architecture.",
         "90% of technical screen rejections stem from communication paralysis under pressure, not coding deficiency.",
         C_ACCENT_RED),
        ("The Non-Verbal Evaluation Blindspot",
         "Top employers heavily evaluate posture stability, eye contact, and vocal composure. Zero free tools exist in South Asia to proctor candidates' behavioral poise and acoustic rhythm during practice.",
         "55% of interviewer trust is subconsciously established through non-verbal poise and gaze direction.",
         C_ACCENT_GOLD),
        ("Emerging Market & Language Barriers",
         "Human mock interview coaches charge $100–$250/hour, completely unaffordable for Pakistani youth. Furthermore, regional code-switching (Urdu/English) breaks traditional Western English speech models.",
         "CareerTwin AI democratizes elite tier-1 Silicon Valley mock interviewing at virtually zero marginal cost.",
         C_ACCENT_CYAN)
    ]

    col_w = Inches(3.7)
    for i, (title, body, stat, col) in enumerate(problems):
        x = Inches(0.8) + i * (col_w + Inches(0.3))
        add_card(slide2, x, Inches(2.0), col_w, Inches(4.8), border_color=col)
        
        tb = slide2.shapes.add_textbox(x + Inches(0.2), Inches(2.2), col_w - Inches(0.4), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p_idx = tf.paragraphs[0]
        p_idx.text = f"CRITICAL PAIN POINT 0{i+1}"
        p_idx.font.size = Pt(10.5)
        p_idx.font.bold = True
        p_idx.font.color.rgb = col

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(15.5)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE

        p_b = tf.add_paragraph()
        p_b.text = body
        p_b.font.size = Pt(11.5)
        p_b.font.color.rgb = C_TEXT_DARK

        p_sep = tf.add_paragraph()
        p_sep.text = "Key Takeaway:"
        p_sep.font.size = Pt(10.5)
        p_sep.font.bold = True
        p_sep.font.color.rgb = col

        p_s = tf.add_paragraph()
        p_s.text = stat
        p_s.font.size = Pt(11)
        p_s.font.italic = True
        p_s.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 3: The 4-Pillar Solution Overview
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide3)
    add_header(slide3, "Core Solution", "CareerTwin AI: The 4-Pillar Autonomous Career Architecture", "A complete end-to-end ecosystem from skill gap discovery to mock simulation and job placement")

    pillars = [
        ("01", "Multimodal Real-Time Voice Simulation", "Gemini Live 2.5 24kHz PCM audio streaming with sub-500ms latency, zero DAC pops, and conversational barge-in.", C_ACCENT_RED),
        ("02", "In-Browser CV & Acoustic Proctoring", "MediaPipe 60 FPS face landmarker: real-time 3D iris gaze vector, posture stability, and acoustic WPM pacing.", C_ACCENT_CYAN),
        ("03", "Adaptive ML Assessment & Reinforcement", "4D rubric (Relevance, Depth, Clarity, Edge Cases) classifying intents and dynamically adapting difficulty.", C_ACCENT_GREEN),
        ("04", "Pakistan & Global Interactive Job Radar", "Live scrapers across software houses and remote boards with geospatial Leaflet mapping and distance scores.", C_ACCENT_PURPLE),
    ]

    card_w2 = Inches(5.6)
    card_h2 = Inches(1.15)
    for i, (num, title, desc, col) in enumerate(pillars):
        y = Inches(1.95) + i * Inches(1.23)
        add_card(slide3, Inches(0.8), y, card_w2, card_h2, border_color=col)
        
        nb = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.95), y + Inches(0.18), Inches(0.65), Inches(0.75))
        nb.fill.solid()
        nb.fill.fore_color.rgb = RGBColor(25, 36, 60)
        nb.line.color.rgb = col
        nb.line.width = Pt(1.5)
        tf_nb = nb.text_frame
        tf_nb.vertical_anchor = MSO_ANCHOR.MIDDLE
        p_nb = tf_nb.paragraphs[0]
        p_nb.text = num
        p_nb.alignment = PP_ALIGN.CENTER
        p_nb.font.size = Pt(16)
        p_nb.font.bold = True
        p_nb.font.color.rgb = col

        tb = slide3.shapes.add_textbox(Inches(1.75), y + Inches(0.1), card_w2 - Inches(1.05), card_h2 - Inches(0.2))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = C_TEXT_WHITE

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(10)
        p2.font.color.rgb = C_TEXT_DARK

    # Right: Authentic Dashboard Hero Screenshot
    dash_shot = "client/public/screenshots/dashboard_hero.png"
    add_card(slide3, Inches(6.7), Inches(1.95), Inches(5.833), Inches(4.85), border_color=C_ACCENT_CYAN)
    if os.path.exists(dash_shot):
        slide3.shapes.add_picture(dash_shot, Inches(6.85), Inches(2.1), Inches(5.533), Inches(3.22))
    
    tb_ds = slide3.shapes.add_textbox(Inches(6.85), Inches(5.42), Inches(5.533), Inches(1.25))
    tf_ds = tb_ds.text_frame
    tf_ds.word_wrap = True
    p_ds1 = tf_ds.paragraphs[0]
    p_ds1.text = "CareerTwin AI Platform Dashboard (Authentic Production UI)"
    p_ds1.font.size = Pt(12)
    p_ds1.font.bold = True
    p_ds1.font.color.rgb = C_ACCENT_CYAN
    p_ds2 = tf_ds.add_paragraph()
    p_ds2.text = "Real-time digital career twin, 10-stage interview progression path, Recharts diagnostic analytics, and instant job matching in one unified interface."
    p_ds2.font.size = Pt(10)
    p_ds2.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 4: Full-Stack Architecture Topology
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide4)
    add_header(slide4, "System Topology", "Full-Stack System Topology & Technology Stack", "End-to-end type-safe, ultra-low latency, and horizontally scalable cloud architecture")

    layers = [
        ("Presentation Layer", "React 19 · Vite · Tailwind v4 · Framer Motion · Lucide · Recharts · Radix UI", 
         ["Modular SPA with reactive HUD and Web Audio visualizers", "Wouter micro-routing with zero bundle bloat", "Adaptive dark glass theme with Ember Halo aesthetics"], C_ACCENT_RED),
        ("Voice & Real-Time Audio", "RFC-6455 WebSockets · Gemini Live Audio Proxy · Web Audio API AudioContext", 
         ["Bidirectional 24kHz PCM16 audio streaming with sub-500ms latency", "Client-side audio smoothing with 15ms gain ramps eliminating DAC pops", "Instant speech detection & seamless model interruption"], C_ACCENT_CYAN),
        ("AI & Machine Learning", "MediaPipe Vision · CandidateMetricsEngine · Gemini 2.5 Flash · NLP Evaluator", 
         ["60 FPS in-browser facial landmarking, eye vector & posture analysis", "Multi-dimensional rubric scoring (Relevance, Depth, Clarity, Edge Cases)", "Reinforcement learning state transitions & question intelligence"], C_ACCENT_GREEN),
        ("Backend & Data Tier", "Node.js Express · tRPC v11 · Drizzle ORM · Supabase PostgreSQL · S3 Storage", 
         ["End-to-end type safety between client procedures & server routers", "Drizzle schema migrations with resilient connection pooling", "Multi-format PDF/DOCX parsing engine with ATS keyword matching"], C_ACCENT_PURPLE),
    ]

    for i, (layer_title, stack, bullets, col) in enumerate(layers):
        y = Inches(1.95) + i * Inches(1.28)
        c = add_card(slide4, Inches(0.8), y, Inches(11.733), Inches(1.18), border_color=col)
        
        strip = slide4.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y, Inches(0.12), Inches(1.18))
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()

        tb = slide4.shapes.add_textbox(Inches(1.1), y + Inches(0.08), Inches(11.2), Inches(1.02))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = f"{layer_title.upper()}  —  "
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = col
        run_stack = p1.add_run()
        run_stack.text = stack
        run_stack.font.size = Pt(11.5)
        run_stack.font.bold = False
        run_stack.font.color.rgb = C_TEXT_WHITE

        p2 = tf.add_paragraph()
        p2.text = " • ".join(bullets)
        p2.font.size = Pt(11)
        p2.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 5: Multimodal Gemini Live 2.5 Voice Engine (Aiden Persona)
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide5)
    add_header(slide5, "Voice AI Engine", "Multimodal Gemini Live 2.5: Sub-Second Spoken Simulation", "Real-time bidirectional 24kHz PCM voice streaming with natural conversation cadence")

    # Left: Specs
    add_card(slide5, Inches(0.8), Inches(2.0), Inches(5.8), Inches(4.8), border_color=C_ACCENT_CYAN)
    tb_l = slide5.shapes.add_textbox(Inches(1.0), Inches(2.15), Inches(5.4), Inches(4.5))
    tf_l = tb_l.text_frame
    tf_l.word_wrap = True

    p = tf_l.paragraphs[0]
    p.text = "Acoustic & Protocol Architecture"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_CYAN

    specs = [
        ("RFC-6455 WebSocket Gateway", "Secure live connection routing via server/geminiLiveProxy.ts directly to Google Gemini Multimodal Live API."),
        ("24kHz Gapless Playback", "Audio streamed in raw PCM16 chunks, scheduled via Web Audio API createBufferSource() with micro-second accuracy."),
        ("35ms Safety Cushion", "Network jitter compensation cushion on turn startup prevents audio starvation and crackling artifacts."),
        ("Soft 15ms Gain Cutoff", "Smooth linear gain ramp-down prevents electrical DAC pop, buzz, or periodic harmonic clicks during interruption."),
        ("Persona: Aiden (Puck Voice)", "Calm, professional, human-paced male neural voice tailored for high-stakes technical interview scenarios."),
        ("Natural Model Interruption", "Handles user barge-in natively; when candidate speaks, AI immediately silences playback and recalibrates state.")
    ]

    for title, desc in specs:
        p_t = tf_l.add_paragraph()
        p_t.text = f"▸ {title}: "
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_DARK

    # Right: New 3D Avatar Image
    add_card(slide5, Inches(6.9), Inches(2.0), Inches(5.6), Inches(4.8), border_color=C_ACCENT_RED)
    if os.path.exists(avatar_path):
        slide5.shapes.add_picture(avatar_path, Inches(7.1), Inches(2.2), Inches(5.2), Inches(3.2))
    
    tb_r = slide5.shapes.add_textbox(Inches(7.1), Inches(5.5), Inches(5.2), Inches(1.2))
    tf_r = tb_r.text_frame
    tf_r.word_wrap = True
    p_rt = tf_r.paragraphs[0]
    p_rt.text = "Live Interviewer Persona: Aiden (Puck Neural)"
    p_rt.font.size = Pt(13)
    p_rt.font.bold = True
    p_rt.font.color.rgb = C_ACCENT_RED

    p_rd = tf_r.add_paragraph()
    p_rd.text = "Visual 3D avatar lip-syncs dynamically with live audio waveform. Real-time HUD indicators communicate live speech streaming, model latency, and voice state transitions seamlessly."
    p_rd.font.size = Pt(10.5)
    p_rd.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 6: Live Interview Simulation Experience (Screenshots & Video Demo)
    # =========================================================================
    slide6 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide6)
    add_header(slide6, "Live Experience", "Live Multimodal Interview Simulation & Video Engine", "Real-time candidate telemetry, live speech transcription, and proctoring HUD in action")

    # Left: Actual Screenshot of Live Interview
    add_card(slide6, Inches(0.8), Inches(2.0), Inches(6.8), Inches(4.8), border_color=C_ACCENT_GREEN)
    interview_shot = "client/public/screenshots/live_interview_active.png"
    if not os.path.exists(interview_shot):
        interview_shot = "client/public/screenshots/live-interview-demo.png"
    if os.path.exists(interview_shot):
        slide6.shapes.add_picture(interview_shot, Inches(0.95), Inches(2.15), Inches(6.5), Inches(3.6))
    
    tb_is = slide6.shapes.add_textbox(Inches(0.95), Inches(5.85), Inches(6.5), Inches(0.8))
    tf_is = tb_is.text_frame
    tf_is.word_wrap = True
    p_is1 = tf_is.paragraphs[0]
    p_is1.text = "Authentic Live Interview HUD (MediaPipe Vision Proctoring)"
    p_is1.font.size = Pt(11)
    p_is1.font.bold = True
    p_is1.font.color.rgb = C_ACCENT_GREEN
    p_is2 = tf_is.add_paragraph()
    p_is2.text = "Features real-time speech visualizer, dynamic timer, proctoring status badges, and answer mode toggles."
    p_is2.font.size = Pt(9.5)
    p_is2.font.color.rgb = C_TEXT_MUTED

    # Right: Video & Motion Capabilities Card
    add_card(slide6, Inches(7.9), Inches(2.0), Inches(4.6), Inches(4.8), border_color=C_ACCENT_PURPLE)
    tb_vid = slide6.shapes.add_textbox(Inches(8.1), Inches(2.2), Inches(4.2), Inches(4.4))
    tf_v = tb_vid.text_frame
    tf_v.word_wrap = True

    pv_t = tf_v.paragraphs[0]
    pv_t.text = "Kinetic 3D Video & Audio Simulation"
    pv_t.font.size = Pt(15)
    pv_t.font.bold = True
    pv_t.font.color.rgb = C_ACCENT_PURPLE

    vid_points = [
        ("Synchronized Talking Video", "Integrated talking.mp4 and idle.mp4 video loops provide seamless human presence, alternating naturally based on voice VAD state."),
        ("Microphone Feedback Cancellation", "Smart acoustic echo suppression prevents speaker bleed from looping back into microphone streaming."),
        ("Adaptive Difficulty HUD", "Real-time ML feedback badge informs candidate of interviewer intent (e.g. Probing Edge Case, Acknowledging Mastery)."),
        ("Dual Interaction Modes", "Candidates can seamlessly switch between real-time voice streaming and tactile coding/typing during live sessions.")
    ]

    for title, desc in vid_points:
        p_t = tf_v.add_paragraph()
        p_t.text = f"▸ {title}: "
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_DARK

    # =========================================================================
    # SLIDE 7: Pakistan-First Multilingual & Roman Script Normalization
    # =========================================================================
    slide7 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide7)
    add_header(slide7, "Hackathon Track: Urdu & Regional Tech", "Pakistan-First Multilingual & Roman Script Normalization", "Intelligent Urdu/Hindi code-switching handling with zero UI script breakage")

    cards_data = [
        ("The Bilingual Reality in South Asia", 
         "Pakistani tech candidates constantly code-switch between English, Urdu, and Hindi ('jaise k', 'mera khayal yeh hai'). Standard models crash or corrupt with non-ASCII Arabic script.",
         C_ACCENT_CYAN),
        ("Universal Romanization Pipeline",
         "CareerTwin enforces strict Roman script conversion across all pipelines via romanTransliterator.ts. Urdu phonetics are transliterated into readable Latin script with zero UI breakage.",
         C_ACCENT_RED),
        ("Zero-Config Automatic Detection",
         "languageDetector.ts continuously monitors incoming phonetic markers, automatically detecting bilingual phrasing and keeping the voice interview flow 100% frictionless.",
         C_ACCENT_GREEN),
    ]

    card_w7 = Inches(5.6)
    card_h7 = Inches(1.52)
    for i, (title, body, col) in enumerate(cards_data):
        y = Inches(1.95) + i * Inches(1.65)
        add_card(slide7, Inches(0.8), y, card_w7, card_h7, border_color=col)
        
        tb = slide7.shapes.add_textbox(Inches(1.0), y + Inches(0.12), card_w7 - Inches(0.4), card_h7 - Inches(0.24))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13.5)
        p1.font.bold = True
        p1.font.color.rgb = col

        p2 = tf.add_paragraph()
        p2.text = body
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = C_TEXT_DARK

    # Right: Authentic Q&A Ledger Modal Screenshot
    qa_shot = "client/public/screenshots/qa_ledger_modal.png"
    add_card(slide7, Inches(6.7), Inches(1.95), Inches(5.833), Inches(4.85), border_color=C_ACCENT_PURPLE)
    if os.path.exists(qa_shot):
        slide7.shapes.add_picture(qa_shot, Inches(6.85), Inches(2.1), Inches(5.533), Inches(3.22))
    
    tb_qa = slide7.shapes.add_textbox(Inches(6.85), Inches(5.42), Inches(5.533), Inches(1.25))
    tf_qa = tb_qa.text_frame
    tf_qa.word_wrap = True
    p_qa1 = tf_qa.paragraphs[0]
    p_qa1.text = "Authentic Q&A Ledger Modal (Roman Urdu Transliteration)"
    p_qa1.font.size = Pt(12)
    p_qa1.font.bold = True
    p_qa1.font.color.rgb = C_ACCENT_PURPLE
    p_qa2 = tf_qa.add_paragraph()
    p_qa2.text = "Real candidate answers recorded in clean Roman script alongside AI scores, key missing concepts, and gold-standard model benchmark answers."
    p_qa2.font.size = Pt(10)
    p_qa2.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 8: In-Browser MediaPipe Computer Vision & Proctoring
    # =========================================================================
    slide8 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide8)
    add_header(slide8, "Computer Vision", "In-Browser Computer Vision & Acoustic Proctoring", "MediaPipe 60 FPS face landmarker, body poise metrics, and real-time integrity guard")

    cv_metrics = [
        ("Eye Contact Tracking", "Real-time 3D vector calculation of iris position relative to facial bounding box. Measures percentage of sustained camera gaze during technical explanations.", "Target: >65% contact", C_ACCENT_CYAN),
        ("Head Orientation (Pose)", "Continuous 3-axis tracking: Yaw (horizontal turning), Pitch (looking up/down at screen or notes), Roll (head tilting). Detects distraction or external prompting.", "Full 3D Degrees", C_ACCENT_GREEN),
        ("Posture & Poise Stability", "Monitors bounding box shoulder alignment, distance variation, and slouching anomalies to deliver behavioral poise scores for senior executive presence.", "Normalized 0-100", C_ACCENT_PURPLE),
        ("Acoustic Pacing (WPM)", "Speech pace tracker calculating real-time Words Per Minute, pause duration variance, and acoustic volume dynamics to coach candidates against rushing or trailing off.", "Ideal: 120-150 WPM", C_ACCENT_GOLD),
    ]

    for i, (m_title, m_desc, m_badge, col) in enumerate(cv_metrics):
        x = Inches(0.8) + i * Inches(2.95)
        add_card(slide8, x, Inches(2.0), Inches(2.8), Inches(3.4), border_color=col)
        
        tb = slide8.shapes.add_textbox(x + Inches(0.15), Inches(2.15), Inches(2.5), Inches(3.1))
        tf = tb.text_frame
        tf.word_wrap = True

        p_b = tf.paragraphs[0]
        p_b.text = m_badge
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = col

        p_t = tf.add_paragraph()
        p_t.text = m_title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE

        p_d = tf.add_paragraph()
        p_d.text = m_desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = C_TEXT_DARK

    # Bottom Full-Width Banner: Anti-Cheating & Integrity Guard
    add_card(slide8, Inches(0.8), Inches(5.6), Inches(11.733), Inches(1.3), border_color=C_ACCENT_RED, fill_color=RGBColor(25, 18, 30))
    tb_alert = slide8.shapes.add_textbox(Inches(1.0), Inches(5.7), Inches(11.3), Inches(1.1))
    tf_a = tb_alert.text_frame
    tf_a.word_wrap = True

    pa1 = tf_a.paragraphs[0]
    pa1.text = "ZERO-LATENCY ANTI-CHEATING & INTEGRITY ALERT ENGINE"
    pa1.font.size = Pt(13)
    pa1.font.bold = True
    pa1.font.color.rgb = C_ACCENT_RED

    pa2 = tf_a.add_paragraph()
    pa2.text = "CandidateMetricsEngine executes real-time anomaly detection. If multiple faces appear in camera or the candidate looks away for sustained periods (>4.5s), an instantaneous audio security alert triggers with spoken interviewer intervention ('Please focus your attention on the screen'), preventing unauthorized external assistance."
    pa2.font.size = Pt(11)
    pa2.font.color.rgb = C_TEXT_DARK

    # =========================================================================
    # SLIDE 9: Adaptive ML Assessment & Reinforcement Engine
    # =========================================================================
    slide9 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide9)
    add_header(slide9, "ML Intelligence", "Adaptive ML Assessment & Reinforcement Engine", "Multi-dimensional candidate grading and dynamic question path adaptation")

    # Left: 4 Scoring Dimensions
    add_card(slide9, Inches(0.8), Inches(2.0), Inches(5.7), Inches(4.8), border_color=C_ACCENT_GREEN)
    tb_dim = slide9.shapes.add_textbox(Inches(1.0), Inches(2.15), Inches(5.3), Inches(4.5))
    tf_dim = tb_dim.text_frame
    tf_dim.word_wrap = True

    p = tf_dim.paragraphs[0]
    p.text = "Real-Time 4-Dimensional Rubric"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_GREEN

    dims = [
        ("Relevance Score (0-100%)", "Evaluates semantic alignment with the technical question. Filters filler words and verifies that core concepts are directly addressed."),
        ("Depth Score (0-100%)", "Measures technical rigor. Distinguishes superficial surface-level buzzwords from architectural rationale, trade-off analysis, and internals."),
        ("Clarity Score (0-100%)", "Evaluates articulation efficiency, structured presentation (STAR method / modular points), and absence of rambling repetition."),
        ("Edge Cases Score (0-100%)", "Detects proactive consideration of concurrency bottlenecks, error handling, scale limits, data corruption risks, and security boundaries.")
    ]

    for title, desc in dims:
        p_t = tf_dim.add_paragraph()
        p_t.text = f"▸ {title}: "
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_DARK

    # Right: Intent Classification & Reinforcement Loop
    add_card(slide9, Inches(6.8), Inches(2.0), Inches(5.7), Inches(4.8), border_color=C_ACCENT_PURPLE)
    tb_rl = slide9.shapes.add_textbox(Inches(7.0), Inches(2.15), Inches(5.3), Inches(4.5))
    tf_rl = tb_rl.text_frame
    tf_rl.word_wrap = True

    p = tf_rl.paragraphs[0]
    p.text = "Intent Classification & Reinforcement Actions"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_PURPLE

    intents = [
        ("CLARIFICATION Intent", "Candidate asks clarifying question. Action: AI provides immediate context without penalizing candidate score."),
        ("STRONG_ANSWER Grade", "High relevance & depth. Action: AI acknowledges mastery and escalates question difficulty to probe advanced limits."),
        ("PARTIAL_ANSWER Grade", "Candidate grasped basics but missed depth. Action: AI generates targeted follow-up probe nudging missing architectural aspects."),
        ("NON_ANSWER / OFF-TOPIC", "Candidate does not know or deviates. Action: AI offers constructive scaffolding hint or gracefully moves to next topic."),
        ("Dynamic HUD Reinforcement", "Displays real-time badge (e.g. 'Probing Edge Case', 'Escalating Complexity') so candidate understands interviewer mindset.")
    ]

    for title, desc in intents:
        p_t = tf_rl.add_paragraph()
        p_t.text = f"▸ {title}: "
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_DARK

    # =========================================================================
    # SLIDE 10: Interactive Pakistan & Global Job Radar Engine
    # =========================================================================
    slide10 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide10)
    add_header(slide10, "Job Radar", "Interactive Pakistan & Global Job Radar Engine", "Geospatial mapping, live scrapers, and personalized skill-compatibility scoring")

    radar_features = [
        ("Multi-Source Live Scrapers", "careerOpsScraper.ts fetches real-time jobs from Arbeitnow, Jobicy, RemoteOK, and software houses across Pakistan.", C_ACCENT_RED),
        ("Geospatial Leaflet Mapping", "Interactive map plotting city hubs (Lahore, Karachi, Islamabad) with Haversine distance calculations from user location.", C_ACCENT_CYAN),
        ("AI Skill-Match Algorithm", "Calculates match % by parsing candidate CV against required skills (Docker, React, PostgreSQL, Kubernetes) with gap breakdown.", C_ACCENT_GREEN),
        ("Direct Application Pipeline", "Enables one-click application launch, salary benchmarks, and tailored mock interview practice for any target role.", C_ACCENT_GOLD),
    ]

    card_w10 = Inches(5.6)
    card_h10 = Inches(1.15)
    for i, (title, desc, col) in enumerate(radar_features):
        y = Inches(1.95) + i * Inches(1.23)
        add_card(slide10, Inches(0.8), y, card_w10, card_h10, border_color=col)
        
        tb = slide10.shapes.add_textbox(Inches(0.95), y + Inches(0.1), card_w10 - Inches(0.3), card_h10 - Inches(0.2))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = col

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(10)
        p2.font.color.rgb = C_TEXT_DARK

    # Right: Authentic Job Radar Screenshot
    radar_shot = "client/public/screenshots/job_radar_dashboard.png"
    add_card(slide10, Inches(6.7), Inches(1.95), Inches(5.833), Inches(4.85), border_color=C_ACCENT_CYAN)
    if os.path.exists(radar_shot):
        slide10.shapes.add_picture(radar_shot, Inches(6.85), Inches(2.1), Inches(5.533), Inches(3.22))
    
    tb_rd = slide10.shapes.add_textbox(Inches(6.85), Inches(5.42), Inches(5.533), Inches(1.25))
    tf_rd = tb_rd.text_frame
    tf_rd.word_wrap = True
    p_rd1 = tf_rd.paragraphs[0]
    p_rd1.text = "Interactive Pakistan Job Radar (Authentic Application UI)"
    p_rd1.font.size = Pt(12)
    p_rd1.font.bold = True
    p_rd1.font.color.rgb = C_ACCENT_CYAN
    p_rd2 = tf_rd.add_paragraph()
    p_rd2.text = "Live geospatial software house jobs plotted on Pakistan map with distance calculations and instant tailored mock interview triggers."
    p_rd2.font.size = Pt(10)
    p_rd2.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 11: Company Dossier Intelligence & Deep Preparation
    # =========================================================================
    slide11 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide11)
    add_header(slide11, "Company Intelligence", "Company Dossier Intelligence & Deep Preparation", "Autonomous company research, interview question prediction, and bespoke briefings")

    prep_cards = [
        ("Automated Company Research",
         "Powered by Gemini 2.5 Flash in companyPreparation.ts. Candidate enters any company name (e.g., Systems Ltd, Arbisoft, Google, Careem) or URL. Engine synthesizes tech stack, business model, recent news, and glassdoor sentiment into an executive brief.",
         "Instant Executive Brief", C_ACCENT_CYAN),
        ("Question Prediction & Archetypes",
         "Deconstructs historical interview data to forecast anticipated question distributions across 3 archetypes: 1) Core System Design & Architecture, 2) Algorithmic & Problem Solving, 3) Cultural Values & Leadership Principles.",
         "Tailored Question Sets", C_ACCENT_RED),
        ("Bespoke Preparation Checklists",
         "Generates a day-by-day customized preparation roadmap identifying exact topics the candidate must revise based on their personal resume gaps versus company tech requirements.",
         "Actionable Checklist", C_ACCENT_GREEN),
    ]

    col_w = Inches(3.7)
    for i, (title, body, tag, col) in enumerate(prep_cards):
        x = Inches(0.8) + i * (col_w + Inches(0.3))
        add_card(slide11, x, Inches(2.0), col_w, Inches(4.8), border_color=col)
        
        tb = slide11.shapes.add_textbox(x + Inches(0.2), Inches(2.2), col_w - Inches(0.4), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p_tag = tf.paragraphs[0]
        p_tag.text = tag.upper()
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = col

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE

        p_b = tf.add_paragraph()
        p_b.text = body
        p_b.font.size = Pt(12)
        p_b.font.color.rgb = C_TEXT_DARK

    # =========================================================================
    # SLIDE 12: ATS Resume Parser & Dynamic Career Roadmaps
    # =========================================================================
    slide12 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide12)
    add_header(slide12, "Resume & Career Roadmap", "ATS Resume Intelligence & Personalized Career Roadmaps", "Deep multi-format resume parsing and customized multi-week learning curricula")

    add_card(slide12, Inches(0.8), Inches(2.0), Inches(5.7), Inches(4.8), border_color=C_ACCENT_PURPLE)
    tb_ats = slide12.shapes.add_textbox(Inches(1.0), Inches(2.15), Inches(5.3), Inches(4.5))
    tf_ats = tb_ats.text_frame
    tf_ats.word_wrap = True

    p = tf_ats.paragraphs[0]
    p.text = "Multi-Format ATS Resume Engine"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_PURPLE

    ats_points = [
        ("PDF & DOCX Multi-Format Parsing", "Leverages pdf-parse, @opendataloader/pdf, and mammoth to extract structured JSON from complex multi-column resumes."),
        ("ATS Compatibility Scoring", "Audits keyword density, section headers, measurable achievements (metrics/impact), and structural formatting."),
        ("Automated Improvement Suggestions", "Generates concrete bullet rewrite recommendations transforming passive phrases into high-impact action statements."),
        ("Auto-Populated Profile", "Instantly populates user skills, certifications, work experiences, and education into the digital Career Twin.")
    ]

    for title, desc in ats_points:
        p_t = tf_ats.add_paragraph()
        p_t.text = f"▸ {title}: "
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_DARK

    add_card(slide12, Inches(6.8), Inches(2.0), Inches(5.7), Inches(4.8), border_color=C_ACCENT_CYAN)
    tb_rm = slide12.shapes.add_textbox(Inches(7.0), Inches(2.15), Inches(5.3), Inches(4.5))
    tf_rm = tb_rm.text_frame
    tf_rm.word_wrap = True

    p = tf_rm.paragraphs[0]
    p.text = "Personalized Career Roadmaps (roadmapService.ts)"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_CYAN

    rm_points = [
        ("Skill Gap Discovery", "Compares current profile skills against target industry roles to uncover high-priority missing technical competencies."),
        ("Phased Milestone Generation", "Constructs a 4-to-8 week progressive curriculum structured into Foundations, Advanced Internals, and Capstone Projects."),
        ("Interactive Matrix & Verification", "Candidates mark milestone completions, track progress bars, and trigger tailored practice interview rounds for each milestone."),
        ("Dynamic Re-Calibration", "As interview performance scores improve, the roadmap autonomously recalibrates pacing and difficulty.")
    ]

    for title, desc in rm_points:
        p_t = tf_rm.add_paragraph()
        p_t.text = f"▸ {title}: "
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_DARK

    # =========================================================================
    # SLIDE 13: Comprehensive Post-Interview Scorecards & Q&A Ledger
    # =========================================================================
    slide13 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide13)
    add_header(slide13, "Analytics & Reporting", "Evaluation Scorecards & Real-Time Q&A Ledger", "Authentic diagnostic reports with multi-axis radar charts and model answer benchmarks")

    # Left: Actual Screenshot of Report
    add_card(slide13, Inches(0.8), Inches(2.0), Inches(5.7), Inches(4.8), border_color=C_ACCENT_GREEN)
    rep_shot = "client/public/screenshots/single_report.png"
    if not os.path.exists(rep_shot):
        rep_shot = "client/public/screenshots/candidate-report-demo.png"
    if os.path.exists(rep_shot):
        slide13.shapes.add_picture(rep_shot, Inches(0.95), Inches(2.15), Inches(5.4), Inches(3.2))
    
    tb_rp = slide13.shapes.add_textbox(Inches(0.95), Inches(5.45), Inches(5.4), Inches(1.2))
    tf_rp = tb_rp.text_frame
    tf_rp.word_wrap = True
    p1 = tf_rp.paragraphs[0]
    p1.text = "Actual Live Candidate Performance Report"
    p1.font.size = Pt(12)
    p1.font.bold = True
    p1.font.color.rgb = C_ACCENT_GREEN
    p2 = tf_rp.add_paragraph()
    p2.text = "Detailed holistic scores across Technical Knowledge, Communication, Problem Solving, and Behavioral Poise with Recharts Radar visualizer."
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = C_TEXT_MUTED

    # Right: Q&A Ledger Breakdown
    add_card(slide13, Inches(6.8), Inches(2.0), Inches(5.7), Inches(4.8), border_color=C_ACCENT_GOLD)
    tb_led = slide13.shapes.add_textbox(Inches(7.0), Inches(2.15), Inches(5.3), Inches(4.5))
    tf_led = tb_led.text_frame
    tf_led.word_wrap = True

    p = tf_led.paragraphs[0]
    p.text = "Real-Time Q&A Ledger & Model Answers"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_GOLD

    led_points = [
        ("Turn-by-Turn Question Ledger", "Complete transcript of every question asked during interview with candidate's actual spoken answer recorded in clean Roman script."),
        ("Model Benchmark Answer", "AI provides an optimal 'Gold Standard' answer demonstrating ideal structure, technical terminology, and edge cases for comparison."),
        ("Key Missing Concepts", "Highlights exact architectural terms or principles the candidate omitted (e.g., 'Idempotency', 'Replication lag', 'Index selectivity')."),
        ("Strengths & Actionable Drills", "Categorizes specific positive highlights alongside immediate practice exercises to bridge performance gaps before real interviews.")
    ]

    for title, desc in led_points:
        p_t = tf_led.add_paragraph()
        p_t.text = f"▸ {title}: "
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_WHITE
        run = p_t.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_DARK

    # =========================================================================
    # SLIDE 14: Alibaba Cloud Scalability & Deployment Architecture
    # =========================================================================
    slide14 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide14)
    add_header(slide14, "Cloud Infrastructure", "Alibaba Cloud Architecture & Global Enterprise Scalability", "Optimized cloud topology for high-concurrency low-latency AI interview workloads", tag_color=C_ACCENT_ORANGE)

    cloud_pillars = [
        ("Alibaba Cloud Container Service (ACK)", "Serverless Kubernetes deployment ensures automated horizontal scaling from dozens to tens of thousands of concurrent live interview sessions during university hiring drives.", "High Concurrency ACK", C_ACCENT_ORANGE),
        ("Alibaba Cloud Model Studio Gateway", "Centralized multi-model gateway coordinating real-time multimodal live streams, lightweight NLP evaluation workers, and LLM reasoning pipelines.", "Model Studio Integration", C_ACCENT_CYAN),
        ("Low-Latency Global CDN & OSS", "Static assets, audio chunks, and video streaming cached across Alibaba Cloud Global CDN edge locations for sub-50ms regional latency across Pakistan & MENA.", "Global Edge & OSS", C_ACCENT_GREEN),
        ("Elastic Compute & Anti-DDoS Security", "Enterprise-grade protection defending candidate sessions, SSL termination, and secure OAuth credentials with automated failover and health telemetry.", "Enterprise Hardened", C_ACCENT_PURPLE),
    ]

    for i, (title, desc, badge, col) in enumerate(cloud_pillars):
        x = Inches(0.8) + (i % 2) * Inches(6.0)
        y = Inches(2.0) + (i // 2) * Inches(2.45)
        add_card(slide14, x, y, Inches(5.7), Inches(2.25), border_color=col)
        
        tb = slide14.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), Inches(5.2), Inches(1.8))
        tf = tb.text_frame
        tf.word_wrap = True

        p_b = tf.paragraphs[0]
        p_b.text = badge.upper()
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = col

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.size = Pt(14.5)
        p1.font.bold = True
        p1.font.color.rgb = C_TEXT_WHITE

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(11)
        p2.font.color.rgb = C_TEXT_DARK

    # =========================================================================
    # SLIDE 15: Strategic Roadmap & Bano Qabil Impact
    # =========================================================================
    slide15 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide15)
    add_header(slide15, "Impact & Expansion", "Bano Qabil Impact & 12-Month Expansion Roadmap", "Scaling CareerTwin AI across Alkhidmat incubation centers and global tech pipelines")

    horizons = [
        ("Phase 1: Hackathon MVP Launch (Achieved)", "Core Gemini Live 2.5 voice simulation, MediaPipe 60 FPS proctoring, Roman script engine, Job Radar, and ATS Resume parser launched.", "Q1 2026", C_ACCENT_GREEN),
        ("Phase 2: Bano Qabil 100K Student Rollout", "Official deployment across Alkhidmat Foundation Bano Qabil incubation centers in Karachi & Lahore with customized training tracks.", "Q2 2026", C_ACCENT_ORANGE),
        ("Phase 3: B2B Enterprise Recruiter Portal", "SaaS portal allowing Pakistani software houses & overseas employers to deploy automated first-round screening interviews.", "Q3 2026", C_ACCENT_CYAN),
        ("Phase 4: Multi-Agent Panels & Mobile App", "React Native mobile app + multi-agent interview simulations (simultaneous System Architect + HR Director panel).", "Q4 2026", C_ACCENT_PURPLE),
    ]

    card_w15 = Inches(5.8)
    card_h15 = Inches(1.15)
    for i, (h_title, h_desc, h_time, col) in enumerate(horizons):
        y = Inches(1.95) + i * Inches(1.23)
        add_card(slide15, Inches(0.8), y, card_w15, card_h15, border_color=col)
        
        tag = slide15.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.95), y + Inches(0.25), Inches(1.05), Inches(0.65))
        tag.fill.solid()
        tag.fill.fore_color.rgb = RGBColor(25, 36, 60)
        tag.line.color.rgb = col
        tf_t = tag.text_frame
        tf_t.vertical_anchor = MSO_ANCHOR.MIDDLE
        pt = tf_t.paragraphs[0]
        pt.text = h_time
        pt.alignment = PP_ALIGN.CENTER
        pt.font.size = Pt(10)
        pt.font.bold = True
        pt.font.color.rgb = col

        tb = slide15.shapes.add_textbox(Inches(2.15), y + Inches(0.1), card_w15 - Inches(1.4), card_h15 - Inches(0.2))
        tf = tb.text_frame
        tf.word_wrap = True

        p1 = tf.paragraphs[0]
        p1.text = h_title
        p1.font.size = Pt(12.5)
        p1.font.bold = True
        p1.font.color.rgb = C_TEXT_WHITE

        p2 = tf.add_paragraph()
        p2.text = h_desc
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = C_TEXT_DARK

    # Right: Authentic Platform Progression Screenshot & Impact Grid
    add_card(slide15, Inches(6.9), Inches(1.95), Inches(5.633), Inches(3.2), border_color=C_ACCENT_ORANGE)
    dash_shot = "client/public/screenshots/dashboard_hero.png"
    if os.path.exists(dash_shot):
        slide15.shapes.add_picture(dash_shot, Inches(7.05), Inches(2.08), Inches(5.333), Inches(2.3))
    
    tb_imp = slide15.shapes.add_textbox(Inches(7.05), Inches(4.42), Inches(5.333), Inches(0.7))
    tf_imp = tb_imp.text_frame
    tf_imp.word_wrap = True
    p_im1 = tf_imp.paragraphs[0]
    p_im1.text = "Alkhidmat Bano Qabil Incubator Scalability Model"
    p_im1.font.size = Pt(11)
    p_im1.font.bold = True
    p_im1.font.color.rgb = C_ACCENT_ORANGE
    p_im2 = tf_imp.add_paragraph()
    p_im2.text = "10-stage autonomous training path tailored for Pakistani university graduates."
    p_im2.font.size = Pt(9)
    p_im2.font.color.rgb = C_TEXT_MUTED

    # Bottom Right 2x2 Metrics Cards
    metrics_data = [
        ("100K+", "Target Students", C_ACCENT_ORANGE),
        ("8", "Regional Languages", C_ACCENT_CYAN),
        ("$0", "Beta Student Cost", C_ACCENT_GREEN),
        ("78%", "Gross Margin", C_ACCENT_PURPLE),
    ]
    mw = Inches(2.65)
    mh = Inches(0.68)
    for idx, (m_val, m_lbl, m_col) in enumerate(metrics_data):
        mx = Inches(6.9) + (idx % 2) * Inches(2.98)
        my = Inches(5.35) + (idx // 2) * Inches(0.82)
        add_card(slide15, mx, my, mw, mh, border_color=m_col)
        tb_m = slide15.shapes.add_textbox(mx + Inches(0.1), my + Inches(0.05), mw - Inches(0.2), mh - Inches(0.1))
        tf_m = tb_m.text_frame
        tf_m.word_wrap = True
        pm1 = tf_m.paragraphs[0]
        pm1.text = f"{m_val} — "
        pm1.font.size = Pt(13)
        pm1.font.bold = True
        pm1.font.color.rgb = m_col
        rm = pm1.add_run()
        rm.text = m_lbl
        rm.font.size = Pt(10.5)
        rm.font.color.rgb = C_TEXT_WHITE

    # =========================================================================
    # SLIDE 16: Grand Finale & Call to Action
    # =========================================================================
    slide16 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide16)

    # Decorative top bar
    glow16 = slide16.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.12))
    glow16.fill.solid()
    glow16.fill.fore_color.rgb = C_ACCENT_RED
    glow16.line.fill.background()

    # Center Card
    center_card = add_card(slide16, Inches(1.4), Inches(0.6), Inches(10.533), Inches(6.3), border_color=C_ACCENT_RED)

    # Avatar on top of center card
    avatar_path = "client/public/interviewer-avatar.jpg"
    if os.path.exists(avatar_path):
        slide16.shapes.add_picture(avatar_path, Inches(5.866), Inches(0.85), Inches(1.6), Inches(1.6))

    tb_end = slide16.shapes.add_textbox(Inches(1.8), Inches(2.55), Inches(9.733), Inches(4.2))
    tf_end = tb_end.text_frame
    tf_end.word_wrap = True

    pe0 = tf_end.paragraphs[0]
    pe0.text = "ALIBABA CLOUD × BANO QABIL AI HACKATHON 2026"
    pe0.alignment = PP_ALIGN.CENTER
    pe0.font.size = Pt(12)
    pe0.font.bold = True
    pe0.font.color.rgb = C_ACCENT_ORANGE

    pe1 = tf_end.add_paragraph()
    pe1.text = "CAREERTWIN AI"
    pe1.alignment = PP_ALIGN.CENTER
    pe1.font.size = Pt(32)
    pe1.font.bold = True
    pe1.font.color.rgb = C_TEXT_WHITE

    pe2 = tf_end.add_paragraph()
    pe2.text = "Transforming 100,000+ Ambitious Youth Into World-Class Engineering Hires"
    pe2.alignment = PP_ALIGN.CENTER
    pe2.font.size = Pt(16)
    pe2.font.bold = True
    pe2.font.color.rgb = C_ACCENT_CYAN

    pe3 = tf_end.add_paragraph()
    pe3.text = "\nBy synthesizing multimodal voice simulation, computer vision proctoring, reinforcement question intelligence, and hyper-localized job discovery, CareerTwin AI dismantles the socioeconomic barriers to elite tech careers for youth in Pakistan and worldwide."
    pe3.alignment = PP_ALIGN.CENTER
    pe3.font.size = Pt(11.5)
    pe3.font.color.rgb = C_TEXT_MUTED

    pe4 = tf_end.add_paragraph()
    pe4.text = "\n🚀 Live Interactive Demonstration Ready  •  Open For Judges Q&A"
    pe4.alignment = PP_ALIGN.CENTER
    pe4.font.size = Pt(14)
    pe4.font.bold = True
    pe4.font.color.rgb = C_ACCENT_GREEN

    # Save presentation
    prs.save(output_path)
    print(f"Successfully generated {output_path} with {len(prs.slides)} slides.")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "CareerTwin_AI_Master_Presentation.pptx"
    build_presentation(out)
