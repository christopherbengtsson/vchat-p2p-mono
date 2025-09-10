import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DeviceService } from '../../service/DeviceService';
import { StarColorUtil } from '../../utils/StarColorUtil';

const BASE_STAR_COUNT = 2000;
const MOBILE_MULTIPLIER = 0.4;
const MIN_STAR_COUNT = 300;
const SPHERE_RADIUS = 3;
const RADIUS_VARIATION = 0.8;
const PULSE_AMPLITUDE = 0.3;

const vertexShader = `
      precision highp float;
      
      attribute vec3 aOffset;
      attribute vec3 aColor;
      attribute float aScale;
      attribute float aSpeed;
      attribute float aPhase;
      attribute float aPulse;
      
      uniform float uTime;
      uniform bool uAutoRotate;
      uniform bool uPulseEnabled;
      
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 center = aOffset;
        
        // Conditional rotation
        if (uAutoRotate) {
          float angle = uTime * aSpeed + aPhase;
          float c = cos(angle);
          float s = sin(angle);
          
          float rx = center.x * c - center.z * s;
          float rz = center.x * s + center.z * c;
          center = vec3(rx, center.y, rz);
        }

        // Conditional pulsing
        float finalScale = aScale;
        if (uPulseEnabled) {
          float pulse = 1.0 + sin(uTime * aPulse + aPhase) * ${PULSE_AMPLITUDE};
          finalScale *= pulse;
        }

        vec3 scaledPos = position * finalScale;
        vec4 mvPosition = modelViewMatrix * vec4(center + scaledPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vColor = aColor;
        
        // Distance-based alpha for depth effect
        float distance = length(mvPosition.xyz);
        vAlpha = 1.0 - smoothstep(3.0, 12.0, distance);
      }
    `;

const fragmentShader = `
      precision highp float;
      
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        // Apply gamma correction for accurate colors
        vec3 gammaCorrected = pow(vColor, vec3(1.0/2.2));
        
        // Subtle glow effect
        float glow = 0.5 + 0.5 * vAlpha;
        
        gl_FragColor = vec4(gammaCorrected * glow, vAlpha);
      }
    `;

interface Props {
  countOverride?: number;
  autoRotate?: boolean;
  pulseEnabled?: boolean;
}

export function StarSphere({
  countOverride,
  autoRotate = true,
  pulseEnabled = true,
}: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTimeRef = useRef(0);

  const deviceCapability = useMemo(() => {
    const isMobile = DeviceService.isMobile();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memoryGb = (navigator as any)?.deviceMemory || (isMobile ? 2 : 4); // Assume mobile has less memory

    const cores = navigator.hardwareConcurrency || 4;
    const isLowEnd = isMobile || memoryGb < 4 || cores < 4;

    return {
      isLowEnd,
      multiplier: isLowEnd ? MOBILE_MULTIPLIER : 1.0,
    };
  }, []);

  const targetCount = useMemo(() => {
    if (countOverride !== undefined) {
      return Math.max(MIN_STAR_COUNT, countOverride);
    }

    return Math.max(
      MIN_STAR_COUNT,
      Math.floor(BASE_STAR_COUNT * deviceCapability.multiplier),
    );
  }, [countOverride, deviceCapability.multiplier]);

  const starData = useMemo(() => {
    const positions = new Float32Array(targetCount * 3);
    const colors = new Float32Array(targetCount * 3);
    const scales = new Float32Array(targetCount);
    const speeds = new Float32Array(targetCount);
    const phases = new Float32Array(targetCount);
    const pulses = new Float32Array(targetCount);

    for (let i = 0; i < targetCount; i++) {
      // Fibonacci sphere distribution for even spacing
      const phi = Math.acos(1 - (2 * (i + 0.5)) / targetCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const radius = SPHERE_RADIUS + (Math.random() - 0.5) * RADIUS_VARIATION;

      positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);

      const color = new THREE.Color(StarColorUtil.getRandom());
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      scales[i] = Math.random() * 0.8 + 0.2;
      speeds[i] = Math.random() * 0.02 + 0.01;
      phases[i] = Math.random() * Math.PI * 2;
      pulses[i] = Math.random() * 0.03 + 0.01;
    }

    return { positions, colors, scales, speeds, phases, pulses };
  }, [targetCount]);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAutoRotate: { value: autoRotate },
        uPulseEnabled: { value: pulseEnabled },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [autoRotate, pulseEnabled]);

  // Setup geometry attributes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geometry = mesh.geometry;

    geometry.setAttribute(
      'aOffset',
      new THREE.InstancedBufferAttribute(starData.positions, 3),
    );
    geometry.setAttribute(
      'aColor',
      new THREE.InstancedBufferAttribute(starData.colors, 3),
    );
    geometry.setAttribute(
      'aScale',
      new THREE.InstancedBufferAttribute(starData.scales, 1),
    );
    geometry.setAttribute(
      'aSpeed',
      new THREE.InstancedBufferAttribute(starData.speeds, 1),
    );
    geometry.setAttribute(
      'aPhase',
      new THREE.InstancedBufferAttribute(starData.phases, 1),
    );
    geometry.setAttribute(
      'aPulse',
      new THREE.InstancedBufferAttribute(starData.pulses, 1),
    );

    // Optimize geometry
    geometry.computeBoundingSphere();

    return () => {
      geometry.deleteAttribute('aOffset');
      geometry.deleteAttribute('aColor');
      geometry.deleteAttribute('aScale');
      geometry.deleteAttribute('aSpeed');
      geometry.deleteAttribute('aPhase');
      geometry.deleteAttribute('aPulse');
    };
  }, [starData]);

  // Update shader uniforms when props change
  useEffect(() => {
    shaderMaterial.uniforms.uAutoRotate.value = autoRotate;
    shaderMaterial.uniforms.uPulseEnabled.value = pulseEnabled;
  }, [shaderMaterial, autoRotate, pulseEnabled]);

  // Initialize start time
  useEffect(() => {
    startTimeRef.current = performance.now() / 1000;
  }, []);

  // Animation loop
  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  useEffect(() => {
    const mesh = meshRef.current;

    return () => {
      shaderMaterial?.dispose();
      mesh?.geometry?.dispose();
    };
  }, [shaderMaterial]);

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, shaderMaterial, targetCount]}
        frustumCulled={false}
      >
        <sphereGeometry
          args={[
            0.02,
            deviceCapability.isLowEnd ? 4 : 6,
            deviceCapability.isLowEnd ? 4 : 6,
          ]}
        />
      </instancedMesh>
    </>
  );
}
