import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//
// Configuración básica: renderer, escena y cámara
//
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Configuración de la cámara (vista en tercera persona)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.set(10, 100, 10);
scene.add(camera);

//
// Carga el Skybox
//
const skyboxLoader = new GLTFLoader().setPath('public/skybox/');
skyboxLoader.load('scene.gltf', (gltf) => {
  const skybox = gltf.scene;
  skybox.scale.set(2000, 2000, 2000);
  scene.add(skybox);
}, (xhr) => {
  console.log(`Skybox loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
}, (error) => {
  console.error('Error cargando skybox:', error);
});

//
// Contenedor para la nave
//
const shipContainer = new THREE.Object3D();
shipContainer.rotation.y = Math.PI;
scene.add(shipContainer);

//
// Carga el modelo del Millennium Falcon
//
let falconModel; // variable global para acceder al modelo posteriormente
const falconLoader = new GLTFLoader().setPath('public/millennium_falcon/');
falconLoader.load('scene.gltf', (gltf) => {
  console.log('Cargando modelo Falcon');
  const falcon = gltf.scene;
  falcon.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  falcon.position.set(0, 0, 0);
  falcon.rotation.set(0, Math.PI / 1, 0);
  
  // Ajuste de escala basado en el ancho de pantalla
  updateFalconScale(falcon);

  shipContainer.add(falcon);
  falconModel = falcon; // guardar para futuras actualizaciones
  
  document.getElementById('progress-container').style.display = 'none';
}, (xhr) => {
  console.log(`Falcon loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
}, (error) => {
  console.error('Error cargando Falcon:', error);
});

// Función para actualizar la escala del modelo Falcon según el ancho de pantalla
function updateFalconScale(model) {
  // Si el ancho de pantalla es menor a 788px, reducir la escala
  if (window.innerWidth < 788) {
    model.scale.set(0.5, 0.5, 0.5);
  } else {
    model.scale.set(1, 1, 1);
  }
}

//
// Agrega el spotLight 
//
const spotLight = new THREE.SpotLight(0xffffff, 3000, 100, 0.29, 1);
spotLight.position.set(0, 25, 0); // Posición relativa al shipContainer
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0001;

// Crea un objeto para el target del spotlight y posicionarlo en (0,0,0) por default
const spotLightTarget = new THREE.Object3D();
spotLightTarget.position.set(0, 0, 0);
shipContainer.add(spotLightTarget);
spotLight.target = spotLightTarget;

// Agregar el spotlight al shipContainer para que se mueva con la nave
shipContainer.add(spotLight);

//
// Variables para controlar la navegación
//
const rotationSpeed = 0.02; // velocidad de giro
const moveSpeed = 0.2;      // velocidad de avance 

// FLAGS de control para movimiento continuo
let advancing = false;
let turningLeft = false;
let turningRight = false;

// Variables para el efecto de inclinación (lean)
let currentLean = 0;
let targetLean = 0;
const leanAngle = 0.2; // ángulo máximo de inclinación (en radianes)

// Funciones para iniciar/detener el movimiento continuo
function setAdvancing(state) { advancing = state; }
function setTurningLeft(state) { turningLeft = state; }
function setTurningRight(state) { turningRight = state; }

// Función helper para añadir eventos tanto de mouse como de touch
function addPointerListeners(elementId, startCallback, endCallback) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Eventos de ratón
  element.addEventListener('mousedown', (event) => {
    event.preventDefault();
    startCallback();
  });
  element.addEventListener('mouseup', (event) => {
    event.preventDefault();
    endCallback();
  });
  element.addEventListener('mouseleave', (event) => {
    event.preventDefault();
    endCallback();
  });
  
  // Eventos táctiles
  element.addEventListener('touchstart', (event) => {
    event.preventDefault();
    startCallback();
  });
  element.addEventListener('touchend', (event) => {
    event.preventDefault();
    endCallback();
  });
  element.addEventListener('touchcancel', (event) => {
    event.preventDefault();
    endCallback();
  });
}

// Añadir listeners para los botones de navegación
addPointerListeners('avanzar', () => setAdvancing(true), () => setAdvancing(false));
addPointerListeners('girarIzquierda', () => setTurningLeft(true), () => setTurningLeft(false));
addPointerListeners('girarDerecha', () => setTurningRight(true), () => setTurningRight(false));

