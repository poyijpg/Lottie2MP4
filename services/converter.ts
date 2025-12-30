import lottie, { AnimationItem } from 'lottie-web';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { ConvertOptions, LottieFile, Resolution } from '../types';

const getDimensions = (res: Resolution, originalW: number, originalH: number) => {
  let targetW = 1920;
  let targetH = 1080;

  switch (res) {
    case Resolution.HD:
      targetW = 1280;
      targetH = 720;
      break;
    case Resolution.FHD:
      targetW = 1920;
      targetH = 1080;
      break;
    case Resolution.UHD:
      targetW = 3840;
      targetH = 2160;
      break;
  }
  
  // Ensure dimensions are even numbers (required by many codecs)
  if (targetW % 2 !== 0) targetW--;
  if (targetH % 2 !== 0) targetH--;

  return { w: targetW, h: targetH };
};

// Helper to load an image from a source URL/Blob
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

export const renderAndConvert = async (
  animationData: LottieFile,
  options: ConvertOptions,
  onProgress: (msg: string, percent: number) => void
): Promise<string> => {
  const { resolution, fps } = options;
  const { w, h } = getDimensions(resolution, animationData.w, animationData.h);

  if (typeof VideoEncoder === 'undefined') {
    throw new Error("Your browser does not support the WebCodecs API. Please use the latest Chrome or Edge.");
  }

  // --- SVG RENDERER SETUP (HIGH FIDELITY) ---
  
  // 1. Create a hidden container for the SVG renderer
  const container = document.createElement('div');
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  // We need the container in the DOM for lottie to attach
  document.body.appendChild(container);

  // 2. Output Canvas (We compose White BG + SVG Image here)
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { 
    alpha: false, // Opaque output
    willReadFrequently: true 
  });
  
  if (!ctx) {
    document.body.removeChild(container);
    throw new Error("Could not create canvas context");
  }

  // 3. Load Animation using SVG Renderer
  // This is slower but supports ALL Lottie/Jitter features (masks, gaussian blur, etc.)
  const anim: AnimationItem = lottie.loadAnimation({
    container: container,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid meet',
      // We do NOT use progressiveLoad to ensure frames are fully ready
    },
  });

  // Wait for initial load
  await new Promise((resolve) => {
    if (anim.isLoaded) resolve(true);
    anim.addEventListener('DOMLoaded', resolve);
  });
  
  // Extra buffer to ensure external assets are loaded
  await new Promise(r => setTimeout(r, 800));

  try {
    const fr = anim.frameRate || 30;
    const durationSeconds = (anim.totalFrames / fr);
    const totalOutputFrames = Math.ceil(durationSeconds * fps);
    
    if (totalOutputFrames <= 0) throw new Error("Invalid animation duration.");

    onProgress(`Initializing High-Fidelity Encoder (${resolution} @ ${fps}fps)...`, 5);

    // Setup Muxer
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc', 
        width: w,
        height: h
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset', 
    });

    // Configure Encoder (H.264)
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        console.error("VideoEncoder error:", e);
        throw new Error(`Encoding failed: ${e.message}`);
      }
    });

    // Attempt High Profile (Best Quality) -> Fallback to Main
    const highProfileConfig = {
      codec: 'avc1.640033', // High Profile, Level 5.1
      width: w,
      height: h,
      bitrate: resolution === Resolution.UHD ? 40_000_000 : 15_000_000,
      framerate: fps,
    };
    
    const mainProfileConfig = {
      codec: 'avc1.4d002a', // Main Profile, Level 4.2
      width: w,
      height: h,
      bitrate: 10_000_000,
      framerate: fps,
    };

    let selectedConfig = mainProfileConfig;
    try {
        const support = await VideoEncoder.isConfigSupported(highProfileConfig);
        if (support.supported) selectedConfig = highProfileConfig;
    } catch (e) {
        console.warn("Config check failed, using default.", e);
    }

    videoEncoder.configure(selectedConfig);

    onProgress(`Processing ${totalOutputFrames} frames (SVG Mode)...`, 10);

    const frameIntervalMicroseconds = 1_000_000 / fps;
    const serializer = new XMLSerializer();

    for (let i = 0; i < totalOutputFrames; i++) {
      
      // 1. Advance Lottie Frame
      const lottieFrame = (i / totalOutputFrames) * anim.totalFrames;
      anim.goToAndStop(lottieFrame, true);
      
      // 2. Extract SVG Node
      const svgElement = container.querySelector('svg');
      if (!svgElement) throw new Error("SVG element not found during render");

      // 3. Force correct dimensions and Namespace on the SVG to prevent rendering issues
      svgElement.setAttribute('width', `${w}px`);
      svgElement.setAttribute('height', `${h}px`);
      
      // 4. Serialize to XML String
      let svgData = serializer.serializeToString(svgElement);
      
      // FIX: Ensure XML Namespace exists for Blob rendering
      if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // 5. Create Blob URL
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // 6. Rasterize to Canvas
      const img = await loadImage(url);
      
      // A. Fill White Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      
      // B. Draw SVG Image
      ctx.drawImage(img, 0, 0, w, h);
      
      // Cleanup memory immediately
      URL.revokeObjectURL(url);

      // 7. Encode Frame
      const timestamp = Math.round(i * frameIntervalMicroseconds);
      const frame = new VideoFrame(canvas, { timestamp });
      
      const keyFrame = i % (fps * 2) === 0;
      videoEncoder.encode(frame, { keyFrame });
      frame.close(); 

      // Update UI & Yield
      if (i % 5 === 0 || i === totalOutputFrames - 1) {
        const pct = 10 + Math.round((i / totalOutputFrames) * 85);
        onProgress(`Processing frame ${i + 1}/${totalOutputFrames}`, pct);
        // Small delay to allow UI updates and garbage collection
        await new Promise(r => setTimeout(r, 0));
      }
    }

    onProgress('Finalizing Video...', 98);

    await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    
    return URL.createObjectURL(blob);

  } catch (err) {
    console.error("Conversion Logic Error:", err);
    throw err;
  } finally {
    if (anim) anim.destroy();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};