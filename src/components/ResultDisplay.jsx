import './ResultDisplay.css';

function ResultDisplay({ originalImage, resultImage }) {
  if (!originalImage) {
    return null;
  }

  const originalUrl = originalImage ? URL.createObjectURL(originalImage) : null;

  return (
    <div className="result-display">
      <div className="image-comparison">
        <div className="image-box">
          <h3>Original</h3>
          <div className="image-container">
            <img src={originalUrl} alt="Original" />
          </div>
        </div>

        {resultImage && (
          <div className="image-box">
            <h3>Line Art</h3>
            <div className="image-container">
              <img src={resultImage} alt="Generated line art" />
            </div>
            <a
              href={resultImage}
              download="line-art.png"
              className="download-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultDisplay;