//
// Event listeners para las teclas W, A, D y las flechas direccionales
//
document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'w':
    case 'ArrowUp':
      setAdvancing(true);
      break;
    case 'a':
    case 'ArrowLeft':
      setTurningLeft(true);
      break;
    case 'd':
    case 'ArrowRight':
      setTurningRight(true);
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'w':
    case 'ArrowUp':
      setAdvancing(false);
      break;
    case 'a':
    case 'ArrowLeft':
      setTurningLeft(false);
      break;
    case 'd':
    case 'ArrowRight':
      setTurningRight(false);
      break;
  }
});

//
// Actualiza la cámara para que siga la nave en vista en tercera persona
//
const cameraOffset = new THREE.Vector3(0, 5, 10); // Ajusta según necesites

function updateCamera() {
  const offsetRotated = cameraOffset.clone().applyQuaternion(shipContainer.quaternion);
  const desiredCameraPos = shipContainer.position.clone().add(offsetRotated);
  camera.position.lerp(desiredCameraPos, 0.1); // Transición suave
  camera.lookAt(shipContainer.position);
}

//
// Manejar el redimensionamiento de la ventana
//
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Actualiza la escala del Falcon si ya se cargó
  if (falconModel) {
    updateFalconScale(falconModel);
  }
});

//
// Bucle de animación
//
function animate() {
  requestAnimationFrame(animate);

  // Si se presiona avanzar, mueve la nave en la dirección a la que apunta (eje Z negativo)
  if (advancing) {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(shipContainer.quaternion);
    forward.multiplyScalar(moveSpeed);
    shipContainer.position.add(forward);
  }

  // Si se está girando, actualiza la rotación continua
  if (turningLeft) {
    shipContainer.rotation.y += rotationSpeed;
    targetLean = leanAngle;
  } else if (turningRight) {
    shipContainer.rotation.y -= rotationSpeed;
    targetLean = -leanAngle;
  } else {
    targetLean = 0;
  }

  // Interpolar la inclinación para suavizar el efecto
  currentLean = THREE.MathUtils.lerp(currentLean, targetLean, 0.1);
  shipContainer.rotation.z = currentLean;

  // Actualiza el target del spotlight
  // Cuando la nave avanza, se desplaza el target hacia adelante; si gira, se añade un offset lateral.
  let desiredSpotTarget = new THREE.Vector3(0, 0, 0);
  if (advancing) {
    desiredSpotTarget.z = -3; // desplaza hacia adelante en el espacio local
  }
  if (turningLeft) {
    desiredSpotTarget.x = 2.5;  // desplaza lateralmente a la derecha
  } else if (turningRight) {
    desiredSpotTarget.x = -2.5; // desplaza lateralmente a la izquierda
  }
  // Interpolación para suavizar la animación
  spotLightTarget.position.lerp(desiredSpotTarget, 0.1);

  updateCamera();
  renderer.render(scene, camera);
}

animate();

//
// Variables de estado para controles UI
//
let controlsVisible = true;
let userToggled = false;

function toggleControls(event) {
  if (event) event.stopPropagation();
  
  const helpPanel = document.getElementById('key-help');
  controlsVisible = !controlsVisible;

  if (event && event.type === 'click') userToggled = true;
  
  helpPanel.classList.toggle('collapsed', !controlsVisible);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('key-help').addEventListener('click', toggleControls);
  
  document.addEventListener('keydown', (event) => {
    if (['w','ArrowUp','a','ArrowLeft','d','ArrowRight'].includes(event.key)) {
      if (controlsVisible && !userToggled) {
        toggleControls();
      }
    }
  });

  ['avanzar', 'girarIzquierda', 'girarDerecha'].forEach(id => {
    const elem = document.getElementById(id);
    if (!elem) return;
    // Para mouse
    elem.addEventListener('mousedown', () => {
      if (controlsVisible && !userToggled) {
        toggleControls();
      }
    });
    // Para touch
    elem.addEventListener('touchstart', () => {
      if (controlsVisible && !userToggled) {
        toggleControls();
      }
    });
  });

  setInterval(() => {
    if (userToggled) {
      userToggled = false;
      if (!controlsVisible) toggleControls();
    }
  }, 5000);
});
