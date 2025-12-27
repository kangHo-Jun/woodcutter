/**
 * Three.js 기반 재단 결과 3D 프리뷰어
 */

class CuttingThreePreview {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pieces = [];

        this.init();
    }

    init() {
        if (!window.THREE) return;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f7);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
        this.camera.position.set(2000, 1500, 2000);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(500, 1500, 500);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // OrbitControls (CDN에서 로드된 경우)
        if (window.THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
        }

        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * 재단 결과를 3D로 시각화
     */
    update(binWidth, binHeight, placedItems) {
        if (!this.scene) return;

        // 기존 조각 삭제
        this.pieces.forEach(p => this.scene.remove(p));
        this.pieces = [];

        const thickness = 18; // 목재 기본 두께 (18mm)

        // 원판 기저 (Base)
        const baseGeo = new THREE.BoxGeometry(binWidth, thickness - 0.5, binHeight);
        const baseMat = new THREE.MeshPhongMaterial({ color: 0x3d2b1f, transparent: true, opacity: 0.1 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(binWidth / 2, -thickness / 2, binHeight / 2);
        this.scene.add(base);
        this.pieces.push(base);

        // 부품 배치
        placedItems.forEach((item, idx) => {
            const geo = new THREE.BoxGeometry(item.width, thickness, item.height);

            // 색상 및 텍스처 (2D 텍스처를 캔버스에서 가져올 수도 있음)
            const color = item.color || '#4ECDC4';
            const mat = new THREE.MeshPhongMaterial({
                color: color,
                shininess: 30
            });

            const mesh = new THREE.Mesh(geo, mat);
            // 3D 좌표계는 중심 기준이므로 보정 필요
            mesh.position.set(
                item.x + item.width / 2,
                0,
                item.y + item.height / 2
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            this.scene.add(mesh);
            this.pieces.push(mesh);
        });

        // 카메라 초점 조정
        if (this.controls) {
            this.controls.target.set(binWidth / 2, 0, binHeight / 2);
        }
    }
}

window.CuttingThreePreview = CuttingThreePreview;
