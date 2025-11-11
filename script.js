class AirDrawingApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.drawingCanvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        
        this.currentColor = '#FF0000';
        this.brushSize = 5;
        this.isDrawing = false;
        this.drawingEnabled = true;
        this.lastPoint = null;
        
        // New gesture properties
        this.colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000'];
        this.currentColorIndex = 0;
        this.zoomLevel = 1;
        this.canvasHistory = [];
        this.historyIndex = -1;
        this.gestureTimeout = null;
        this.lastGestureTime = 0;
        this.minGestureInterval = 500; // ms between gestures
        
        this.hands = null;
        this.camera = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeMediaPipe();
        this.saveCanvasState();
    }

    initializeElements() {
        // Set canvas dimensions
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize drawing canvas
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
    }

    resizeCanvas() {
        const rect = this.video.getBoundingClientRect();
        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;
        this.drawingCanvas.width = this.canvas.width;
        this.drawingCanvas.height = this.canvas.height;
        
        // Update canvas display size
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';
        this.drawingCanvas.style.width = '100%';
        this.drawingCanvas.style.height = 'auto';
    }

    setupEventListeners() {
        // Color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelector('.color-btn.active').classList.remove('active');
                e.target.classList.add('active');
                this.currentColor = e.target.dataset.color;
            });
        });

        // Brush size
        const brushSize = document.getElementById('brush-size');
        const brushSizeValue = document.getElementById('brush-size-value');
        brushSize.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = this.brushSize;
        });

        // Action buttons
        document.getElementById('clear-btn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('save-btn').addEventListener('click', () => this.saveDrawing());
        document.getElementById('toggle-drawing').addEventListener('click', () => this.toggleDrawing());
    }

    async initializeMediaPipe() {
        try {
            this.updateStatus('Initializing camera...');
            
            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => this.onResults(results));

            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    await this.hands.send({ image: this.video });
                },
                width: 640,
                height: 480
            });

            await this.camera.start();
            this.updateStatus('Ready to draw!', true);
        } catch (error) {
            console.error('Error initializing MediaPipe:', error);
            this.updateStatus('Error: Camera not available');
        }
    }

    onResults(results) {
        // Clear the canvas
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.processHandGestures(landmarks);
            this.drawHandLandmarks(landmarks);
        } else {
            this.isDrawing = false;
            this.lastPoint = null;
        }

        this.ctx.restore();
    }

    processHandGestures(landmarks) {
        if (!this.drawingEnabled) return;

        const now = Date.now();
        if (now - this.lastGestureTime < this.minGestureInterval) return;

        const indexTip = landmarks[8];
        const indexPip = landmarks[6];
        const indexMcp = landmarks[5];
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const middleTip = landmarks[12];
        const middlePip = landmarks[10];
        const ringTip = landmarks[16];
        const ringPip = landmarks[14];
        const pinkyTip = landmarks[20];
        const pinkyPip = landmarks[18];

        // Convert normalized coordinates to canvas coordinates
        const x = indexTip.x * this.canvas.width;
        const y = indexTip.y * this.canvas.height;

        // Finger states
        const isIndexUp = indexTip.y < indexPip.y && indexPip.y < indexMcp.y;
        const isMiddleUp = middleTip.y < middlePip.y;
        const isRingUp = ringTip.y < ringPip.y;
        const isPinkyUp = pinkyTip.y < pinkyPip.y;
        const isThumbUp = thumbTip.x > thumbIp.x; // Thumb extended

        // Distance calculations
        const thumbIndexDistance = this.getDistance(thumbTip, indexTip);
        const indexMiddleDistance = this.getDistance(indexTip, middleTip);

        // Gesture Recognition
        if (this.recognizeGesture('peace', isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp)) {
            this.handleUndo();
        } else if (this.recognizeGesture('three', isIndexUp && isMiddleUp && isRingUp && !isPinkyUp)) {
            this.handleRedo();
        } else if (this.recognizeGesture('four', isIndexUp && isMiddleUp && isRingUp && isPinkyUp)) {
            this.changeColor();
        } else if (this.recognizeGesture('thumbsUp', isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp)) {
            this.increaseBrushSize();
        } else if (this.recognizeGesture('thumbsDown', !isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp)) {
            this.decreaseBrushSize();
        } else if (this.recognizeGesture('fist', !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp && !isThumbUp)) {
            this.erase(x, y);
            this.isDrawing = false;
        } else if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
            // Drawing mode - only index finger up
            if (this.isDrawing && this.lastPoint) {
                this.drawLine(this.lastPoint.x, this.lastPoint.y, x, y);
            }
            this.isDrawing = true;
            this.lastPoint = { x, y };
        } else {
            // Stop drawing and save state if was drawing
            if (this.isDrawing) {
                this.saveCanvasState();
            }
            this.isDrawing = false;
            this.lastPoint = null;
        }
    }

    drawLine(x1, y1, x2, y2) {
        this.drawingCtx.globalCompositeOperation = 'source-over';
        this.drawingCtx.strokeStyle = this.currentColor;
        this.drawingCtx.lineWidth = this.brushSize;
        
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(x1, y1);
        this.drawingCtx.lineTo(x2, y2);
        this.drawingCtx.stroke();
    }

    erase(x, y) {
        this.drawingCtx.globalCompositeOperation = 'destination-out';
        this.drawingCtx.beginPath();
        this.drawingCtx.arc(x, y, this.brushSize * 2, 0, 2 * Math.PI);
        this.drawingCtx.fill();
    }

    drawHandLandmarks(landmarks) {
        // Draw hand skeleton
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#FF0000';

        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index
            [5, 9], [9, 10], [10, 11], [11, 12], // Middle
            [9, 13], [13, 14], [14, 15], [15, 16], // Ring
            [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [0, 17] // Palm
        ];

        this.ctx.beginPath();
        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            this.ctx.moveTo(startPoint.x * this.canvas.width, startPoint.y * this.canvas.height);
            this.ctx.lineTo(endPoint.x * this.canvas.width, endPoint.y * this.canvas.height);
        });
        this.ctx.stroke();

        // Draw landmarks
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, index === 8 ? 8 : 4, 0, 2 * Math.PI);
            this.ctx.fillStyle = index === 8 ? '#00FF00' : '#FF0000';
            this.ctx.fill();
        });
    }

    clearCanvas() {
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }

    async saveDrawing() {
        try {
            // Create a temporary canvas to combine video and drawing
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCanvas.width = this.drawingCanvas.width;
            tempCanvas.height = this.drawingCanvas.height;
            
            // Draw white background
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Draw the drawing
            tempCtx.drawImage(this.drawingCanvas, 0, 0);
            
            const imageData = tempCanvas.toDataURL('image/png');
            const filename = `air-drawing-${Date.now()}.png`;
            
            // Try to save to backend first
            try {
                const response = await fetch('/api/save-drawing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageData, filename })
                });
                
                if (response.ok) {
                    this.updateStatus('Drawing saved to server!', true);
                    return;
                }
            } catch (e) {
                console.log('Backend not available, using local download');
            }
            
            // Fallback to local download
            const link = document.createElement('a');
            link.download = filename;
            link.href = imageData;
            link.click();
            this.updateStatus('Drawing downloaded!', true);
        } catch (error) {
            console.error('Save error:', error);
            this.updateStatus('Save failed!', false);
        }
    }

    toggleDrawing() {
        this.drawingEnabled = !this.drawingEnabled;
        const btn = document.getElementById('toggle-drawing');
        btn.textContent = this.drawingEnabled ? 'Disable Drawing' : 'Enable Drawing';
        btn.style.background = this.drawingEnabled ? 
            'linear-gradient(45deg, #667eea, #764ba2)' : 
            'linear-gradient(45deg, #ff4444, #cc0000)';
    }

    getDistance(point1, point2) {
        return Math.sqrt(
            Math.pow((point1.x - point2.x) * this.canvas.width, 2) +
            Math.pow((point1.y - point2.y) * this.canvas.height, 2)
        );
    }

    recognizeGesture(gestureName, condition) {
        if (condition) {
            const now = Date.now();
            if (now - this.lastGestureTime > this.minGestureInterval) {
                this.lastGestureTime = now;
                this.updateStatus(`Gesture: ${gestureName}`, true);
                return true;
            }
        }
        return false;
    }

    saveCanvasState() {
        this.historyIndex++;
        if (this.historyIndex < this.canvasHistory.length) {
            this.canvasHistory.length = this.historyIndex;
        }
        this.canvasHistory.push(this.drawingCtx.getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height));
        if (this.canvasHistory.length > 20) {
            this.canvasHistory.shift();
            this.historyIndex--;
        }
    }

    handleUndo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.drawingCtx.putImageData(this.canvasHistory[this.historyIndex], 0, 0);
        }
    }

    handleRedo() {
        if (this.historyIndex < this.canvasHistory.length - 1) {
            this.historyIndex++;
            this.drawingCtx.putImageData(this.canvasHistory[this.historyIndex], 0, 0);
        }
    }

    changeColor() {
        this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
        this.currentColor = this.colors[this.currentColorIndex];
        
        // Update UI
        document.querySelector('.color-btn.active').classList.remove('active');
        document.querySelectorAll('.color-btn')[this.currentColorIndex].classList.add('active');
        
        // Update status
        const colorNames = ['Red', 'Green', 'Blue', 'Yellow', 'Magenta', 'Cyan', 'White', 'Black'];
        document.getElementById('current-color-name').textContent = colorNames[this.currentColorIndex];
    }

    increaseBrushSize() {
        this.brushSize = Math.min(20, this.brushSize + 2);
        document.getElementById('brush-size').value = this.brushSize;
        document.getElementById('brush-size-value').textContent = this.brushSize;
        document.getElementById('current-brush-size').textContent = this.brushSize;
    }

    decreaseBrushSize() {
        this.brushSize = Math.max(2, this.brushSize - 2);
        document.getElementById('brush-size').value = this.brushSize;
        document.getElementById('brush-size-value').textContent = this.brushSize;
        document.getElementById('current-brush-size').textContent = this.brushSize;
    }

    zoomIn() {
        this.zoomLevel = Math.min(3, this.zoomLevel + 0.2);
        this.applyZoom();
    }

    zoomOut() {
        this.zoomLevel = Math.max(0.5, this.zoomLevel - 0.2);
        this.applyZoom();
    }

    applyZoom() {
        const container = document.querySelector('.canvas-container');
        container.style.transform = `scale(${this.zoomLevel})`;
        container.style.transformOrigin = 'center center';
        
        // Update zoom displays
        const zoomPercent = Math.round(this.zoomLevel * 100) + '%';
        document.getElementById('zoom-value').textContent = zoomPercent;
        document.getElementById('current-zoom').textContent = zoomPercent;
    }

    clearCanvas() {
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.saveCanvasState();
    }

    updateStatus(message, connected = false) {
        const statusText = document.getElementById('status-text');
        const statusDot = document.querySelector('.status-dot');
        
        statusText.textContent = message;
        
        if (connected) {
            statusDot.classList.add('connected');
        } else {
            statusDot.classList.remove('connected');
        }
        
        // Clear status after 2 seconds
        clearTimeout(this.gestureTimeout);
        this.gestureTimeout = setTimeout(() => {
            if (connected) {
                statusText.textContent = 'Ready to draw!';
            }
        }, 2000);
    }
}

// Initialize the application when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AirDrawingApp();
});