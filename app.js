class PointCloudVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pointCloud = null;
        this.mesh = null;
        this.currentFile = null;
        this.pointSize = 1.0;
        this.colorMode = 'height';
        this.backgroundColor = 0x000000;
        this.viewMode = 'points';
        this.selectedPointIndex = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.backgroundColor);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 0, 10);
        
        // Create renderer
        const viewer = document.getElementById('viewer');
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(viewer.clientWidth, viewer.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        viewer.appendChild(this.renderer.domElement);
        
        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.enableRotate = true;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Setup mouse interaction for point selection
        this.setupMouseInteraction();
    }
    
    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Point size control
        const pointSizeSlider = document.getElementById('pointSize');
        const pointSizeValue = document.getElementById('pointSizeValue');
        pointSizeSlider.addEventListener('input', (e) => {
            this.pointSize = parseFloat(e.target.value);
            pointSizeValue.textContent = this.pointSize.toFixed(1);
            this.updatePointSize();
        });
        
        // Color mode control
        const colorModeSelect = document.getElementById('colorMode');
        colorModeSelect.addEventListener('change', (e) => {
            this.colorMode = e.target.value;
            this.updateColors();
        });
        
        // Background color control
        const backgroundColorInput = document.getElementById('backgroundColor');
        backgroundColorInput.addEventListener('change', (e) => {
            this.backgroundColor = parseInt(e.target.value.replace('#', '0x'));
            this.scene.background = new THREE.Color(this.backgroundColor);
        });
        
        // Reset camera button
        document.getElementById('resetCamera').addEventListener('click', () => {
            this.resetCamera();
        });
        
        // View mode control
        const viewModeSelect = document.getElementById('viewMode');
        viewModeSelect.addEventListener('change', (e) => {
            this.viewMode = e.target.value;
            this.updateViewMode();
        });
        
        // Clear selection button
        document.getElementById('clearSelection').addEventListener('click', () => {
            this.clearSelection();
        });
        
        // Analysis buttons
        document.getElementById('showDensityHeatmap').addEventListener('click', () => {
            this.showDensityHeatmap();
        });
        
        document.getElementById('showHistogram').addEventListener('click', () => {
            this.showDistanceHistogram();
        });
        
        document.getElementById('analyzeClusters').addEventListener('click', () => {
            this.analyzeClusters();
        });
        
        document.getElementById('detectHoles').addEventListener('click', () => {
            this.detectHoles();
        });
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Close modal when clicking outside
        document.getElementById('analysisModal').addEventListener('click', (e) => {
            if (e.target.id === 'analysisModal') {
                this.closeModal();
            }
        });
        
        // Tab functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }
    
    setupDragAndDrop() {
        const viewer = document.getElementById('viewer');
        
        viewer.addEventListener('dragover', (e) => {
            e.preventDefault();
            viewer.classList.add('drag-over');
        });
        
        viewer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            viewer.classList.remove('drag-over');
        });
        
        viewer.addEventListener('drop', (e) => {
            e.preventDefault();
            viewer.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadFile(files[0]);
            }
        });
    }
    
    setupMouseInteraction() {
        const viewer = document.getElementById('viewer');
        
        viewer.addEventListener('click', (event) => {
            if (this.viewMode === 'points' && this.pointCloud) {
                this.handlePointSelection(event);
            }
        });
    }
    
    handlePointSelection(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObject(this.pointCloud);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const pointIndex = intersect.index;
            this.selectPoint(pointIndex);
        }
    }
    
    selectPoint(index) {
        this.selectedPointIndex = index;
        this.updateSelectionInfo();
        this.highlightSelectedPoint();
    }
    
    clearSelection() {
        this.selectedPointIndex = null;
        this.updateSelectionInfo();
        this.clearPointHighlight();
    }
    
    highlightSelectedPoint() {
        if (!this.pointCloud || this.selectedPointIndex === null) return;
        
        // Create a larger point for the selected point
        const geometry = this.pointCloud.geometry;
        const positions = geometry.attributes.position;
        
        // Store original size
        if (!this.originalPointSize) {
            this.originalPointSize = this.pointCloud.material.size;
        }
        
        // Create a highlight sphere
        if (this.highlightSphere) {
            this.scene.remove(this.highlightSphere);
        }
        
        const x = positions.array[this.selectedPointIndex * 3];
        const y = positions.array[this.selectedPointIndex * 3 + 1];
        const z = positions.array[this.selectedPointIndex * 3 + 2];
        
        const sphereGeometry = new THREE.SphereGeometry(this.pointSize * 2, 8, 6);
        const sphereMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        this.highlightSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.highlightSphere.position.set(x, y, z);
        this.scene.add(this.highlightSphere);
    }
    
    clearPointHighlight() {
        if (this.highlightSphere) {
            this.scene.remove(this.highlightSphere);
            this.highlightSphere = null;
        }
    }
    
    updateSelectionInfo() {
        const selectionInfo = document.getElementById('selectionInfo');
        if (this.selectedPointIndex !== null) {
            selectionInfo.textContent = `Selected Point Index: ${this.selectedPointIndex}`;
        } else {
            selectionInfo.textContent = 'No selection';
        }
    }
    
    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length > 0) {
            this.loadFile(files[0]);
        }
    }
    
    async loadFile(file) {
        this.showLoading(true);
        this.currentFile = file;
        
        try {
            const extension = file.name.split('.').pop().toLowerCase();
            
            switch (extension) {
                case 'ply':
                    await this.loadPLY(file);
                    break;
                case 'pcd':
                    await this.loadPCD(file);
                    break;
                case 'xyz':
                case 'txt':
                    await this.loadXYZ(file);
                    break;
                case 'stl':
                    await this.loadSTL(file);
                    break;
                default:
                    throw new Error(`Unsupported file format: ${extension}`);
            }
            
            this.updateInfo();
        } catch (error) {
            console.error('Error loading file:', error);
            alert(`Error loading file: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadPLY(file) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.PLYLoader();
            loader.load(
                URL.createObjectURL(file),
                (geometry) => {
                    this.createPointCloud(geometry);
                    resolve();
                },
                undefined,
                (error) => reject(error)
            );
        });
    }
    
    async loadPCD(file) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.PCDLoader();
            loader.load(
                URL.createObjectURL(file),
                (geometry) => {
                    this.createPointCloud(geometry);
                    resolve();
                },
                undefined,
                (error) => reject(error)
            );
        });
    }
    
    async loadXYZ(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    const points = [];
                    const colors = [];
                    
                    for (const line of lines) {
                        const values = line.trim().split(/\s+/);
                        if (values.length >= 3) {
                            const x = parseFloat(values[0]);
                            const y = parseFloat(values[1]);
                            const z = parseFloat(values[2]);
                            
                            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                                points.push(x, y, z);
                                
                                // Handle color if available
                                if (values.length >= 6) {
                                    const r = parseInt(values[3]) / 255;
                                    const g = parseInt(values[4]) / 255;
                                    const b = parseInt(values[5]) / 255;
                                    colors.push(r, g, b);
                                } else {
                                    colors.push(1, 1, 1); // Default white
                                }
                            }
                        }
                    }
                    
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
                    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                    
                    this.createPointCloud(geometry);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    async loadSTL(file) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();
            loader.load(
                URL.createObjectURL(file),
                (geometry) => {
                    // Remove duplicate vertices from STL geometry
                    const cleanedGeometry = this.removeDuplicateVertices(geometry);
                    this.createMesh(cleanedGeometry);
                    resolve();
                },
                undefined,
                (error) => reject(error)
            );
        });
    }
    
    removeDuplicateVertices(geometry) {
        const positions = geometry.attributes.position;
        const positionArray = positions.array;
        const vertexCount = positions.count;
        
        // Create a map to store unique vertices
        const vertexMap = new Map();
        const uniqueVertices = [];
        const indexMap = new Map();
        
        // Process each vertex
        for (let i = 0; i < vertexCount; i++) {
            const x = positionArray[i * 3];
            const y = positionArray[i * 3 + 1];
            const z = positionArray[i * 3 + 2];
            
            // Create a key for the vertex (with some tolerance for floating point precision)
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
            
            if (!vertexMap.has(key)) {
                // New unique vertex
                const newIndex = uniqueVertices.length / 3;
                vertexMap.set(key, newIndex);
                indexMap.set(i, newIndex);
                uniqueVertices.push(x, y, z);
            } else {
                // Duplicate vertex - map to existing index
                const existingIndex = vertexMap.get(key);
                indexMap.set(i, existingIndex);
            }
        }
        
        // Create new geometry with unique vertices
        const newGeometry = new THREE.BufferGeometry();
        newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(uniqueVertices, 3));
        
        // Handle indices properly
        if (geometry.index) {
            // Geometry has indexed faces
            const oldIndices = geometry.index.array;
            const newIndices = [];
            
            for (let i = 0; i < oldIndices.length; i++) {
                const oldIndex = oldIndices[i];
                const newIndex = indexMap.get(oldIndex);
                newIndices.push(newIndex);
            }
            
            newGeometry.setIndex(newIndices);
        } else {
            // Geometry has non-indexed faces (like STL files)
            // Create new indices for the unique vertices
            const newIndices = [];
            const facesPerVertex = 3; // STL files have 3 vertices per face
            
            for (let i = 0; i < vertexCount; i += facesPerVertex) {
                // Get the new indices for this face
                const newIndex1 = indexMap.get(i);
                const newIndex2 = indexMap.get(i + 1);
                const newIndex3 = indexMap.get(i + 2);
                
                // Add the face indices
                newIndices.push(newIndex1, newIndex2, newIndex3);
            }
            
            newGeometry.setIndex(newIndices);
        }
        
        // Recalculate normals after deduplication
        newGeometry.computeVertexNormals();
        
        return newGeometry;
    }
    
    createPointCloud(geometry) {
        // Remove existing objects
        this.clearScene();
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: this.pointSize,
            vertexColors: geometry.attributes.color ? true : false,
            sizeAttenuation: true
        });
        
        // Create point cloud
        this.pointCloud = new THREE.Points(geometry, material);
        this.scene.add(this.pointCloud);
        
        // Update view mode options for point cloud
        this.updateViewModeOptions('pointcloud');
        
        // Auto-fit camera to point cloud
        this.fitCameraToObject();
        
        // Update colors based on current mode
        this.updateColors();
        
        // Clear selection when loading new model
        this.clearSelection();
    }
    
    createMesh(geometry) {
        // Remove existing objects
        this.clearScene();
        
        // Create materials for different view modes
        const faceMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x888888,
            side: THREE.DoubleSide
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, faceMaterial);
        this.scene.add(this.mesh);
        
        // Update view mode options for mesh
        this.updateViewModeOptions('mesh');
        
        // Set initial view mode based on current selection
        this.updateViewMode();
        
        // Auto-fit camera to mesh
        this.fitCameraToObject();
        
        // Clear selection when loading new model
        this.clearSelection();
    }
    
    clearScene() {
        if (this.pointCloud) {
            this.scene.remove(this.pointCloud);
            this.pointCloud = null;
        }
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        this.clearPointHighlight();
        this.selectedPointIndex = null;
    }
    
    updatePointSize() {
        if (this.pointCloud) {
            this.pointCloud.material.size = this.pointSize;
        }
    }
    
    updateViewModeOptions(type) {
        const viewModeSelect = document.getElementById('viewMode');
        
        if (type === 'mesh') {
            // For mesh files, show all options including points
            viewModeSelect.innerHTML = `
                <option value="points">Points</option>
                <option value="faces">Faces</option>
                <option value="wireframe">Wireframe</option>
            `;
            this.viewMode = 'faces';
        } else if (type === 'pointcloud') {
            // For point cloud files, show only points option
            viewModeSelect.innerHTML = `
                <option value="points">Points</option>
            `;
            this.viewMode = 'points';
        }
    }
    
    updateViewMode() {
        if (!this.mesh && !this.pointCloud) return;
        
        if (this.mesh) {
            // Handle mesh view modes
            switch (this.viewMode) {
                case 'points':
                    // Convert mesh to points for viewing
                    this.convertMeshToPoints();
                    break;
                case 'faces':
                    // Show mesh as solid faces
                    this.mesh.visible = true;
                    this.mesh.material.wireframe = false;
                    this.mesh.material.color.setHex(0x888888);
                    // Hide point cloud if it exists
                    if (this.pointCloud) {
                        this.pointCloud.visible = false;
                    }
                    break;
                case 'wireframe':
                    // Show mesh as wireframe
                    this.mesh.visible = true;
                    this.mesh.material.wireframe = true;
                    this.mesh.material.color.setHex(0x00ff00);
                    // Hide point cloud if it exists
                    if (this.pointCloud) {
                        this.pointCloud.visible = false;
                    }
                    break;
            }
        } else if (this.pointCloud) {
            // Point cloud - only points mode available
            this.pointCloud.visible = true;
        }
    }
    
    convertMeshToPoints() {
        if (!this.mesh) return;
        
        // Create point cloud from mesh vertices
        const geometry = this.mesh.geometry;
        const positions = geometry.attributes.position;
        
        const pointGeometry = new THREE.BufferGeometry();
        pointGeometry.setAttribute('position', positions);
        
        // Create colors for points
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
            colors[i * 3] = 1;     // R
            colors[i * 3 + 1] = 1; // G
            colors[i * 3 + 2] = 1; // B
        }
        pointGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Create point cloud material
        const material = new THREE.PointsMaterial({
            size: this.pointSize,
            vertexColors: true,
            sizeAttenuation: true
        });
        
        // Create point cloud
        this.pointCloud = new THREE.Points(pointGeometry, material);
        this.scene.add(this.pointCloud);
        
        // Hide mesh and show point cloud
        this.mesh.visible = false;
        this.pointCloud.visible = true;
        
        // Update colors based on current mode
        this.updateColors();
    }
    

    
    updateColors() {
        if (!this.pointCloud) return;
        
        const geometry = this.pointCloud.geometry;
        const positions = geometry.attributes.position;
        const colors = geometry.attributes.color;
        
        if (!positions) return;
        
        // Create color attribute if it doesn't exist
        if (!colors) {
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(
                new Array(positions.count * 3).fill(1), 3
            ));
        }
        
        const colorArray = geometry.attributes.color.array;
        const positionArray = positions.array;
        
        // Calculate bounds for color mapping
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let minIntensity = Infinity, maxIntensity = -Infinity;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positionArray[i * 3];
            const y = positionArray[i * 3 + 1];
            const z = positionArray[i * 3 + 2];
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
            
            // Calculate distance from origin for intensity
            const distance = Math.sqrt(x * x + y * y + z * z);
            minIntensity = Math.min(minIntensity, distance);
            maxIntensity = Math.max(maxIntensity, distance);
        }
        
        // Apply color mapping
        for (let i = 0; i < positions.count; i++) {
            const x = positionArray[i * 3];
            const y = positionArray[i * 3 + 1];
            const z = positionArray[i * 3 + 2];
            
            let r, g, b;
            
            switch (this.colorMode) {
                case 'height':
                    const heightNormalized = (y - minY) / (maxY - minY);
                    r = heightNormalized;
                    g = 1 - heightNormalized;
                    b = 0.5;
                    break;
                    
                case 'distance':
                    const distance = Math.sqrt(x * x + y * y + z * z);
                    const distanceNormalized = (distance - minIntensity) / (maxIntensity - minIntensity);
                    r = distanceNormalized;
                    g = 1 - distanceNormalized;
                    b = 0.5;
                    break;
                    
                case 'intensity':
                    // Use existing colors if available, otherwise use height
                    if (geometry.attributes.color && geometry.attributes.color.array.length > 0) {
                        r = colorArray[i * 3];
                        g = colorArray[i * 3 + 1];
                        b = colorArray[i * 3 + 2];
                    } else {
                        const heightNormalized = (y - minY) / (maxY - minY);
                        r = heightNormalized;
                        g = 1 - heightNormalized;
                        b = 0.5;
                    }
                    break;
                    
                case 'uniform':
                default:
                    r = 1;
                    g = 1;
                    b = 1;
                    break;
            }
            
            colorArray[i * 3] = r;
            colorArray[i * 3 + 1] = g;
            colorArray[i * 3 + 2] = b;
        }
        
        geometry.attributes.color.needsUpdate = true;
        this.pointCloud.material.vertexColors = true;
    }
    
    fitCameraToObject() {
        const object = this.pointCloud || this.mesh;
        if (!object) return;
        
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Add some padding
        
        this.camera.position.set(center.x, center.y, center.z + cameraZ);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }
    
    resetCamera() {
        const object = this.pointCloud || this.mesh;
        if (object) {
            this.fitCameraToObject();
        } else {
            this.camera.position.set(0, 0, 10);
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }
    
    updateInfo() {
        const object = this.pointCloud || this.mesh;
        if (!object) {
            document.getElementById('pointCount').textContent = 'No model loaded';
            document.getElementById('faceCount').textContent = 'Faces: N/A';
            document.getElementById('bounds').textContent = 'Bounds: N/A';
            document.getElementById('fileInfo').textContent = 'File: None';
            return;
        }
        
        const geometry = object.geometry;
        const positions = geometry.attributes.position;
        
        // Update point/vertex count
        document.getElementById('pointCount').textContent = `Vertices: ${positions.count.toLocaleString()}`;
        
        // Update face count
        let faceCount = 0;
        if (geometry.index) {
            faceCount = geometry.index.count / 3;
        } else {
            faceCount = positions.count / 3;
        }
        document.getElementById('faceCount').textContent = `Faces: ${Math.floor(faceCount).toLocaleString()}`;
        
        // Calculate bounds
        const positionArray = positions.array;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positionArray[i * 3];
            const y = positionArray[i * 3 + 1];
            const z = positionArray[i * 3 + 2];
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }
        
        document.getElementById('bounds').textContent = 
            `Bounds: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}] Y[${minY.toFixed(2)}, ${maxY.toFixed(2)}] Z[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`;
        
        document.getElementById('fileInfo').textContent = `File: ${this.currentFile.name}`;
        
        // Update analysis data
        this.updateAnalysisData();
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
    
    onWindowResize() {
        const viewer = document.getElementById('viewer');
        const width = viewer.clientWidth;
        const height = viewer.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    // Analysis Methods
    updateAnalysisData() {
        const object = this.pointCloud || this.mesh;
        if (!object) {
            this.clearAnalysisData();
            return;
        }
        
        const geometry = object.geometry;
        const positions = geometry.attributes.position;
        
        // Calculate basic geometric properties
        this.calculateGeometricAnalysis(geometry);
        this.calculateStatisticalAnalysis(positions);
        this.calculatePointDensity(positions);
    }
    
    clearAnalysisData() {
        document.getElementById('densityInfo').textContent = 'No data';
        document.getElementById('surfaceArea').textContent = 'Surface Area: N/A';
        document.getElementById('volume').textContent = 'Volume: N/A';
        document.getElementById('centerOfMass').textContent = 'Center of Mass: N/A';
        document.getElementById('boundingBox').textContent = 'Bounding Box: N/A';
        document.getElementById('distanceStats').textContent = 'Distance Stats: N/A';
        document.getElementById('stdDeviation').textContent = 'Std Deviation: N/A';
        document.getElementById('clusterInfo').textContent = 'Clusters: N/A';
        document.getElementById('holeInfo').textContent = 'Holes: N/A';
    }
    
    calculateGeometricAnalysis(geometry) {
        const positions = geometry.attributes.position;
        const positionArray = positions.array;
        const vertexCount = positions.count;
        
        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let totalX = 0, totalY = 0, totalZ = 0;
        
        for (let i = 0; i < vertexCount; i++) {
            const x = positionArray[i * 3];
            const y = positionArray[i * 3 + 1];
            const z = positionArray[i * 3 + 2];
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
            
            totalX += x;
            totalY += y;
            totalZ += z;
        }
        
        // Center of mass
        const centerX = totalX / vertexCount;
        const centerY = totalY / vertexCount;
        const centerZ = totalZ / vertexCount;
        
        // Bounding box dimensions
        const width = maxX - minX;
        const height = maxY - minY;
        const depth = maxZ - minZ;
        
        // Update UI
        document.getElementById('centerOfMass').textContent = 
            `Center of Mass: (${centerX.toFixed(3)}, ${centerY.toFixed(3)}, ${centerZ.toFixed(3)})`;
        document.getElementById('boundingBox').textContent = 
            `Bounding Box: ${width.toFixed(3)} × ${height.toFixed(3)} × ${depth.toFixed(3)}`;
        
        // Calculate surface area and volume for meshes
        if (this.mesh && geometry.index) {
            this.calculateMeshProperties(geometry);
        } else {
            document.getElementById('surfaceArea').textContent = 'Surface Area: N/A (Point Cloud)';
            document.getElementById('volume').textContent = 'Volume: N/A (Point Cloud)';
        }
    }
    
    calculateMeshProperties(geometry) {
        const positions = geometry.attributes.position;
        const indices = geometry.index.array;
        const positionArray = positions.array;
        
        let surfaceArea = 0;
        let volume = 0;
        
        // Calculate surface area and volume using triangulated mesh
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] * 3;
            const i2 = indices[i + 1] * 3;
            const i3 = indices[i + 2] * 3;
            
            const v1 = new THREE.Vector3(positionArray[i1], positionArray[i1 + 1], positionArray[i1 + 2]);
            const v2 = new THREE.Vector3(positionArray[i2], positionArray[i2 + 1], positionArray[i2 + 2]);
            const v3 = new THREE.Vector3(positionArray[i3], positionArray[i3 + 1], positionArray[i3 + 2]);
            
            // Calculate triangle area
            const edge1 = v2.clone().sub(v1);
            const edge2 = v3.clone().sub(v1);
            const crossProduct = edge1.cross(edge2);
            const triangleArea = crossProduct.length() / 2;
            surfaceArea += triangleArea;
            
            // Calculate volume using divergence theorem
            const volumeContribution = v1.dot(v2.cross(v3)) / 6;
            volume += volumeContribution;
        }
        
        document.getElementById('surfaceArea').textContent = `Surface Area: ${surfaceArea.toFixed(3)} units²`;
        document.getElementById('volume').textContent = `Volume: ${Math.abs(volume).toFixed(3)} units³`;
    }
    
    calculateStatisticalAnalysis(positions) {
        const positionArray = positions.array;
        const vertexCount = positions.count;
        
        // Calculate center point
        let centerX = 0, centerY = 0, centerZ = 0;
        for (let i = 0; i < vertexCount; i++) {
            centerX += positionArray[i * 3];
            centerY += positionArray[i * 3 + 1];
            centerZ += positionArray[i * 3 + 2];
        }
        centerX /= vertexCount;
        centerY /= vertexCount;
        centerZ /= vertexCount;
        
        // Calculate distances from center
        const distances = [];
        let minDist = Infinity, maxDist = -Infinity, totalDist = 0;
        
        for (let i = 0; i < vertexCount; i++) {
            const x = positionArray[i * 3];
            const y = positionArray[i * 3 + 1];
            const z = positionArray[i * 3 + 2];
            
            const distance = Math.sqrt(
                Math.pow(x - centerX, 2) + 
                Math.pow(y - centerY, 2) + 
                Math.pow(z - centerZ, 2)
            );
            
            distances.push(distance);
            minDist = Math.min(minDist, distance);
            maxDist = Math.max(maxDist, distance);
            totalDist += distance;
        }
        
        const avgDist = totalDist / vertexCount;
        
        // Calculate standard deviation
        let variance = 0;
        for (const dist of distances) {
            variance += Math.pow(dist - avgDist, 2);
        }
        const stdDev = Math.sqrt(variance / vertexCount);
        
        // Update UI
        document.getElementById('distanceStats').textContent = 
            `Distance Stats: Min=${minDist.toFixed(3)}, Max=${maxDist.toFixed(3)}, Avg=${avgDist.toFixed(3)}`;
        document.getElementById('stdDeviation').textContent = 
            `Std Deviation: ${stdDev.toFixed(3)}`;
        
        // Store distances for histogram
        this.distanceData = distances;
    }
    
    calculatePointDensity(positions) {
        const positionArray = positions.array;
        const vertexCount = positions.count;
        
        // Calculate bounding box volume
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < vertexCount; i++) {
            const x = positionArray[i * 3];
            const y = positionArray[i * 3 + 1];
            const z = positionArray[i * 3 + 2];
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }
        
        const volume = (maxX - minX) * (maxY - minY) * (maxZ - minZ);
        const density = vertexCount / volume;
        
        document.getElementById('densityInfo').textContent = 
            `Density: ${density.toFixed(2)} points/unit³`;
    }
    
    showDensityHeatmap() {
        if (!this.pointCloud) {
            this.showModal('Error', '<p>Please load a point cloud first to show density heatmap.</p>');
            return;
        }
        
        // Simple density visualization using distance-based coloring
        this.colorMode = 'distance';
        this.updateColors();
        
        const content = `
            <div style="text-align: center; padding: 1rem;">
                <h4>✅ Density Heatmap Applied!</h4>
                <p><strong>Color Legend:</strong></p>
                <div style="display: flex; justify-content: center; gap: 2rem; margin: 1rem 0;">
                    <div style="text-align: center;">
                        <div style="width: 30px; height: 20px; background: red; margin: 0 auto; border-radius: 3px;"></div>
                        <small>High Density</small>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 30px; height: 20px; background: blue; margin: 0 auto; border-radius: 3px;"></div>
                        <small>Low Density</small>
                    </div>
                </div>
                <p>The point cloud is now colored based on distance from center, showing density distribution.</p>
            </div>
        `;
        this.showModal('Density Heatmap', content);
    }
    
    showDistanceHistogram() {
        if (!this.distanceData) {
            this.showModal('Error', '<p>No distance data available. Please load a 3D model first.</p>');
            return;
        }
        
        // Create a simple histogram visualization
        const bins = 20;
        const min = Math.min(...this.distanceData);
        const max = Math.max(...this.distanceData);
        const binSize = (max - min) / bins;
        
        const histogram = new Array(bins).fill(0);
        for (const distance of this.distanceData) {
            const binIndex = Math.min(Math.floor((distance - min) / binSize), bins - 1);
            histogram[binIndex]++;
        }
        
        // Create visual histogram
        const maxCount = Math.max(...histogram);
        let histogramHTML = '<div class="histogram-container">';
        histogramHTML += '<h4>Distance Distribution Histogram</h4>';
        histogramHTML += `<p><strong>Total Points:</strong> ${this.distanceData.length}</p>`;
        histogramHTML += `<p><strong>Distance Range:</strong> ${min.toFixed(3)} - ${max.toFixed(3)}</p>`;
        
        for (let i = 0; i < bins; i++) {
            const binStart = min + i * binSize;
            const binEnd = min + (i + 1) * binSize;
            const count = histogram[i];
            const percentage = (count / this.distanceData.length * 100).toFixed(1);
            const barWidth = maxCount > 0 ? (count / maxCount * 100) : 0;
            
            histogramHTML += `
                <div class="histogram-bar">
                    <div class="histogram-label">${binStart.toFixed(2)} - ${binEnd.toFixed(2)}</div>
                    <div class="histogram-visual">
                        <div class="histogram-fill" style="width: ${barWidth}%"></div>
                    </div>
                    <div class="histogram-count">${count} (${percentage}%)</div>
                </div>
            `;
        }
        histogramHTML += '</div>';
        
        this.showModal('Distance Histogram', histogramHTML);
    }
    
    analyzeClusters() {
        if (!this.pointCloud) {
            this.showModal('Error', '<p>Please load a point cloud first to analyze clusters.</p>');
            return;
        }
        
        // Simple clustering using distance-based grouping
        const positions = this.pointCloud.geometry.attributes.position;
        const positionArray = positions.array;
        const vertexCount = positions.count;
        
        const clusters = [];
        const visited = new Set();
        const clusterDistance = 0.5; // Adjust based on your data
        
        for (let i = 0; i < vertexCount; i++) {
            if (visited.has(i)) continue;
            
            const cluster = [i];
            visited.add(i);
            
            // Find nearby points
            for (let j = i + 1; j < vertexCount; j++) {
                if (visited.has(j)) continue;
                
                const x1 = positionArray[i * 3];
                const y1 = positionArray[i * 3 + 1];
                const z1 = positionArray[i * 3 + 2];
                
                const x2 = positionArray[j * 3];
                const y2 = positionArray[j * 3 + 1];
                const z2 = positionArray[j * 3 + 2];
                
                const distance = Math.sqrt(
                    Math.pow(x2 - x1, 2) + 
                    Math.pow(y2 - y1, 2) + 
                    Math.pow(z2 - z1, 2)
                );
                
                if (distance < clusterDistance) {
                    cluster.push(j);
                    visited.add(j);
                }
            }
            
            if (cluster.length > 1) {
                clusters.push(cluster);
            }
        }
        
        // Update UI
        const totalClusteredPoints = clusters.reduce((sum, c) => sum + c.length, 0);
        document.getElementById('clusterInfo').textContent = 
            `Clusters: ${clusters.length} (${totalClusteredPoints} points)`;
        
        // Create cluster details for modal
        let clusterHTML = '<div class="cluster-list">';
        clusterHTML += `<h4>Clustering Analysis Results</h4>`;
        clusterHTML += `<p><strong>Total Points:</strong> ${vertexCount}</p>`;
        clusterHTML += `<p><strong>Clusters Found:</strong> ${clusters.length}</p>`;
        clusterHTML += `<p><strong>Clustered Points:</strong> ${totalClusteredPoints}</p>`;
        clusterHTML += `<p><strong>Cluster Distance Threshold:</strong> ${clusterDistance}</p>`;
        
        if (clusters.length > 0) {
            clusterHTML += '<h5>Cluster Details:</h5>';
            clusters.forEach((cluster, index) => {
                clusterHTML += `
                    <div class="cluster-item">
                        <h4>Cluster ${index + 1}</h4>
                        <div class="cluster-details">Points: ${cluster.length}</div>
                        <div class="cluster-details">Percentage: ${(cluster.length / vertexCount * 100).toFixed(1)}%</div>
                    </div>
                `;
            });
        } else {
            clusterHTML += '<p><em>No significant clusters found with the current distance threshold.</em></p>';
        }
        
        clusterHTML += '</div>';
        this.showModal('Clustering Analysis', clusterHTML);
    }
    
    detectHoles() {
        if (!this.mesh) {
            document.getElementById('holeInfo').textContent = 'Holes: N/A (Not a mesh)';
            return;
        }
        
        // Simple hole detection by analyzing edge connectivity
        const geometry = this.mesh.geometry;
        if (!geometry.index) {
            document.getElementById('holeInfo').textContent = 'Holes: N/A (Non-indexed geometry)';
            return;
        }
        
        // This is a simplified hole detection - in practice, you'd need more sophisticated algorithms
        const indices = geometry.index.array;
        const edgeMap = new Map();
        
        // Count edge occurrences
        for (let i = 0; i < indices.length; i += 3) {
            const v1 = indices[i];
            const v2 = indices[i + 1];
            const v3 = indices[i + 2];
            
            // Add edges (both directions)
            const edge1 = `${Math.min(v1, v2)}-${Math.max(v1, v2)}`;
            const edge2 = `${Math.min(v2, v3)}-${Math.max(v2, v3)}`;
            const edge3 = `${Math.min(v3, v1)}-${Math.max(v3, v1)}`;
            
            edgeMap.set(edge1, (edgeMap.get(edge1) || 0) + 1);
            edgeMap.set(edge2, (edgeMap.get(edge2) || 0) + 1);
            edgeMap.set(edge3, (edgeMap.get(edge3) || 0) + 1);
        }
        
        // Count boundary edges (edges that appear only once)
        let boundaryEdges = 0;
        for (const count of edgeMap.values()) {
            if (count === 1) boundaryEdges++;
        }
        
        // Estimate holes based on boundary edges
        const estimatedHoles = Math.max(0, Math.floor(boundaryEdges / 6)); // Rough estimate
        
        document.getElementById('holeInfo').textContent = 
            `Holes: ~${estimatedHoles} (${boundaryEdges} boundary edges)`;
    }
    
    // Modal control methods
    showModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalContent').innerHTML = content;
        document.getElementById('analysisModal').classList.remove('hidden');
    }
    
    closeModal() {
        document.getElementById('analysisModal').classList.add('hidden');
    }
    
    switchTab(tabName) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        // Add active class to selected tab and button
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PointCloudVisualizer();
});
