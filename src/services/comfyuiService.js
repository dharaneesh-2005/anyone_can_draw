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

// Skill level prompts for the ComfyUI workflow
const SKILL_PROMPTS = {
  beginner: `Convert to line art drawing, clean continuous contour lines, single weight black lines,
pure white background, minimal selective shading only where structurally necessary,
subtle hint shadows for depth, light form indication, essential internal details,
main feature outlines, simplified but accurate proportions, closed shapes,
beginner drawing guide with depth cues, coloring book style with minimal value hints,
vector art aesthetic, high contrast black on white, center composition, isolated subject`,

  intermediate: `Convert to clean line art drawing with smooth continuous contour lines and consistent black line weight.
Pure white background, centered isolated subject.
Include clear outer contours and essential internal structure lines.
Add moderate shading guides using light cross-hatching and contour shading to indicate depth and form.
Use subtle shadow regions to show volume, folds, and surface curvature while keeping areas simple enough for beginners to replicate.
Include soft tonal hints and shading zones where shadows naturally fall (under edges, folds, overlaps, and recessed areas).
Maintain simplified but accurate proportions with closed shapes and clear feature outlines.
Keep shading structured and instructional rather than overly dense, suitable as a step-by-step drawing and shading reference.
Coloring book style with guided shading regions, vector art aesthetic, high contrast black lines on white background,
balanced composition with readable depth cues.`,

  advanced: `Convert to detailed line art drawing using clean continuous contour lines and consistent single-weight black strokes.
Pure white background, centered isolated subject.
Preserve accurate proportions and essential internal structure lines.

Add shading using short directional single-line strokes that follow the natural contours of the form.
Use layered contour strokes to indicate depth, volume, and curvature of surfaces such as folds, facial structure, hair flow, and object edges.
Include subtle shadow regions built from parallel strokes rather than dense cross-hatching.
Allow slightly denser stroke placement in deeper shadow areas (under edges, overlaps, recessed regions, and occluded light areas) while keeping midtones light and readable.

Highlight structural planes and form transitions with contour-aligned strokes so the shading guides the viewer on how to shade the drawing by hand.
Maintain clean outlines, closed shapes, and clear feature definitions while keeping the overall drawing simplified and beginner-friendly.

Style resembles instructional pencil line drawing with tonal stroke guides, vector-like clarity, high contrast black on white, minimal clutter, balanced composition, and shading details that are detailed yet easy for a person to replicate.`
};

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
   * Queue a workflow with the given image and skill level
   * @param {Object} workflow - The workflow JSON
   * @param {string} imageFilename - The filename of the uploaded image
   * @param {string} skillLevel - The skill level (beginner, intermediate, advanced)
   * @returns {Promise<string>} - The prompt ID
   */
  async queueWorkflow(workflow, imageFilename, skillLevel = 'beginner') {
    // Update the LoadImage node (node 76) with the new image filename
    const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
    if (updatedWorkflow['76'] && updatedWorkflow['76'].inputs) {
      updatedWorkflow['76'].inputs.image = imageFilename;
    }

    // Update the prompt based on skill level (node 75:74 is the CLIPTextEncode node)
    const prompt = SKILL_PROMPTS[skillLevel] || SKILL_PROMPTS.beginner;
    if (updatedWorkflow['75:74'] && updatedWorkflow['75:74'].inputs) {
      updatedWorkflow['75:74'].inputs.text = prompt;
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
   * @param {string} skillLevel - The skill level (beginner, intermediate, advanced)
   * @param {Function} onProgress - Callback for progress updates
   * @returns {Promise<string>} - The URL of the generated image
   */
  async executeWorkflow(imageFile, workflow, skillLevel = 'beginner', onProgress = () => {}) {
    try {
      onProgress('Uploading image...');
      const imageFilename = await this.uploadImage(imageFile);
      
      onProgress('Queueing workflow...');
      const promptId = await this.queueWorkflow(workflow, imageFilename, skillLevel);
      
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
