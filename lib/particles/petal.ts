/**
 * Petal particle with physics-based motion.
 * Implements aerodynamic forces, state machine for motion styles,
 * and interaction with neighbors.
 */

import * as THREE from 'three';
import { SimplexNoise } from '@/lib/noise/simplex-noise';
import { petalVertexShader, petalFragmentShader } from '@/lib/graphics/petal-shaders';
import { ClusterSpawner } from './cluster-spawner';
import { AirPocketSystem } from './air-pocket-system';
import { PHYSICS, STATE, type PetalsConfig } from './types';

/**
 * A single petal particle with full physics simulation.
 */
export class Petal {
  index: number;
  clusterId: number;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3;
  mass: number;
  area: number;
  scale: number;
  width: number;
  radius: number;
  beta: number;
  froudeNumber: number;
  state: number;
  stateTime: number;
  stateDuration: number;
  flutterOmega: number;
  flutterPhase: number;
  flutterAmplitude: number;
  tumbleAxis: THREE.Vector3;
  tumbleSpeed: number;
  inCuspTurn: boolean;
  cuspElevation: number;
  timeOffset: number;
  noiseOffset: THREE.Vector3;
  prevVelocityX: number;

  private clusterSpawner: ClusterSpawner;
  private config: PetalsConfig;

