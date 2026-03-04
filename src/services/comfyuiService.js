import axios from 'axios';

// Use proxy server instead of direct ComfyUI connection
// This solves HTTPS/HTTP mixed content issues

// Auto-detect proxy URL based on where the frontend is accessed from
const getProxyUrl = () => {
  // If explicitly set in env, use that (for development)
  if (import.meta.env.VITE_PROXY_URL) {
    return import.meta.env.VITE_PROXY_URL;
  }
  
  // In production, use relative URL (same server that served the frontend)
  // This way we only need ONE port forwarded
  return '';
};

const PROXY_URL = getProxyUrl();
const API_URL = `${PROXY_URL}/api`;

console.log('API URL:', API_URL);

class ComfyUIService {
  constructor() {
    this.clientId = this.generateClientId();
  }

  generateClientId() {
    return 'anyone_can_draw_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Upload image via proxy server
   * @param {File} file - The image file to upload
   * @returns {Promise<string>} - The filename of the uploaded image
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.name;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image. Make sure the proxy server is running.');
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
      const response = await axios.post(`${API_URL}/prompt`, payload);
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
      const response = await axios.get(`${API_URL}/prompt`);
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
      const response = await axios.get(`${API_URL}/history/${promptId}`);
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
              const imageUrl = `${API_URL}/view?filename=${encodeURIComponent(image.filename)}&type=output&subfolder=${encodeURIComponent(image.subfolder || '')}`;
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
