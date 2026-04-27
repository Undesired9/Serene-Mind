import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Environment, Sparkles } from '@react-three/drei';

const BlobShape = ({ isCrisis, isTyping }) => {
  const meshRef = useRef(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
        // Creates a gently breathing rotating effect
        meshRef.current.rotation.y = time * 0.15;
        meshRef.current.rotation.z = time * 0.1;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={isCrisis ? 1.5 : (isTyping ? 1.3 : 1.2)}>
        <MeshDistortMaterial
          color={isCrisis ? '#991b1b' : (isTyping ? '#C2FFF0' : '#1B98E0')}
          attach="material"
          distort={isCrisis ? 0.6 : (isTyping ? 0.4 : 0.25)} 
          speed={isCrisis ? 4 : (isTyping ? 2.5 : 1.5)} 
          roughness={0.1}
          metalness={0.3}
          clearcoat={1}
          clearcoatRoughness={0.2}
        />
      </Sphere>
      
      {!isCrisis && (
        <Sparkles 
          count={50} 
          scale={isTyping ? 6 : 4} 
          size={isTyping ? 3 : 1.5} 
          speed={isTyping ? 0.6 : 0.2} 
          opacity={isTyping ? 0.6 : 0.3} 
          color="#C2FFF0" 
        />
      )}
    </group>
  );
};

export default function SereneBlob({ isCrisis, isTyping }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-20 transition-opacity duration-1000 flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#0E7C7B" />
        <BlobShape isCrisis={isCrisis} isTyping={isTyping} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
