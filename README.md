# 🎨 AI Virtual Painter - Air Drawing

A complete web application that allows you to draw in the air using hand gestures, powered by MediaPipe AI technology.

## ✨ Features

- **Air Drawing**: Draw in the air using your index finger
- **Gesture Controls**: 
  - Index finger up = Draw
  - Fist = Stop drawing
  - Thumb + Index finger together = Erase
- **Color Palette**: 8 different colors to choose from
- **Brush Size Control**: Adjustable brush thickness (2-20px)
- **Real-time Hand Tracking**: Uses MediaPipe for accurate hand detection
- **Save Drawings**: Download your artwork as PNG files
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Option 1: Python Server (Recommended)
```bash
# Navigate to the project directory
cd air-drawing-app

# Start Python server
python -m http.server 8000

# Open browser and go to:
# http://localhost:8000
```

### Option 2: Node.js Server
```bash
# Install dependencies
npm install

# Start server
npm run serve

# Open browser and go to:
# http://localhost:8000
```

### Option 3: Direct File Access
Simply open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge).

## 🎯 How to Use

1. **Allow Camera Access**: Grant permission when prompted
2. **Position Your Hand**: Hold your hand in front of the camera
3. **Start Drawing**: 
   - Point your index finger up while keeping other fingers down
   - Move your finger to draw lines
4. **Stop Drawing**: Make a fist or put your finger down
5. **Erase**: Bring your thumb and index finger close together
6. **Change Colors**: Click on the color palette
7. **Adjust Brush**: Use the size slider
8. **Save**: Click "Save Drawing" to download your artwork

## 🛠️ Technical Details

### Technologies Used
- **HTML5 Canvas**: For drawing and video display
- **MediaPipe Hands**: AI-powered hand tracking
- **JavaScript ES6+**: Modern JavaScript features
- **CSS3**: Responsive design with gradients and animations
- **WebRTC**: Camera access

### Hand Landmarks
The application tracks 21 hand landmarks to detect:
- Finger positions and orientations
- Gesture recognition
- Drawing vs. non-drawing states
- Eraser gestures

### Browser Compatibility
- Chrome 88+ (Recommended)
- Firefox 85+
- Safari 14+
- Edge 88+

## 📱 Mobile Support

The application is fully responsive and works on mobile devices with front-facing cameras.

## 🔧 Customization

### Adding New Colors
Edit the color palette in `index.html`:
```html
<div class="color-btn" data-color="#YOUR_COLOR" style="background: #YOUR_COLOR;"></div>
```

### Adjusting Sensitivity
Modify detection thresholds in `script.js`:
```javascript
this.hands.setOptions({
    minDetectionConfidence: 0.7, // Adjust this value
    minTrackingConfidence: 0.5   // Adjust this value
});
```

## 🐛 Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check if camera is being used by another application
- Try refreshing the page
- Use HTTPS for better camera access

### Poor Hand Detection
- Ensure good lighting
- Keep hand clearly visible
- Avoid busy backgrounds
- Maintain appropriate distance from camera

### Performance Issues
- Close other browser tabs
- Ensure good internet connection for MediaPipe loading
- Use a modern browser with hardware acceleration

## 📄 License

MIT License - Feel free to use and modify for your projects!

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and enhancement requests.

---

**Enjoy creating digital art with your hands! 🎨✨**