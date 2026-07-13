import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class LandingModel {
  constructor(container, modelUrl) {
    this.container = container;
    this.modelUrl = modelUrl;
    this.clock = new THREE.Clock();
    this.rotationSpeed = 0.35;
    this.model = null;
    this.animationId = null;
    this.resizeObserver = null;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    this.camera.position.set(0, 0.6, 3.6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);

    this.setupLights();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xfff0d8, 0x6b3a1a, 2.4);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(2.5, 3.5, 4);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffd7a3, 1.4);
    fill.position.set(-3, 1.5, -2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffa860, 0.8);
    rim.position.set(0, 2, -3);
    this.scene.add(rim);
  }

  async load() {
    const loader = new GLTFLoader();
    const response = await fetch(this.modelUrl);
    if (!response.ok) {
      throw new Error(`模型请求失败: HTTP ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    });

    this.modelRoot.clear();
    this.modelRoot.add(gltf.scene);
    this.model = gltf.scene;

    let maxDim = 0;
    const box = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    box.getSize(size);
    maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 1.3 / maxDim;
      this.model.scale.setScalar(scale);
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    this.model.position.sub(center);
    this.model.position.y -= size.y * 0.1;

    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    this.start();
  }

  start() {
    if (this.animationId) return;
    this.animate();
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    if (this.model) {
      this.modelRoot.rotation.y += delta * this.rotationSpeed;
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