  constructor(
    geometry: THREE.ShapeGeometry,
    index: number,
    clusterId: number,
    clusterSpawner: ClusterSpawner,
    config: PetalsConfig,
    petalTexture: THREE.CanvasTexture,
    translucencyMap: THREE.CanvasTexture
  ) {
    this.index = index;
    this.clusterId = clusterId;
    this.clusterSpawner = clusterSpawner;
    this.config = config;

    const color = clusterSpawner.getClusterColor(clusterId);

    const material = new THREE.ShaderMaterial({
      vertexShader: petalVertexShader,
      fragmentShader: petalFragmentShader,
      uniforms: {
        uColor: { value: color },
        uTexture: { value: petalTexture },
        uTranslucency: { value: translucencyMap },
        uLightPos: { value: new THREE.Vector3(5, 10, 5) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;

    const scale = 0.6 + Math.random() * 0.9;
    this.mesh.scale.setScalar(scale);
    this.scale = scale;
    this.width = scale * 0.14;
    this.radius = scale * 0.1;

    this.position = clusterSpawner.getSpawnPosition(clusterId);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      -0.05 - Math.random() * 0.05,
      (Math.random() - 0.5) * 0.1
    );

    this.quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )
    );
    this.angularVelocity = new THREE.Vector3(0, 0, 0);

    this.mass = 0.12 + Math.random() * 0.2;
    this.area = scale * scale;
    this.beta = 0.05 + Math.random() * 0.15;
    this.froudeNumber = 0;

    this.state = STATE.FLUTTERING;
    this.stateTime = 0;
    this.stateDuration = 1 + Math.random() * 2;

    this.flutterOmega = PHYSICS.OMEGA_FLUTTER * (0.7 + Math.random() * 0.5);
    this.flutterPhase = Math.random() * Math.PI * 2;
    this.flutterAmplitude = 0.25 + Math.random() * 0.25;

    this.tumbleAxis = new THREE.Vector3().randomDirection();
    this.tumbleSpeed = 0;

    this.inCuspTurn = false;
    this.cuspElevation = 0;

    this.timeOffset = Math.random() * 100;
    this.noiseOffset = new THREE.Vector3(
      Math.random() * 100,
      Math.random() * 100,
      Math.random() * 100
    );

    this.prevVelocityX = 0;
  }

  private getPetalNormal(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
  }

  private updateFroudeNumber(): void {
    const speed = this.velocity.length();
    this.froudeNumber = speed / Math.sqrt(0.65 * this.width);
  }

  private calculateDrag(velocity: THREE.Vector3): THREE.Vector3 {
    const speed = velocity.length();
    if (speed < 0.001) return new THREE.Vector3(0, 0, 0);

    const velDir = velocity.clone().normalize();
    const normal = this.getPetalNormal();
    const cosAlpha = Math.abs(velDir.dot(normal));
    const sinAlpha = Math.sqrt(1 - cosAlpha * cosAlpha);
    const CD = PHYSICS.CD_0 * cosAlpha * cosAlpha + PHYSICS.CD_90 * sinAlpha * sinAlpha;

    return velDir.multiplyScalar(-0.5 * CD * this.area * speed * speed);
  }

  private calculateLift(velocity: THREE.Vector3, angularSpeed: number): THREE.Vector3 {
    const speed = velocity.length();
    if (speed < 0.02) return new THREE.Vector3(0, 0, 0);

    const velDir = velocity.clone().normalize();
    const normal = this.getPetalNormal();
    const sinTwoAlpha = 2 * normal.dot(velDir) * Math.sqrt(1 - Math.pow(normal.dot(velDir), 2));

    const translationalLift = -0.5 * PHYSICS.CT * this.width * speed * speed * sinTwoAlpha;
    const rotationalLift = 0.5 * PHYSICS.CR * this.width * this.width * angularSpeed * speed;
    const totalLift = translationalLift + rotationalLift;

    const liftDir = new THREE.Vector3().crossVectors(velDir, normal);
    if (liftDir.lengthSq() < 0.0001) return new THREE.Vector3(0, 0, 0);
    liftDir.cross(velDir).normalize();
    if (liftDir.y < 0) liftDir.negate();

    return liftDir.multiplyScalar(Math.abs(totalLift));
  }

  private detectCuspTurn(): void {
    const velocitySignChanged = this.velocity.x * this.prevVelocityX < 0;
    const isSlowing = this.velocity.length() < 0.12;

    if (velocitySignChanged && isSlowing && !this.inCuspTurn) {
      this.inCuspTurn = true;
      this.cuspElevation = 0.25 + Math.random() * 0.15;
    }

    if (this.inCuspTurn) {
      this.cuspElevation *= 0.94;
      if (this.cuspElevation < 0.01) this.inCuspTurn = false;
    }

    this.prevVelocityX = this.velocity.x;
  }

  private updateState(time: number): void {
    this.updateFroudeNumber();
    this.stateTime += 0.016;

    if (this.froudeNumber < PHYSICS.FR_CRITICAL * 0.5) {
      if (this.state !== STATE.FLUTTERING && this.state !== STATE.CUSP_TURN && Math.random() < 0.015) {
        this.state = STATE.FLUTTERING;
        this.flutterPhase = time * this.flutterOmega;
      }
    } else if (this.froudeNumber > PHYSICS.FR_CRITICAL * 1.2) {
      if (this.state !== STATE.TUMBLING && Math.random() < 0.01) {
        this.state = STATE.TUMBLING;
        this.tumbleAxis.randomDirection();
        this.tumbleSpeed = PHYSICS.OMEGA_TUMBLE * (0.7 + Math.random() * 0.5);
      }
    } else {
      if (Math.random() < 0.005) {
        this.state = STATE.CHAOTIC;
        this.stateDuration = 0.4 + Math.random() * 0.8;
      }
    }

    if (this.inCuspTurn && this.state !== STATE.CUSP_TURN) {
      this.state = STATE.CUSP_TURN;
      this.stateDuration = 0.15 + Math.random() * 0.25;
    }

    if (this.state === STATE.CUSP_TURN && !this.inCuspTurn) {
      this.state = STATE.FLUTTERING;
      this.flutterPhase = time * this.flutterOmega;
    }

    if (this.stateTime > this.stateDuration) {
      this.state = STATE.FLUTTERING;
      this.stateTime = 0;
      this.stateDuration = 1 + Math.random() * 2;
    }
  }

  private getFlockingForce(nearbyPetals: Petal[]): THREE.Vector3 {
    const cohesion = new THREE.Vector3(0, 0, 0);
    const alignment = new THREE.Vector3(0, 0, 0);
    const separation = new THREE.Vector3(0, 0, 0);
    let neighborCount = 0;

    for (const other of nearbyPetals) {
      if (other === this) continue;

      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();

      if (dist < 1.5 && dist > 0.01) {
        cohesion.sub(diff);
        alignment.add(other.velocity);

        if (dist < 0.4) {
          separation.add(diff.normalize().multiplyScalar(0.4 - dist));
        }

        neighborCount++;
      }
    }

    const force = new THREE.Vector3(0, 0, 0);

    if (neighborCount > 0) {
      cohesion.divideScalar(neighborCount);
      force.add(cohesion.multiplyScalar(this.config.cohesionStrength));

      alignment.divideScalar(neighborCount);
      alignment.sub(this.velocity);
      force.add(alignment.multiplyScalar(this.config.alignmentStrength));

      force.add(separation.multiplyScalar(0.05));
    }

    return force;
  }

  private getWakeInfluence(nearbyPetals: Petal[]): THREE.Vector3 {
    const wake = new THREE.Vector3(0, 0, 0);

    for (const other of nearbyPetals) {
      if (other === this) continue;

      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();

      if (dist < 1.8 && dist > 0.05) {
        const otherSpeed = other.velocity.length();
        if (otherSpeed > 0.025) {
          const velDir = other.velocity.clone().normalize();
          const behindness = diff.normalize().dot(velDir);

          if (behindness > 0.15) {
            const strength = (1 - dist / 1.8) * behindness * otherSpeed * 0.25;
            wake.y -= strength * 0.35;
            wake.x += (Math.random() - 0.5) * strength * 0.4;
            wake.z += (Math.random() - 0.5) * strength * 0.4;
          }
        }
      }
    }

    return wake;
  }

  private handleCollisions(nearbyPetals: Petal[]): void {
    for (const other of nearbyPetals) {
      if (other === this || other.index <= this.index) continue;

      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();
      const minDist = this.radius + other.radius;

      if (dist < minDist && dist > 0.001) {
        const overlap = minDist - dist;
        const normal = diff.normalize();

        this.position.add(normal.clone().multiplyScalar(overlap * 0.5));
        other.position.sub(normal.clone().multiplyScalar(overlap * 0.5));

        const relVel = this.velocity.clone().sub(other.velocity);
        const velAlongNormal = relVel.dot(normal);

        if (velAlongNormal < 0) {
          const impulse = -1.3 * velAlongNormal * 0.4;
          const impulseVec = normal.clone().multiplyScalar(impulse);

          this.velocity.add(impulseVec.clone().divideScalar(this.mass));
          other.velocity.sub(impulseVec.clone().divideScalar(other.mass));

          const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0));
          this.angularVelocity.add(tangent.multiplyScalar(impulse * 1.5));
        }
      }
    }
  }

  update(
    time: number,
    deltaTime: number,
    nearbyPetals: Petal[],
    noise: SimplexNoise,
    airPockets: AirPocketSystem
  ): void {
    const t = time + this.timeOffset;

    this.detectCuspTurn();
    this.updateState(time);

    // Wind from curl noise
    const windScale = 0.05;
    const curlWind = noise
      .curl(
        this.position.x * windScale + t * 0.035,
        this.position.y * windScale + t * 0.02,
        this.position.z * windScale
      )
      .multiplyScalar(0.18);

    curlWind.x += noise.fbm(t * 0.025, this.position.y * 0.1, this.position.z * 0.1, 2) * 0.1;
    curlWind.z += noise.fbm(this.position.x * 0.1, t * 0.025, this.position.y * 0.1, 2) * 0.1;

    const airPocketForce = airPockets.getForceAt(this.position);
    const wakeForce = this.getWakeInfluence(nearbyPetals);
    const flockingForce = this.getFlockingForce(nearbyPetals);

    const gravity = new THREE.Vector3(0, -0.6, 0);

    const stateForce = new THREE.Vector3(0, 0, 0);
    const stateAngular = new THREE.Vector3(0, 0, 0);

    switch (this.state) {
      case STATE.FLUTTERING: {
        const phase = t * this.flutterOmega + this.flutterPhase;
        stateForce.x += Math.cos(phase) * this.flutterAmplitude * 0.18;
        stateAngular.x = Math.cos(phase) * 0.9;
        stateAngular.z = -Math.cos(phase) * 0.7;
        stateAngular.x += Math.sin(t * 3.2 + this.flutterPhase) * 0.25;
        stateAngular.z += Math.cos(t * 2.8 + this.flutterPhase) * 0.25;
        break;
      }

      case STATE.TUMBLING: {
        stateAngular.add(this.tumbleAxis.clone().multiplyScalar(this.tumbleSpeed));
        stateForce.x += Math.sin(t * 4.5) * 0.08;
        stateForce.z += Math.cos(t * 4) * 0.08;
        this.tumbleSpeed *= 0.994;
        break;
      }

      case STATE.CHAOTIC: {
        stateForce.x += noise.noise3D(t * 1.8, this.noiseOffset.x, 0) * 0.12;
        stateForce.z += noise.noise3D(this.noiseOffset.y, t * 1.8, 0) * 0.12;
        stateAngular.x = noise.noise3D(t * 2.5, 0, this.noiseOffset.z) * 1.8;
        stateAngular.y = noise.noise3D(0, t * 2.5, this.noiseOffset.x) * 1.3;
        stateAngular.z = noise.noise3D(this.noiseOffset.y, 0, t * 2.5) * 1.8;
        break;
      }

      case STATE.CUSP_TURN: {
        gravity.y *= 0.08;
        stateForce.y += this.cuspElevation;
        stateAngular.x = Math.sin(t * 3.5) * 1.8;
        stateAngular.z = Math.cos(t * 3) * 1.8;
        break;
      }

      case STATE.GLIDING: {
        gravity.y *= 0.25;
        const glideDir = this.velocity.clone();
        glideDir.y = 0;
        if (glideDir.length() > 0.01) {
          stateForce.add(glideDir.normalize().multiplyScalar(0.15));
        }
        const normal = this.getPetalNormal();
        stateAngular.x -= normal.x * 0.8;
        stateAngular.z -= normal.z * 0.8;
        break;
      }
    }

    const angularSpeed = this.angularVelocity.length();
    const drag = this.calculateDrag(this.velocity);
    const lift = this.calculateLift(this.velocity, angularSpeed);

    const totalForce = new THREE.Vector3()
      .add(gravity)
      .add(curlWind)
      .add(airPocketForce)
      .add(wakeForce)
      .add(flockingForce)
      .add(drag)
      .add(lift)
      .add(stateForce);

    this.velocity.add(totalForce.clone().multiplyScalar(deltaTime / this.mass));

    const maxSpeed = PHYSICS.TERMINAL_VELOCITY * 1.8;
    if (this.velocity.length() > maxSpeed) {
      this.velocity.normalize().multiplyScalar(maxSpeed);
    }

    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    this.handleCollisions(nearbyPetals);

    this.angularVelocity.lerp(stateAngular, deltaTime * 4.5);
    this.angularVelocity.multiplyScalar(0.92);

    const rotationDelta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        this.angularVelocity.x * deltaTime,
        this.angularVelocity.y * deltaTime,
        this.angularVelocity.z * deltaTime
      )
    );
    this.quaternion.multiply(rotationDelta).normalize();

    // Boundary wrapping
    const bounds = this.config.spread;
    if (this.position.y < -bounds.y / 2 - 2) this.reset();
    if (this.position.x < -bounds.x / 2 - 2) this.position.x = bounds.x / 2 + 2;
    if (this.position.x > bounds.x / 2 + 2) this.position.x = -bounds.x / 2 - 2;
    if (this.position.z < -bounds.z / 2 - 2) this.position.z = bounds.z / 2 + 2;
    if (this.position.z > bounds.z / 2 + 2) this.position.z = -bounds.z / 2 - 2;

    // Sync mesh
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);
  }

  reset(): void {
    this.position = this.clusterSpawner.getSpawnPosition(this.clusterId);
    this.velocity.set(
      (Math.random() - 0.5) * 0.1,
      -0.05 - Math.random() * 0.05,
      (Math.random() - 0.5) * 0.1
    );
    this.angularVelocity.set(0, 0, 0);
    this.state = STATE.FLUTTERING;
    this.stateTime = 0;
    this.inCuspTurn = false;
    this.prevVelocityX = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.ShaderMaterial).dispose();
  }
}
