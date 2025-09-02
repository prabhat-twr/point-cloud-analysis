# Point Cloud Visualizer

A modern, web-based point cloud visualizer built with Three.js that supports multiple point cloud formats including PLY, PCD, and XYZ files.

![Point Cloud Visualizer](https://img.shields.io/badge/Three.js-r128-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Multiple Format Support**: Load PLY, PCD, XYZ, and STL files
- **Interactive 3D View**: Orbit, zoom, and pan controls for exploring 3D models
- **View Modes**: 
  - Points: View as point cloud
  - Faces: View as solid mesh
  - Wireframe: View as wireframe mesh
- **Point Selection**: Click on points to see their index numbers
- **Color Modes**: 
  - Height-based coloring
  - Distance-based coloring
  - Intensity-based coloring
  - Uniform coloring
- **Customizable Display**: Adjust point size, background color, and view modes
- **Drag & Drop**: Simply drag and drop files onto the viewer
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Info**: View vertex count, face count, bounds, and file information

## Quick Start

### Option 1: Direct File Opening
1. Download or clone this repository
2. Open `index.html` in a modern web browser
3. Click "Load Point Cloud" or drag and drop a point cloud file

### Option 2: Local Server (Recommended)
1. Install Node.js (if not already installed)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open your browser to `http://localhost:8080`

## Supported File Formats

### PLY (Polygon File Format)
- Binary and ASCII PLY files
- Supports vertex colors and normals
- Common in 3D scanning and computer graphics

### PCD (Point Cloud Data)
- Binary and ASCII PCD files
- Supports intensity values and colors
- Common in robotics and LiDAR applications

### STL (Stereolithography)
- Binary and ASCII STL files
- 3D mesh format with triangular faces
- Common in 3D printing and CAD applications

### XYZ
- Simple text format with space-separated values
- Format: `x y z [r g b]` (colors optional)
- One point per line

## Usage

### Loading Point Clouds
1. **File Upload**: Click the "Load Point Cloud" button and select a file
2. **Drag & Drop**: Drag a point cloud file directly onto the viewer area
3. **Multiple Files**: The app supports loading multiple files (one at a time)

### Controls
- **Mouse Controls**:
  - Left click + drag: Rotate view
  - Right click + drag: Pan view
  - Scroll wheel: Zoom in/out
- **Touch Controls** (mobile):
  - Single finger drag: Rotate
  - Two finger drag: Pan
  - Pinch: Zoom

### Display Options
- **Point Size**: Adjust the size of rendered points (0.1 - 10.0)
- **View Mode**: Choose how to display the model:
  - **Points**: Display as point cloud (clickable for selection)
  - **Faces**: Display as solid mesh
  - **Wireframe**: Display as wireframe mesh
- **Color Mode**: Choose how points are colored:
  - **Height-based**: Colors based on Y-coordinate (elevation)
  - **Distance-based**: Colors based on distance from origin
  - **Intensity-based**: Uses intensity values from the file
  - **Uniform**: Single color for all points
- **Background**: Change the background color
- **Reset Camera**: Return to the default viewing angle
- **Clear Selection**: Clear any selected points

## Technical Details

### Built With
- **Three.js**: 3D graphics library for WebGL
- **Vanilla JavaScript**: No frameworks, pure ES6+
- **Modern CSS**: Flexbox, Grid, and CSS custom properties
- **WebGL**: Hardware-accelerated 3D rendering

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Performance
- Optimized for large point clouds (tested with 1M+ points)
- Efficient memory management
- Smooth 60fps rendering on modern hardware

## File Structure

```
point-cloud-visualizer/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── app.js             # Main JavaScript application
├── package.json       # Node.js dependencies
├── sample.xyz         # Sample XYZ point cloud file
├── sample.stl         # Sample STL mesh file
└── README.md          # This file
```

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server with auto-open
npm run dev

# Start development server
npm start
```

### Adding New Features
The codebase is modular and easy to extend:

1. **New File Formats**: Add loaders in the `loadFile()` method
2. **New Color Modes**: Extend the `updateColors()` method
3. **New Controls**: Add UI elements and event listeners
4. **Performance**: Optimize rendering in the `animate()` loop

## Troubleshooting

### Common Issues

**File won't load:**
- Check file format is supported (PLY, PCD, XYZ)
- Ensure file is not corrupted
- Try a smaller file first

**Poor performance:**
- Reduce point size
- Use a smaller point cloud file
- Close other browser tabs
- Check browser WebGL support

**Display issues:**
- Try resetting the camera
- Check browser console for errors
- Ensure WebGL is enabled in browser

### Browser Console
Open browser developer tools (F12) to see detailed error messages and performance information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js community for the excellent 3D library
- Point cloud data providers and researchers
- WebGL and Web standards communities

## Sample Data

For testing, you can use sample point cloud data from:
- [Stanford 3D Scanning Repository](http://graphics.stanford.edu/data/3Dscanrep/)
- [Open3D Sample Data](http://www.open3d.org/docs/release/tutorial/Basic/working_with_numpy.html)
- [PCL Sample Data](https://github.com/PointCloudLibrary/pcl/tree/master/test)

---

**Note**: This is a client-side application. All processing happens in your browser - no data is sent to external servers.
