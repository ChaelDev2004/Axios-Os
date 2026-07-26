/* eslint-disable react/no-unknown-property */
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { registerMeshline } from "./registerMeshline";
import "./Lanyard.css";

// Custom card design - you can replace these with your own assets
const CARD_GLB = "/lanyard/card.glb";
const LANYARD_TEXTURE = "/lanyard/lanyard.png";

// Fallback texture for card sides
const BLANK_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// UV mapping for front and back of the card
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

type ImageFit = "cover" | "contain";

function drawFaceImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  rect: { x: number; y: number; w: number; h: number },
  canvasW: number,
  canvasH: number,
  imageFit: ImageFit,
  imageScale = 1.1
) {
  const imgW = (img as HTMLImageElement).width;
  const imgH = (img as HTMLImageElement).height;
  const rx = rect.x * canvasW;
  const ry = rect.y * canvasH;
  const rw = rect.w * canvasW;
  const rh = rect.h * canvasH;
  const pick = imageFit === "contain" ? Math.min : Math.max;
  const scale = pick(rw / imgW, rh / imgH) * imageScale;
  const dw = imgW * scale;
  const dh = imgH * scale;
  const dx = rx + (rw - dw) / 2;
  const dy = ry + (rh - dh) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawFrontFace(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  rect: { x: number; y: number; w: number; h: number },
  canvasW: number,
  canvasH: number,
  imageFit: ImageFit,
  cardName: string | null
) {
  const rx = rect.x * canvasW;
  const ry = rect.y * canvasH;
  const rw = rect.w * canvasW;
  const rh = rect.h * canvasH;
  const nameBarH = cardName ? rh * 0.13 : 0;
  const photoH = rh - nameBarH;

  const imgW = (img as HTMLImageElement).width;
  const imgH = (img as HTMLImageElement).height;
  const pick = imageFit === "contain" ? Math.min : Math.max;
  const scale = pick(rw / imgW, photoH / imgH) * 1.18;
  const dw = imgW * scale;
  const dh = imgH * scale;
  const dx = rx + (rw - dw) / 2;
  const dy = ry + (photoH - dh) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, photoH);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  if (!cardName) return;

  ctx.fillStyle = "#f3f3ee";
  ctx.fillRect(rx, ry + photoH, rw, nameBarH);
  ctx.fillStyle = "#121212";
  ctx.font = `800 ${Math.max(12, Math.round(nameBarH * 0.5))}px Montserrat, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cardName, rx + rw / 2, ry + photoH + nameBarH / 2);
}

const LANYARD_BG = "#26242e";

interface LanyardProps {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
  backgroundColor?: string;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: ImageFit;
  lanyardImage?: string | null;
  lanyardWidth?: number;
  cardName?: string | null;
  onReady?: () => void;
  cardScale?: number;
  cardPosition?: [number, number, number];
  showLanyard?: boolean;
  cardRotation?: [number, number, number];
}

interface CardGLTF extends GLTF {
  nodes: {
    card: THREE.Mesh;
    clip: THREE.Mesh;
    clamp: THREE.Mesh;
  };
  materials: {
    base: THREE.MeshPhysicalMaterial;
    metal: THREE.MeshStandardMaterial;
  };
}

interface BandProps {
  maxSpeed?: number;
  minSpeed?: number;
  isMobile?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: ImageFit;
  lanyardImage?: string | null;
  lanyardWidth?: number;
  cardName?: string | null;
  cardScale?: number;
  cardPosition?: [number, number, number];
  showLanyard?: boolean;
  cardRotation?: [number, number, number];
}

type DragState = false | THREE.Vector3;

interface SegmentBody extends RapierRigidBody {
  lerped?: THREE.Vector3;
}

export default function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  backgroundColor = LANYARD_BG,
  frontImage = null,
  backImage = null,
  imageFit = "cover",
  lanyardImage = null,
  lanyardWidth = 1,
  cardName = null,
  onReady,
  cardScale = 2.25,
  cardPosition = [0, -1.2, -0.05],
  showLanyard = true,
  cardRotation = [0, 0, 0],
}: LanyardProps) {
  registerMeshline();

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    useGLTF.preload(CARD_GLB);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position, fov }}
        dpr={[1, isMobile ? 1.25 : 1.5]}
        gl={{ alpha: transparent, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(backgroundColor), transparent ? 0 : 1);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Suspense fallback={null}>
          <LanyardScene
            isMobile={isMobile}
            gravity={gravity}
            frontImage={frontImage}
            backImage={backImage}
            imageFit={imageFit}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
            cardName={cardName}
            onReady={onReady}
            cardScale={cardScale}
            cardPosition={cardPosition}
            showLanyard={showLanyard}
            cardRotation={cardRotation}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

function LanyardReady({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

interface LanyardSceneProps {
  isMobile: boolean;
  gravity: [number, number, number];
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: ImageFit;
  lanyardImage?: string | null;
  lanyardWidth?: number;
  cardName?: string | null;
  onReady?: () => void;
  cardScale?: number;
  cardPosition?: [number, number, number];
  showLanyard?: boolean;
  cardRotation?: [number, number, number];
}

function LanyardScene({
  isMobile,
  gravity,
  frontImage = null,
  backImage = null,
  imageFit = "cover",
  lanyardImage = null,
  lanyardWidth = 1,
  cardName = null,
  onReady,
  cardScale = 2.25,
  cardPosition = [0, -1.2, -0.05],
  showLanyard = true,
  cardRotation = [0, 0, 0],
}: LanyardSceneProps) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
        <Band
          isMobile={isMobile}
          frontImage={frontImage}
          backImage={backImage}
          imageFit={imageFit}
          lanyardImage={lanyardImage}
          lanyardWidth={lanyardWidth}
          cardName={cardName}
          cardScale={cardScale}
          cardPosition={cardPosition}
          showLanyard={showLanyard}
          cardRotation={cardRotation}
        />
      </Physics>
      <ContactShadows
        position={[0, -3.8, 0]}
        opacity={0.42}
        scale={14}
        blur={2.8}
        far={5}
        color="#000000"
      />
      <Environment blur={0.75}>
        <Lightformer
          intensity={2}
          color="white"
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[-1, -1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          color="white"
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={10}
          color="white"
          position={[-10, 0, 14]}
          rotation={[0, Math.PI / 2, Math.PI / 3]}
          scale={[100, 10, 1]}
        />
      </Environment>
      <LanyardReady onReady={onReady} />
    </>
  );
}

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  frontImage = null,
  backImage = null,
  imageFit = "cover",
  lanyardImage = null,
  lanyardWidth = 1,
  cardName = null,
  cardScale = 2.25,
  cardPosition = [0, -1.2, -0.05],
  showLanyard = true,
  cardRotation = [0, 0, 0],
}: BandProps) {
  const band = useRef<THREE.Mesh>(null);
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<SegmentBody>(null!);
  const j2 = useRef<SegmentBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);

  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  const segmentProps = {
    type: "dynamic" as const,
    canSleep: true,
    colliders: false as const,
    angularDamping: 4,
    linearDamping: 4,
  };

  const { nodes, materials } = useGLTF(CARD_GLB) as unknown as CardGLTF;
  const texture = useTexture(lanyardImage || LANYARD_TEXTURE);
  const frontTex = useTexture(frontImage || BLANK_PIXEL);
  const backTex = useTexture(backImage || BLANK_PIXEL);

  const cardMap = useMemo(() => {
    const baseMap = materials.base.map;
    if (!frontImage && !backImage && !cardName) return baseMap;
    if (!baseMap?.image) return baseMap;

    const baseImg = baseMap.image as CanvasImageSource;
    const W = (baseImg as HTMLImageElement).width;
    const H = (baseImg as HTMLImageElement).height;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return baseMap;

    ctx.drawImage(baseImg, 0, 0, W, H);

    if (frontImage && frontTex.image) {
      drawFrontFace(ctx, frontTex.image, FRONT_UV_RECT, W, H, imageFit, cardName);
    } else if (cardName) {
      drawFrontFace(ctx, baseImg, FRONT_UV_RECT, W, H, imageFit, cardName);
    }

    if (backImage && backTex.image) {
      drawFaceImage(ctx, backTex.image, BACK_UV_RECT, W, H, imageFit, 1.15);
    }

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    return composite;
  }, [frontImage, backImage, imageFit, cardName, frontTex, backTex, materials.base.map]);

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, setDragged] = useState<DragState>(false);
  const [hovered, setHovered] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.5, 0],
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? "grabbing" : "grab";
      return () => {
        document.body.style.cursor = "auto";
      };
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    if (fixed.current && j1.current && j2.current && j3.current && card.current && band.current) {
      [j1, j2].forEach((ref) => {
        const body = ref.current;
        if (!body) return;
        if (!body.lerped) body.lerped = new THREE.Vector3().copy(body.translation());
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, body.lerped.distanceTo(body.translation()))
        );
        body.lerped.lerp(
          body.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });

      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped!);
      curve.points[2].copy(j1.current.lerped!);
      curve.points[3].copy(fixed.current.translation());

      if (showLanyard) {
        const geometry = band.current.geometry as THREE.BufferGeometry & {
          setPoints: (points: THREE.Vector3[]) => void;
        };
        geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
      }

      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel(
        { x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
        true
      );
    }
  });

  curve.curveType = "chordal";
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <>
      <group position={[0, 4.1, 0]}>
        <RigidBody ref={fixed} position={[0, 0.6, 0]} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0.02]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0.02]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0.02]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, -0.15, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={cardScale}
            position={cardPosition}
            rotation={cardRotation}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              setDragged(false);
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              if (!card.current) return;
              setDragged(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(vec.copy(card.current.translation()))
              );
            }}
          >
            <mesh geometry={nodes.card.geometry} renderOrder={2}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
                depthTest
                depthWrite
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
              renderOrder={4}
            />
            <mesh
              geometry={nodes.clamp.geometry}
              material={materials.metal}
              material-roughness={0.25}
              material-metalness={0.8}
              renderOrder={4}
            />
          </group>
        </RigidBody>
      </group>
      {showLanyard && (
        <mesh ref={band} renderOrder={1}>
          <meshLineGeometry />
          <meshLineMaterial
            color="white"
            depthTest={false}
            depthWrite={false}
            resolution={isMobile ? [1000, 2000] : [1000, 1000]}
            useMap
            map={texture}
            repeat={[-4, 1]}
            lineWidth={lanyardWidth}
          />
        </mesh>
      )}
    </>
  );
}