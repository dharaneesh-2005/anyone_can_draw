import axios from 'axios';

// IMPORTANT: ComfyUI must be started with CORS enabled for this to work.
// Start ComfyUI with: python main.py --listen 127.0.0.1 --port 8000 --enable-cors-header "*"
// Or set environment variable before starting: set COMFYUI_ENABLE_CORS_HEADER=*
const COMFYUI_BASE_URL = 'http://127.0.0.1:8000';
const COMFYUI_API_URL = `${COMFYUI_BASE_URL}/api`; 

// Simple axios config without credentials to avoid CORS preflight issues
const axiosConfig = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  withCredentials: false
};

class ComfyUIService {
  constructor() {
    this.clientId = this.generateClientId();
  }

  generateClientId() {
    return 'anyone_can_draw_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Upload image to ComfyUI
   * @param {File} file - The image file to upload
   * @returns {Promise<string>} - The filename of the uploaded image
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'input');
    formData.append('overwrite', 'true');

    try {
      const response = await axios.post(`${COMFYUI_BASE_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.name;
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error.response && error.response.status === 403) {
        throw new Error('CORS error: Please start ComfyUI with --enable-cors-header flag. See console for details.');
      }
      throw new Error('Failed to upload image to ComfyUI');
    }
  }

  /**
   * Queue a workflow with the given image
   * @param {Object} workflow - The workflow JSON
   * @param {string} imageFilename - The filename of the uploaded image
   * @returns {Promise<string>} - The prompt ID
   */
  async queueWorkflow(workflow, imageFilename) {
    // Update the LoadImage node (node 76) with the new image filename
    const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
    if (updatedWorkflow['76'] && updatedWorkflow['76'].inputs) {
      updatedWorkflow['76'].inputs.image = imageFilename;
    }

    const payload = {
      prompt: updatedWorkflow,
      client_id: this.clientId,
    };

    try {
      const response = await axios.post(`${COMFYUI_API_URL}/prompt`, payload);
      return response.data.prompt_id;
    } catch (error) {
      console.error('Error queuing workflow:', error);
      throw new Error('Failed to queue workflow');
    }
  }

  /**
   * Get the status of a prompt
   * @param {string} promptId - The prompt ID
   * @returns {Promise<Object>} - The prompt status
   */
  async getPromptStatus(promptId) {
    try {
      const response = await axios.get(`${COMFYUI_API_URL}/prompt`);
      const queue = response.data;
      
      // Check if prompt is still in queue or running
      const isInQueue = queue.queue_pending?.some(item => item[1] === promptId);
      const isRunning = queue.queue_running?.some(item => item[1] === promptId);
      
      return {
        isInQueue,
        isRunning,
        isComplete: !isInQueue && !isRunning,
      };
    } catch (error) {
      console.error('Error getting prompt status:', error);
      throw new Error('Failed to get prompt status');
    }
  }

  /**
   * Get the history/output of a completed prompt
   * @param {string} promptId - The prompt ID
   * @returns {Promise<Object>} - The prompt history
   */
  async getPromptHistory(promptId) {
    try {
      const response = await axios.get(`${COMFYUI_API_URL}/history/${promptId}`);
      return response.data[promptId];
    } catch (error) {
      console.error('Error getting prompt history:', error);
      throw new Error('Failed to get prompt history');
    }
  }

  /**
   * Poll for the result of a workflow execution
   * @param {string} promptId - The prompt ID
   * @param {number} maxAttempts - Maximum number of polling attempts
   * @param {number} interval - Polling interval in milliseconds
   * @returns {Promise<string>} - The URL of the generated image
   */
  async pollForResult(promptId, maxAttempts = 120, interval = 2000) {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        attempts++;

        try {
          const history = await this.getPromptHistory(promptId);
          
          if (history && history.outputs) {
            // Look for the SaveImage node (node 106) output
            const saveImageNode = history.outputs['106'];
            if (saveImageNode && saveImageNode.images && saveImageNode.images.length > 0) {
              const image = saveImageNode.images[0];
              const imageUrl = `${COMFYUI_BASE_URL}/view?filename=${encodeURIComponent(image.filename)}&type=output&subfolder=${encodeURIComponent(image.subfolder || '')}`;
              resolve(imageUrl);
              return;
            }
          }

          if (attempts >= maxAttempts) {
            reject(new Error('Timeout waiting for workflow completion'));
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(error);
            return;
          }
          setTimeout(poll, interval);
        }
      };

      poll();
    });
  }

  /**
   * Execute the complete workflow: upload image, queue, and get result
   * @param {File} imageFile - The image file to process
   * @param {Object} workflow - The workflow JSON
   * @param {Function} onProgress - Callback for progress updates
   * @returns {Promise<string>} - The URL of the generated image
   */
  async executeWorkflow(imageFile, workflow, onProgress = () => {}) {
    try {
      onProgress('Uploading image...');
      const imageFilename = await this.uploadImage(imageFile);
      
      onProgress('Queueing workflow...');
      const promptId = await this.queueWorkflow(workflow, imageFilename);
      
      onProgress('Processing image...');
      const resultUrl = await this.pollForResult(promptId);
      
      return resultUrl;
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }
}

export default new ComfyUIService();
