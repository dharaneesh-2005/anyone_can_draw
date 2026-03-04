import { useRef, useState, useEffect, useCallback } from 'react';
import './CameraOverlay.css';

function CameraOverlay({ imageUrl, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isLocked, setIsLocked] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  // Transform state: x, y are the center position of the image
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  });
  
  // Opacity state for overlay image transparency
  const [opacity, setOpacity] = useState(80);
  
  // Grid overlay toggle
  const [showGrid, setShowGrid] = useState(false);
  
  // Micro-adjustment step size (1px, 5px, 10px)
  const [stepSize, setStepSize] = useState(5);

  // Flip state for overlay image
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Gesture tracking
  const gestureRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialTransform: null,
    initialDistance: 0,
    initialAngle: 0,
    pointers: new Map()
  });

  // Start camera and enter fullscreen
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        alert('Camera access is required for this feature. Please allow camera permissions.');
      }
    };

    startCamera();
    
    // Enter fullscreen after a short delay to ensure component is mounted
    setTimeout(() => {
      const elem = document.documentElement;
      if (document.fullscreenEnabled) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      }
    }, 100);

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Center image initially when imageUrl changes
  useEffect(() => {
    if (containerRef.current && imageUrl) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({
        x: rect.width / 2,
        y: rect.height / 2,
        scale: 1,
        rotation: 0
      });
    }
  }, [imageUrl]);

  // Get distance between two points
  const getDistance = (p1, p2) => {
    return Math.sqrt(
      Math.pow(p2.clientX - p1.clientX, 2) + 
      Math.pow(p2.clientY - p1.clientY, 2)
    );
  };

  // Get angle between two points
  const getAngle = (p1, p2) => {
    return Math.atan2(
      p2.clientY - p1.clientY,
      p2.clientX - p1.clientX
    ) * (180 / Math.PI);
  };

  // Handle pointer down
  const handlePointerDown = useCallback((e) => {
    if (isLocked) return;
    e.preventDefault();
    
    const pointers = gestureRef.current.pointers;
    pointers.set(e.pointerId, e);
    
    if (pointers.size === 1) {
      // Single touch - pan
      gestureRef.current.isDragging = true;
      gestureRef.current.startX = e.clientX;
      gestureRef.current.startY = e.clientY;
      gestureRef.current.initialTransform = { ...transform };
    } else if (pointers.size === 2) {
      // Two touches - pinch/rotate
      const pointerArray = Array.from(pointers.values());
      gestureRef.current.initialDistance = getDistance(pointerArray[0], pointerArray[1]);
      gestureRef.current.initialAngle = getAngle(pointerArray[0], pointerArray[1]);
      gestureRef.current.initialTransform = { ...transform };
    }
  }, [isLocked, transform]);

  // Handle pointer move
  const handlePointerMove = useCallback((e) => {
    if (isLocked) return;
    e.preventDefault();
    
    const pointers = gestureRef.current.pointers;
    if (!pointers.has(e.pointerId)) return;
    
    pointers.set(e.pointerId, e);
    
    if (pointers.size === 1 && gestureRef.current.isDragging) {
      // Pan - update position directly
      const dx = e.clientX - gestureRef.current.startX;
      const dy = e.clientY - gestureRef.current.startY;
      
      setTransform(prev => ({
        ...prev,
        x: gestureRef.current.initialTransform.x + dx,
        y: gestureRef.current.initialTransform.y + dy
      }));
    } else if (pointers.size === 2) {
      // Pinch and rotate
      const pointerArray = Array.from(pointers.values());
      const currentDistance = getDistance(pointerArray[0], pointerArray[1]);
      const currentAngle = getAngle(pointerArray[0], pointerArray[1]);
      
      const scale = (currentDistance / gestureRef.current.initialDistance) * 
                    gestureRef.current.initialTransform.scale;
      const rotation = currentAngle - gestureRef.current.initialAngle + 
                       gestureRef.current.initialTransform.rotation;
      
      setTransform(prev => ({
        ...prev,
        scale: Math.max(0.1, Math.min(scale, 5)),
        rotation
      }));
    }
  }, [isLocked]);

  // Handle pointer up
  const handlePointerUp = useCallback((e) => {
    gestureRef.current.pointers.delete(e.pointerId);
    
    if (gestureRef.current.pointers.size === 0) {
      gestureRef.current.isDragging = false;
    }
  }, []);

  // Handle wheel for zoom
  const handleWheel = useCallback((e) => {
    if (isLocked) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(prev.scale * delta, 5))
    }));
  }, [isLocked]);

  // Toggle lock
  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  // Toggle flip
  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Reset transform
  const resetTransform = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({
        x: rect.width / 2,
        y: rect.height / 2,
        scale: 1,
        rotation: 0
      });
    }
  };

  // Micro-adjustment functions for precise positioning
  const nudgeUp = () => {
    setTransform(prev => ({ ...prev, y: prev.y - stepSize }));
  };

  const nudgeDown = () => {
    setTransform(prev => ({ ...prev, y: prev.y + stepSize }));
  };

  const nudgeLeft = () => {
    setTransform(prev => ({ ...prev, x: prev.x - stepSize }));
  };

  const nudgeRight = () => {
    setTransform(prev => ({ ...prev, x: prev.x + stepSize }));
  };

  // Toggle grid overlay
  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  // Calculate transform style - use left/top for position, transform for scale/rotate/flip
  const imageStyle = {
    left: `${transform.x}px`,
    top: `${transform.y}px`,
    transform: `translate(-50%, -50%) scale(${transform.scale}) rotate(${transform.rotation}deg) scaleX(${isFlipped ? -1 : 1})`,
    opacity: opacity / 100,
  };

  return (
    <div className="camera-overlay">
      {/* Full screen camera video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`camera-video ${cameraActive ? 'active' : ''}`}
      />
      
      {/* Camera not active placeholder */}
      {!cameraActive && (
        <div className="camera-placeholder">
          <p>Camera not available</p>
        </div>
      )}
      
      {/* Overlay container for gestures */}
      <div
        ref={containerRef}
        className="overlay-container"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Generated image with transforms */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Generated overlay"
            className={`overlay-image ${isLocked ? 'locked' : ''}`}
            style={imageStyle}
            draggable={false}
          />
        )}
        
        {/* Grid Overlay for precise alignment */}
        {showGrid && (
          <div className="grid-overlay">
            <div className="grid-lines" />
            <div className="grid-center-crosshair" />
          </div>
        )}
      </div>
      
      {/* Controls - all in a single horizontal row at top */}
      <div className="overlay-controls">
        {/* Lock button */}
        <button
          className={`control-btn lock-btn ${isLocked ? 'locked' : ''}`}
          onClick={toggleLock}
          title={isLocked ? 'Unlock image' : 'Lock image position'}
        >
          {isLocked ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          )}
        </button>

        {/* Flip button */}
        <button
          className={`control-btn flip-btn ${isFlipped ? 'active' : ''}`}
          onClick={toggleFlip}
          title={isFlipped ? 'Unflip image' : 'Flip image horizontally'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20V4M5 12l7-7 7 7" transform="rotate(90 12 12)" />
            <path d="M3 12h18" />
          </svg>
        </button>
        
        {/* Reset button */}
        <button
          className="control-btn reset-btn"
          onClick={resetTransform}
          title="Reset position"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        {/* Grid toggle button */}
        <button
          className={`control-btn grid-btn ${showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
          title={showGrid ? 'Hide grid' : 'Show grid'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
        </button>

        {/* Close button */}
        <button
          className="control-btn close-btn"
          onClick={onClose}
          title="Close camera"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      
      {/* Transparency Slider */}
      <div className="transparency-slider-container">
        <label htmlFor="camera-opacity">Opacity: {opacity}%</label>
        <input
          id="camera-opacity"
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="camera-transparency-slider"
        />
      </div>

      {/* Micro-adjustment Controls for precise positioning - hidden when locked */}
      {!isLocked && (
        <div className="micro-adjustment-panel">
          <div className="step-size-selector">
            <label>Step:</label>
            <div className="step-buttons">
              {[1, 5, 10].map(size => (
                <button
                  key={size}
                  className={`step-btn ${stepSize === size ? 'active' : ''}`}
                  onClick={() => setStepSize(size)}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
          <div className="nudge-controls">
            <button className="nudge-btn" onClick={nudgeUp} title="Move up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
            <div className="nudge-row">
              <button className="nudge-btn" onClick={nudgeLeft} title="Move left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="nudge-btn" onClick={nudgeRight} title="Move right">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button className="nudge-btn" onClick={nudgeDown} title="Move down">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="overlay-instructions">
        <p>👆 Drag to move • 🤏 Pinch to zoom/rotate</p>
      </div>
      
      {/* Lock indicator */}
      {isLocked && (
        <div className="lock-indicator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Locked</span>
        </div>
      )}
    </div>
  );
}

export default CameraOverlay;
