import { useRef, useState, useEffect, useCallback } from 'react';
import './CameraOverlay.css';

function CameraOverlay({ imageUrl, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isLocked, setIsLocked] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [focusIndicator, setFocusIndicator] = useState(null);
  
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

  // Controls collapsed state
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  // Camera track ref for focus control
  const trackRef = useRef(null);
  
  // Gesture tracking
  const gestureRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialTransform: null,
    initialDistance: 0,
    initialAngle: 0,
    pointers: new Map(),
    hasMoved: false
  });

  // Start camera and enter fullscreen
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            // Request maximum resolution for sharp image
            width: { ideal: 3840, min: 1920 },
            height: { ideal: 2160, min: 1080 },
            // Enable continuous autofocus if available
            focusMode: 'continuous'
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
          // Save the video track for focus control
          const videoTrack = stream.getVideoTracks()[0];
          trackRef.current = videoTrack;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        alert('Camera access is required for this feature. Please allow camera permissions.');
      }
    };

    startCamera();

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
    // Store pointer with start time and position for tap detection
    pointers.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now()
    });
    
    // Reset hasMoved flag on new gesture
    gestureRef.current.hasMoved = false;
    
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
    
    const pointerData = pointers.get(e.pointerId);
    // Update current position while preserving start data
    pointerData.clientX = e.clientX;
    pointerData.clientY = e.clientY;
    pointers.set(e.pointerId, pointerData);
    
    // Check if movement exceeds tap threshold (10px tolerance)
    const dx = Math.abs(e.clientX - pointerData.startX);
    const dy = Math.abs(e.clientY - pointerData.startY);
    if (dx > 10 || dy > 10) {
      gestureRef.current.hasMoved = true;
    }
    
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
    const pointers = gestureRef.current.pointers;
    
    // Get pointer data before deleting
    const pointerData = pointers.get(e.pointerId);
    const wasFirstPointer = pointerData && pointers.size === 1;
    
    // Check if this was a tap (minimal movement and quick release)
    let wasTap = false;
    if (pointerData && wasFirstPointer && !gestureRef.current.hasMoved) {
      const tapDuration = Date.now() - pointerData.startTime;
      // Allow taps up to 300ms (more forgiving for touch devices)
      wasTap = tapDuration < 300;
    }
    
    pointers.delete(e.pointerId);
    
    const remainingPointers = Array.from(pointers.values());
    
    if (remainingPointers.length === 0) {
      // All fingers lifted - reset dragging state
      gestureRef.current.isDragging = false;
      gestureRef.current.hasMoved = false;
      
      // If it was a tap, trigger focus
      if (wasTap && !isLocked && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        console.log('Tap detected at:', x, y);
        showFocusIndicator(x, y);
        applyCameraFocus(x, y);
      }
    } else if (remainingPointers.length === 1) {
      // Transition from 2 fingers to 1 finger
      // Reset the gesture tracking to prevent jump
      const remainingPointer = remainingPointers[0];
      gestureRef.current.isDragging = true;
      gestureRef.current.startX = remainingPointer.clientX;
      gestureRef.current.startY = remainingPointer.clientY;
      // Save current transform as the new initial transform
      gestureRef.current.initialTransform = { ...transform };
    }
    // If 2+ fingers remain, pinch/rotate continues normally
  }, [transform, isLocked]);

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

  // Apply focus to camera at specific point (center of screen or tap point)
  const applyCameraFocus = async (pointX = null, pointY = null) => {
    const track = trackRef.current;
    if (!track) {
      console.log('No camera track available');
      return;
    }

    try {
      const capabilities = track.getCapabilities();
      console.log('Camera capabilities:', capabilities);
      
      // Check if focus mode is supported
      if (!capabilities.focusMode || capabilities.focusMode.length === 0) {
        console.log('Focus mode not supported on this device');
        return;
      }

      // Get video element dimensions
      const video = videoRef.current;
      const container = containerRef.current;
      if (!video || !container) return;

      const videoRect = video.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate the position relative to the video element
      // The video may be cropped (object-fit: cover), so we need to account for that
      const x = pointX !== null ? pointX : containerRect.width / 2;
      const y = pointY !== null ? pointY : containerRect.height / 2;

      // Convert to normalized coordinates (0-1) based on the displayed video size
      const normalizedX = Math.max(0, Math.min(1, x / containerRect.width));
      const normalizedY = Math.max(0, Math.min(1, y / containerRect.height));

      console.log('Focusing at normalized coordinates:', normalizedX, normalizedY);

      // Build constraints object
      const constraints = {};

      // If pointsOfInterest is supported, set the focus point FIRST
      if (capabilities.pointsOfInterest) {
        constraints.pointsOfInterest = [{ x: normalizedX, y: normalizedY }];
      }

      // Set focus mode to single-shot to trigger focus at the specified point
      if (capabilities.focusMode.includes('single-shot')) {
        constraints.focusMode = 'single-shot';
      } else if (capabilities.focusMode.includes('continuous')) {
        // Fallback to continuous if single-shot not available
        constraints.focusMode = 'continuous';
      }

      // Apply all constraints together
      if (Object.keys(constraints).length > 0) {
        try {
          await track.applyConstraints(constraints);
          console.log('Applied focus constraints:', constraints);
        } catch (e) {
          console.log('Could not apply focus constraints:', e);
        }
      }

    } catch (err) {
      console.error('Error applying focus:', err);
    }
  };

  // Lock focus - use single-shot to lock focus at current position (prevents continuous hunting)
  const lockCameraFocus = async () => {
    const track = trackRef.current;
    if (!track) return;

    try {
      const capabilities = track.getCapabilities();
      if (!capabilities.focusMode) return;

      // Use single-shot mode to lock focus at current position
      // This prevents the continuous autofocus from "hunting" and causing blur
      // single-shot focuses once and holds, unlike "manual" which can cause issues on many devices
      if (capabilities.focusMode.includes('single-shot')) {
        await track.applyConstraints({
          focusMode: 'single-shot'
        });
        console.log('Focus locked (single-shot mode)');
      } else {
        console.log('Single-shot focus not supported for locking');
      }
    } catch (err) {
      console.error('Error locking focus:', err);
    }
  };

  // Enable continuous autofocus (when unlocking)
  const enableAutoFocus = async () => {
    const track = trackRef.current;
    if (!track) return;

    try {
      const capabilities = track.getCapabilities();
      if (!capabilities.focusMode) return;

      // Check if continuous focus is supported
      if (capabilities.focusMode.includes('continuous')) {
        await track.applyConstraints({
          focusMode: 'continuous'
        });
        console.log('Auto-focus enabled (continuous mode)');
      } else {
        console.log('Continuous focus not supported');
      }
    } catch (err) {
      console.error('Error enabling autofocus:', err);
    }
  };

  // Toggle lock - also controls camera focus
  const toggleLock = async () => {
    const newLockedState = !isLocked;
    setIsLocked(newLockedState);

    if (newLockedState) {
      // Locking: apply focus to center, then lock it
      await applyCameraFocus();
      // Small delay to let focus settle, then lock it
      setTimeout(async () => {
        await lockCameraFocus();
      }, 300);
    } else {
      // Unlocking: re-enable continuous autofocus
      await enableAutoFocus();
    }
  };

  // Show visual feedback for focus point
  const showFocusIndicator = (x, y) => {
    setFocusIndicator({ x, y });
    // Keep indicator visible longer (2 seconds) for better feedback
    setTimeout(() => setFocusIndicator(null), 2000);
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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log('Exit fullscreen error:', err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
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

        {/* Focus indicator */}
        {focusIndicator && (
          <div
            className="focus-indicator"
            style={{
              left: `${focusIndicator.x}px`,
              top: `${focusIndicator.y}px`
            }}
          />
        )}
      </div>
      
      {/* Collapsible Controls - positioned at top right */}
      <div className={`overlay-controls ${controlsCollapsed ? 'collapsed' : ''}`}>
        {/* Collapse/Expand toggle button */}
        <button
          className="control-btn collapse-btn"
          onClick={() => setControlsCollapsed(!controlsCollapsed)}
          title={controlsCollapsed ? 'Expand controls' : 'Collapse controls'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="collapse-icon">
            {controlsCollapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>

        {!controlsCollapsed && (
          <>
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

            {/* Fullscreen button */}
            <button
              className="control-btn fullscreen-btn"
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>

            {/* Close button */}
            <button
              className="control-btn close-btn"
              onClick={() => {
                if (document.fullscreenElement) {
                  if (document.exitFullscreen) {
                    document.exitFullscreen().catch(err => console.log('Exit fullscreen error:', err));
                  } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                  } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                  }
                }
                onClose();
              }}
              title="Close camera"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
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
          {/* Step indicator pill */}
          <div className="step-indicator" onClick={() => setStepSize(stepSize === 1 ? 5 : stepSize === 5 ? 10 : 1)} title="Click to change step size">
            {stepSize}px
          </div>
          {/* Glassmorphism arrow controls */}
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
      )}

      {/* Instructions */}
      <div className="overlay-instructions">
        <p>👆 Drag to move • 🤏 Pinch to zoom • 👆 Tap to focus • 🔒 Lock to freeze</p>
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
