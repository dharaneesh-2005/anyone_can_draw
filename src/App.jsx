import { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import LoadingOverlay from './components/LoadingOverlay';
import comfyuiService from './services/comfyuiService';
import workflow from '../cartoon_Style.json';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);

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
  };

  return (
    <div className="app">
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
            <button className="reset-btn" onClick={handleReset}>
              Upload New Photo
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <ResultDisplay
          originalImage={selectedImage}
          resultImage={resultImage}
        />
      </main>

      {isProcessing && <LoadingOverlay message={progressMessage} />}

      <footer className="app-footer">
        <p>Powered by ComfyUI • Flux 2 • Anyone Can Draw</p>
      </footer>
    </div>
  );
}

export default App;
