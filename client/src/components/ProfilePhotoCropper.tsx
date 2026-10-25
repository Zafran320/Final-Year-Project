import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

const CROP_SIZE = 640;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Point = { x: number; y: number };

type ProfilePhotoCropperProps = {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export function ProfilePhotoCropper({ file, busy = false, onCancel, onConfirm }: ProfilePhotoCropperProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ pointer: Point; offset: Point } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!sourceUrl) return;
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.onerror = () => setImage(null);
    nextImage.src = sourceUrl;
    return () => {
      nextImage.onload = null;
      nextImage.onerror = null;
    };
  }, [sourceUrl]);

  const reset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const getCanvasPoint = (event: React.PointerEvent) => {
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const startDrag = (event: React.PointerEvent) => {
    if (busy || !image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointer: getCanvasPoint(event), offset };
    setDragging(true);
  };

  const moveDrag = (event: React.PointerEvent) => {
    if (!dragStart.current) return;
    const point = getCanvasPoint(event);
    setOffset({ x: dragStart.current.offset.x + (point.x - dragStart.current.pointer.x), y: dragStart.current.offset.y + (point.y - dragStart.current.pointer.y) });
  };

  const endDrag = () => {
    dragStart.current = null;
    setDragging(false);
  };

  const confirm = () => {
    if (!image || busy) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#16161c";
    context.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
    const coverScale = Math.max(CROP_SIZE / image.naturalWidth, CROP_SIZE / image.naturalHeight) * zoom;
    context.save();
    context.translate(CROP_SIZE / 2 + offset.x * (CROP_SIZE / 320), CROP_SIZE / 2 + offset.y * (CROP_SIZE / 320));
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(image, -(image.naturalWidth * coverScale) / 2, -(image.naturalHeight * coverScale) / 2, image.naturalWidth * coverScale, image.naturalHeight * coverScale);
    context.restore();
    canvas.toBlob((blob) => {
      if (!blob) return;
      onConfirm(new File([blob], "profile-photo.jpg", { type: "image/jpeg", lastModified: Date.now() }));
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="ct-photo-cropper" role="dialog" aria-modal="true" aria-labelledby="photo-crop-title">
      <div className="ct-photo-cropper-head"><div><span className="ct-home-eyebrow"><span /> Adjust photo</span><h2 id="photo-crop-title">Frame your profile photo.</h2><p>Drag the image to position it. Your photo is cropped into a circle before it is uploaded.</p></div><button ref={closeButtonRef} type="button" className="ct-photo-cropper-close" onClick={onCancel} disabled={busy} aria-label="Cancel photo adjustment">×</button></div>
      <div ref={previewRef} className={`ct-photo-cropper-stage${dragging ? " is-dragging" : ""}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={endDrag} role="img" aria-label="Profile photo crop preview. Drag to reposition the image.">
        {image ? <img src={sourceUrl} alt="" draggable={false} style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg) scale(${zoom})` }} /> : <span>Preparing preview…</span>}
        <i aria-hidden="true" />
      </div>
      <div className="ct-photo-cropper-proof" aria-label="Live crop thumbnail">
        <div className="ct-photo-cropper-proof-copy"><span className="ct-photo-cropper-kicker">Live thumbnail</span><strong>Your profile icon</strong><p>This small preview follows every adjustment before you upload.</p></div>
        <div className="ct-photo-cropper-thumbnail" role="img" aria-label="Live circular profile photo thumbnail">
          {image ? <img src={sourceUrl} alt="" draggable={false} style={{ transform: `translate(calc(-50% + ${offset.x * 0.28}px), calc(-50% + ${offset.y * 0.28}px)) rotate(${rotation}deg) scale(${zoom})` }} /> : <span>…</span>}
        </div>
      </div>
      <div className="ct-photo-cropper-controls">
        <label htmlFor="photo-zoom"><span><ZoomOut size={14} /> Zoom</span><input id="photo-zoom" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={busy} aria-valuetext={`${Math.round(zoom * 100)} percent`} /><span className="ct-photo-cropper-value">{Math.round(zoom * 100)}%</span><ZoomIn size={14} /></label>
        <div className="ct-photo-cropper-rotate"><span>Rotate</span><button type="button" onClick={() => setRotation((current) => (current + 270) % 360)} disabled={busy} aria-label="Rotate photo left"><ChevronLeft size={17} /></button><strong>{rotation}°</strong><button type="button" onClick={() => setRotation((current) => (current + 90) % 360)} disabled={busy} aria-label="Rotate photo right"><ChevronRight size={17} /></button><button type="button" className="ct-photo-reset" onClick={reset} disabled={busy}><RotateCcw size={14} /> Reset</button></div>
      </div>
      <div className="ct-photo-cropper-actions"><button type="button" className="ct-button ct-button--secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="ct-button" onClick={confirm} disabled={!image || busy}>{busy ? "Uploading…" : <><Check size={16} /> Use this photo</>}</button></div>
    </div>
  );
}
