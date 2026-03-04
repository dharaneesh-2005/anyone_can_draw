import { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import LoadingOverlay from './components/LoadingOverlay';
import CameraOverlay from './components/CameraOverlay';
import comfyuiService from './services/comfyuiService';
import workflow from '../cartoon_Style.json';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleImageSelect = useCallback((file) => {
    setSelectedImage(file);
    setResultImage(null);
    setError(null);
  }, []);

  const handleGenerate = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgressMessage('Starting...');

    try {
      const resultUrl = await comfyuiService.executeWorkflow(
        selectedImage,
        workflow,
        (message) => setProgressMessage(message)
      );
      setResultImage(resultUrl);
    } catch (err) {
      setError(err.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgressMessage('');
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResultImage(null);
    setError(null);
    setShowCamera(false);
  };

  const handleOpenCamera = () => {
    // Enter fullscreen when opening camera (must be triggered by user gesture)
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
    setShowCamera(true);
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
  };

  return (
    <div className="app">
      {!showCamera ? (
        <>
          <header className="app-header">
            <h1>Anyone Can Draw</h1>
            <p className="tagline">Transform your photos into beautiful line art</p>
          </header>

          <main className="app-main">
            <div className="upload-section">
              <ImageUploader
                onImageSelect={handleImageSelect}
                selectedImage={selectedImage}
              />

              {selectedImage && !resultImage && (
                <button
                  className="generate-btn"
                  onClick={handleGenerate}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Generate Line Art'}
                </button>
              )}

              {resultImage && (
                <div className="result-actions">
                  <button className="camera-btn" onClick={handleOpenCamera}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Open Camera
                  </button>
                  <button className="reset-btn" onClick={handleReset}>
                    Upload New Photo
                  </button>
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <ResultDisplay
              originalImage={selectedImage}
              resultImage={resultImage}
            />
          </main>

          <footer className="app-footer">
            <p>Powered by ComfyUI • Flux 2 • Anyone Can Draw</p>
          </footer>
        </>
      ) : (
        <CameraOverlay
          imageUrl={resultImage}
          onClose={handleCloseCamera}
        />
      )}

      {isProcessing && <LoadingOverlay message={progressMessage} />}
    </div>
  );
}

export default App;
