import { useCallback } from 'react';
import './ImageUploader.css';

function ImageUploader({ onImageSelect, selectedImage }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  }, [onImageSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      onImageSelect(file);
    }
  }, [onImageSelect]);

  const imagePreviewUrl = selectedImage ? URL.createObjectURL(selectedImage) : null;

  return (
    <div
      className={`image-uploader ${selectedImage ? 'has-image' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        id="image-input"
        accept="image/*"
        onChange={handleFileChange}
        className="file-input"
      />
      
      {!selectedImage ? (
        <label htmlFor="image-input" className="upload-label">
          <div className="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <span className="upload-text">Click or drag photo here</span>
          <span className="upload-hint">Supports JPG, PNG, WEBP</span>
        </label>
      ) : (
        <div className="preview-container">
          <img
            src={imagePreviewUrl}
            alt="Selected"
            className="image-preview"
          />
          <label htmlFor="image-input" className="change-image-btn">
            Change Photo
          </label>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
