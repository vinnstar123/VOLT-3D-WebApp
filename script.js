//Only run the code if on the page with the canvas
const canvas = document.getElementById('threeContainer');

if (canvas) {

    //Variables
    let scene, camera, renderer, controls, clock;
    let mixer;
    let actions = [];
    let loadedModel;
    let isWireframe = false;
    let isRotating = false;

    const modelList = [
        {
            path: './assets/models/Drink_Can.glb',
            name: 'VOLT Original',
            description: 'Click "Open Can" to release the lightning.'
        },
        {
            path: './assets/models/Drink_Can_Sugarfree.glb',
            name: 'VOLT Sugar Free',
            description: 'All the power. None of the sugar.'
        },
        {
            path: './assets/models/Drink_Bottle.glb',
            name: 'VOLT Original Bottled',
            description: 'The original, in a premium glass bottle.'
        }
    ];
    let currentModelIndex = 0;

    let hemiLight, dirLight;
    let isBright = true;

    let listener, canSound, bottleSound;

    init();
    animate();

    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x001F5C);

        //Camera perspective and position
        camera = new THREE.PerspectiveCamera(
            45,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 40);

        //Audio listener
        listener = new THREE.AudioListener();
        camera.add(listener);

        canSound = new THREE.Audio(listener);
        bottleSound = new THREE.Audio(listener);

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./assets/sounds/can_opening.mp3', function (buffer) {
            canSound.setBuffer(buffer);
            canSound.setVolume(0.7);
        });
        audioLoader.load('./assets/sounds/bottle_pop.mp3', function (buffer) {
            bottleSound.setBuffer(buffer);
            bottleSound.setVolume(0.7);
        });

        //Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        clock = new THREE.Clock();

        //Lights
        hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        //Rotational controls
        controls = new THREE.OrbitControls(camera, canvas);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.25;
        controls.target.set(0, 1, 0);
        controls.update();

        const urlParams = new URLSearchParams(window.location.search);
        const requestedModel = urlParams.get('model');
        if (requestedModel === 'sugarfree') {
            currentModelIndex = 1;
        } else if (requestedModel === 'bottle') {
            currentModelIndex = 2;
        } else {
            currentModelIndex = 0;
        }

        //Load appropriate model
        loadCurrentModel();

        window.addEventListener('resize', onWindowResize);

        //Open can button
        const btnPlay = document.getElementById('btnPlayAnimation');
        if (btnPlay) {
            btnPlay.addEventListener('click', function () {
                //Animation
                if (actions.length > 0) {
                    actions.forEach(function (action) {
                        action.reset();
                        action.setLoop(THREE.LoopOnce);
                        action.clampWhenFinished = true;
                        action.play();
                    });
                }

                //Sound
                const isBottle = modelList[currentModelIndex].name.includes('Bottle');
                const soundToPlay = isBottle ? bottleSound : canSound;

                if (soundToPlay && soundToPlay.buffer) {
                    if (soundToPlay.isPlaying) {
                        soundToPlay.stop();
                    }
                    soundToPlay.play();
                }
            });
        }

        //Wireframe button
        const btnWireframe = document.getElementById('btnWireframe');
        if (btnWireframe) {
            btnWireframe.addEventListener('click', function () {
                isWireframe = !isWireframe;

                if (loadedModel) {
                    loadedModel.traverse(function (child) {
                        if (child.isMesh && child.material) {
                            child.material.wireframe = isWireframe;
                        }
                    });
                }
                btnWireframe.textContent = isWireframe ? 'Solid' : 'Wireframe';
            });
        }

        //Rotate model button
        const btnRotate = document.getElementById('btnRotate');
        if (btnRotate) {
            btnRotate.addEventListener('click', function () {
                isRotating = !isRotating;
                btnRotate.textContent = isRotating ? 'Stop Rotate' : 'Rotate';
            });
        }

        //Next model button
        const btnSwitch = document.getElementById('btnSwitchModel');
        if (btnSwitch) {
            btnSwitch.addEventListener('click', function () {
                currentModelIndex = (currentModelIndex + 1) % modelList.length;
                loadCurrentModel();
            });
        }

        //Switch lighting button
        const btnLights = document.getElementById('btnLights');
        if (btnLights) {
            btnLights.addEventListener('click', function () {
                isBright = !isBright;

                if (isBright) {
                    hemiLight.intensity = 1;
                    dirLight.intensity = 1;
                    dirLight.color.setHex(0xffffff);
                    btnLights.textContent = 'Dim Lights';
                } else {
                    hemiLight.intensity = 0.2;
                    dirLight.intensity = 0.5;
                    dirLight.color.setHex(0x66aaff);
                    btnLights.textContent = 'Bright Lights';
                }
            });
        }
    }

    //Loads requested model
    function swapModel(path) {

        //Remove previous model
        if (loadedModel) {
            scene.remove(loadedModel);
            loadedModel = null;
            actions = [];
            mixer = null;
        }

        const loader = new THREE.GLTFLoader();
        loader.load(
            path,
            function (gltf) {
                loadedModel = gltf.scene;
                scene.add(loadedModel);

                if (gltf.animations && gltf.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(loadedModel);
                    gltf.animations.forEach((clip) => {
                        const action = mixer.clipAction(clip);
                        actions.push(action);
                    });
                }

                console.log('Model loaded:', path);
                console.log('Animations found:', gltf.animations.length);
            },
            function (error) {
                console.error('Error loading model:', error);
            }
        );
    }

    //Choose which model and presentation
    function loadCurrentModel() {
        const m = modelList[currentModelIndex];
        swapModel(m.path);

        if (loadedModel) loadedModel.rotation.set(0, 0, 0);

        const nameElement = document.getElementById('modelName');
        const descElement = document.getElementById('modelDescription');
        if (nameElement) nameElement.textContent = m.name;
        if (descElement) descElement.textContent = m.description;

        const btnWireframe = document.getElementById('btnWireframe');
        if (btnWireframe) {
            isWireframe = false;
            btnWireframe.textContent = 'Wireframe';
        }

        const btnPlay = document.getElementById('btnPlayAnimation');
        if (btnPlay) {
            btnPlay.textContent = m.name.includes('Bottle') ? 'Open Bottle' : 'Open Can';
        }
    }

    //Animation
    function animate() {
        requestAnimationFrame(animate);

        if (mixer) {
            mixer.update(clock.getDelta());
        }

         if (isRotating && loadedModel) {
            loadedModel.rotation.y += 0.01;
        }

        controls.update();
        renderer.render(scene, camera);
    }

    function onWindowResize() {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

}