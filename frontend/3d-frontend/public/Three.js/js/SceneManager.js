import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Manages the Three.js scene, camera, renderer, and controls
 */
export class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);

    // Initialize Three.js components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initControls();

    // Set initial camera position
    this.setPerspectiveView();
  }

  initScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0)

    // Add grid helper for reference
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc)
    this.scene.add(gridHelper)

    // Add axes helper for orientation
    const axesHelper = new THREE.AxesHelper(0)
    this.scene.add(axesHelper)
  }

  initCamera() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    const aspect = width / height

    // Create perspective camera
    this.camera = new THREE.PerspectiveCamera(20, aspect, 0.1, 1000)
    this.camera.position.set(50, 50, 50)
    this.camera.lookAt(50, 0, 0)
  }

  initRenderer() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true

    this.container.appendChild(this.renderer.domElement)
  }

  initLights() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    // Directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 15)
    directionalLight.castShadow = true

    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20

    this.scene.add(directionalLight)
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.screenSpacePanning = false
    this.controls.minDistance = 1
    this.controls.maxDistance = 50
    this.controls.maxPolarAngle = Math.PI / 2
  }

  update() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  onWindowResize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  clearScene() {
    // Safety check - if we don't have a scene, recreate it
    if (!this.scene) {
      console.warn("Scene was undefined, recreating it");
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf0f0f0);
      return;
    }
  
    // Safely remove all children
    const objectsToRemove = [...this.scene.children];
    
    objectsToRemove.forEach(object => {
      // Dispose of geometries and materials to prevent memory leaks
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        // Handle materials (could be an array or a single material)
        if (Array.isArray(object.material)) {
          object.material.forEach(material => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        } else {
          if (object.material.map) object.material.map.dispose();
          object.material.dispose();
        }
      }
      
      // Remove from scene
      this.scene.remove(object);
    });
    
    console.log("Scene cleared successfully");
  }

  reset() {
    // Clear all objects from the scene
    this.clearScene();
    
    // Reset camera position
    this.resetCamera();
    
    // Update controls
    this.controls.update();
    
    // Force renderer to clear buffers
    this.renderer.clear();
  }

  setTopView() {
    this.camera.position.set(0, 20, 0)
    this.camera.lookAt(0, 0, 0)
    this.controls.update()
  }

  setPerspectiveView() {
    this.camera.position.set(10, 10, 10)
    this.camera.lookAt(0, 0, 0)
    this.controls.update()
  }

  resetCamera() {
    this.setPerspectiveView()
  }

  focusOnModel() {
    // Find all objects in the scene
    const objects = []
    this.scene.traverse((object) => {
      if (object.isMesh && !(object instanceof THREE.GridHelper) && !(object instanceof THREE.AxesHelper)) {
        objects.push(object)
      }
    })

    if (objects.length === 0) return

    // Create a bounding box that encompasses all objects
    const boundingBox = new THREE.Box3()
    objects.forEach((object) => {
      object.geometry.computeBoundingBox()
      const objectBox = new THREE.Box3().setFromObject(object)
      boundingBox.union(objectBox)
    })

    // Calculate center and size of the bounding box
    const center = new THREE.Vector3()
    boundingBox.getCenter(center)

    const size = new THREE.Vector3()
    boundingBox.getSize(size)

    // Calculate distance based on the size of the model
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 2

    // Position camera to look at the center of the model
    this.camera.position.set(center.x + distance, center.y + distance, center.z + distance)
    this.camera.lookAt(center)
    this.controls.target.copy(center)
    this.controls.update()
  }

  addToScene(object) {
    this.scene.add(object)
  }
  // Add this method to your SceneManager class
  centerModel() {
    if (!this.scene) return;
    
    // Create a bounding box for all objects in the scene
    const boundingBox = new THREE.Box3();
    
    // Track if we found any objects to center
    let objectsFound = false;
    
    // Exclude grid helpers, axes helpers, and lights from the calculation
    this.scene.traverse(object => {
        if (object.isMesh && 
            !(object instanceof THREE.GridHelper) && 
            !(object instanceof THREE.AxesHelper) &&
            !(object instanceof THREE.Light)) {
            boundingBox.expandByObject(object);
            objectsFound = true;
        }
    });
    
    // If no objects found, return
    if (!objectsFound) return;
    
    // Get the center of the bounding box
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    // Move all meshes (except grid, axes, and lights) by the negative center offset
    this.scene.traverse(object => {
        if (object.isMesh && 
            !(object instanceof THREE.GridHelper) && 
            !(object instanceof THREE.AxesHelper) &&
            !(object instanceof THREE.Light)) {
            object.position.x -= center.x;
            object.position.z -= center.z;
            // Keep Y position as is to maintain height
        }
    });
    
    // Update the orbit controls target
    if (this.controls) {
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
  }
 

initSceneElements() {
  // Add grid helper for reference
  const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
  this.scene.add(gridHelper);

  // Add axes helper for orientation
  const axesHelper = new THREE.AxesHelper(0);
  this.scene.add(axesHelper);
  
  // Add lights
  this.initLights();
}

clearScene() {
  // Safety check - if we don't have a scene, recreate it
  if (!this.scene) {
    console.warn("Scene was undefined, recreating it");
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    this.initSceneElements();
    return;
  }

  // First find and preserve lights, grids, and axes
  const lightsAndHelpers = [];
  const objectsToRemove = [];
  
  this.scene.children.forEach(object => {
    if (object instanceof THREE.Light || 
        object instanceof THREE.GridHelper || 
        object instanceof THREE.AxesHelper) {
      lightsAndHelpers.push(object);
    } else {
      objectsToRemove.push(object);
    }
  });
  
  // Now remove only the model objects, not lights and helpers
  objectsToRemove.forEach(object => {
    // Dispose of geometries and materials to prevent memory leaks
    if (object.geometry) {
      object.geometry.dispose();
    }
    
    if (object.material) {
      // Handle materials (could be an array or a single material)
      if (Array.isArray(object.material)) {
        object.material.forEach(material => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      } else {
        if (object.material.map) object.material.map.dispose();
        object.material.dispose();
      }
    }
    
    // Remove from scene
    this.scene.remove(object);
  });
  
  // If somehow we lost our lights or helpers, add them back
  if (lightsAndHelpers.length === 0) {
    this.initSceneElements();
  }
  
  console.log("Scene cleared successfully while preserving lights");
}

}
