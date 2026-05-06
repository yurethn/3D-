import { Text } from '@react-three/drei';
import { CellState, InteractionMode } from '../types';
import { useState } from 'react';
import * as THREE from 'three';

interface CellProps {
  cell: CellState;
  onReveal: (x: number, y: number, z: number) => void;
  onFlag: (x: number, y: number, z: number) => void;
  gameSize: number;
  isVisible: boolean;
  interactionMode: InteractionMode;
}

export function Cell({ cell, onReveal, onFlag, gameSize, isVisible, interactionMode }: CellProps) {
  const [hovered, setHovered] = useState(false);
  
  if (cell.shattered || !isVisible) return null;

  // Offset to center the grid
  const offset = (gameSize - 1) / 2;
  const position: [number, number, number] = [cell.x - offset, cell.y - offset, cell.z - offset];

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (e.button === 0) {
      if (interactionMode === 'reveal') {
        onReveal(cell.x, cell.y, cell.z);
      } else {
        onFlag(cell.x, cell.y, cell.z);
      }
    } else if (e.button === 2) {
      onFlag(cell.x, cell.y, cell.z);
    }
  };

  if (cell.isRevealed && !cell.isMine && cell.neighborMines === 0) {
    // If revealed and no neighborhood mines, don't show the cube to allow seeing inside
    return null;
  }

  // Determine appearance
  let color = '#3b82f6'; // Hidden default blue
  let opacity = 0.8;
  let transparent = true;
  let label = '';
  let labelColor = 'white';

  if (cell.isRevealed) {
    if (cell.isMine) {
      color = '#ef4444'; // Red for mine
      opacity = 1;
      transparent = false;
    } else {
      color = '#e2e8f0'; // Grayish white for revealed
      opacity = 0.15; // More transparent for revealed cells with numbers
      transparent = true;
      if (cell.neighborMines > 0) {
        label = cell.neighborMines.toString();
        // Custom vibrant colors for 3D visibility
        const colors = [
          '#3b82f6', // 1: Blue
          '#10b981', // 2: Green
          '#ef4444', // 3: Red
          '#8b5cf6', // 4: Purple
          '#f59e0b', // 5: Orange
          '#06b6d4', // 6: Cyan
          '#ec4899', // 7: Pink
          '#1e293b', // 8: Dark Slate
          '#ffffff', // 9+: White
        ];
        labelColor = colors[Math.min(cell.neighborMines - 1, colors.length - 1)];
      }
    }
  } else if (cell.isFlagged) {
    color = '#f59e0b'; // Amber for flags
    opacity = 1;
    transparent = false;
  }

  // Highlight on hover
  if (hovered && !cell.isRevealed) {
    color = cell.isFlagged ? '#fbbf24' : '#60a5fa';
  }

  return (
    <group position={position}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
        onContextMenu={(e) => {
           e.nativeEvent.preventDefault();
           handleClick(e);
        }}
      >
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshStandardMaterial 
          color={color} 
          transparent={transparent} 
          opacity={opacity} 
          metalness={0.2}
          roughness={0.1}
          emissive={hovered && !cell.isRevealed ? '#ffffff' : '#000000'}
          emissiveIntensity={0.1}
        />
      </mesh>
      {cell.isRevealed && !cell.isMine && cell.neighborMines > 0 && (
        <Text
          position={[0, 0, 0.46]} // Slightly in front of the front face
          fontSize={0.5}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
      {cell.isRevealed && !cell.isMine && cell.neighborMines > 0 && (
        <>
          <Text position={[0, 0, -0.46]} rotation={[0, Math.PI, 0]} fontSize={0.5} color={labelColor}>{label}</Text>
          <Text position={[0.46, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.5} color={labelColor}>{label}</Text>
          <Text position={[-0.46, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.5} color={labelColor}>{label}</Text>
          <Text position={[0, 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color={labelColor}>{label}</Text>
          <Text position={[0, -0.46, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={0.5} color={labelColor}>{label}</Text>
        </>
      )}
      {cell.isFlagged && !cell.isRevealed && (
        <Text position={[0, 0, 0.5]} fontSize={0.6} color="red" anchorX="center" anchorY="middle">🚩</Text>
      )}
      {cell.isRevealed && cell.isMine && (
        <Text position={[0, 0, 0.5]} fontSize={0.6} color="black" anchorX="center" anchorY="middle">💣</Text>
      )}
    </group>
  );
}
