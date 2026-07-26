"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePortfolio } from "@/context/PortfolioContext";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { loadingManager, particlesReleased } = usePortfolio();

  useEffect(() => {
    if (particlesReleased) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    loadingManager.itemStart("particle-scene");

    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.PointsMaterial | null = null;
    const lines: THREE.Line[] = [];

    const finishLoad = () => {
      try {
        loadingManager.itemEnd("particle-scene");
      } catch {
        /* already ended */
      }
    };

    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      finishLoad();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;

    const count = 9000;
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      pos[i * 3] = orig[i * 3] = x;
      pos[i * 3 + 1] = orig[i * 3 + 1] = y;
      pos[i * 3 + 2] = orig[i * 3 + 2] = z;
      col[i * 3] = 0.75;
      col[i * 3 + 1] = 0.75;
      col[i * 3 + 2] = 0.78;
    }

    geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    mat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(geo, mat));

    for (let i = 0; i < 320; i++) {
      const lGeo = new THREE.BufferGeometry();
      const x = (Math.random() - 0.5) * 300;
      const y = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      const len = 4 + Math.random() * 14;
      lGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array([x, y, z, x, y, z + len]),
          3
        )
      );
      const lMat = new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.25,
      });
      const line = new THREE.Line(lGeo, lMat);
      line.userData.speed = 0.05 + Math.random() * 0.15;
      scene.add(line);
      lines.push(line);
    }

    const mouse3D = new THREE.Vector3();
    const onMove = (e: MouseEvent) => {
      mouse3D.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse3D.x *= 100;
      mouse3D.y = (-(e.clientY / window.innerHeight) * 2 + 1) * 60;
    };
    window.addEventListener("mousemove", onMove);

    const lime = new THREE.Color("#CCFF00");
    const base = new THREE.Color(0.75, 0.75, 0.78);

    const animate = () => {
      if (disposed || !renderer || !geo) return;
      frame = requestAnimationFrame(animate);

      const pA = geo.attributes.position.array as Float32Array;
      const cA = geo.attributes.color.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const iy = ix + 1;
        const dx = pA[ix] - mouse3D.x;
        const dy = pA[iy] - mouse3D.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < 20) {
          const f = (1 - d / 20) * 0.04;
          vel[ix] += dx * f;
          vel[iy] += dy * f;
          const m = Math.min((1 - d / 20) * 0.4, 0.4);
          cA[ix] = base.r + (lime.r - base.r) * m;
          cA[iy] = base.g + (lime.g - base.g) * m;
          cA[ix + 2] = base.b + (lime.b - base.b) * m;
        } else {
          cA[ix] += (base.r - cA[ix]) * 0.05;
          cA[iy] += (base.g - cA[iy]) * 0.05;
          cA[ix + 2] += (base.b - cA[ix + 2]) * 0.05;
        }

        vel[ix] += (orig[ix] - pA[ix]) * 0.003;
        vel[iy] += (orig[iy] - pA[iy]) * 0.003;
        vel[ix] *= 0.88;
        vel[iy] *= 0.88;
        pA[ix] += vel[ix];
        pA[iy] += vel[iy];
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      lines.forEach((line) => {
        const a = line.geometry.attributes.position.array as Float32Array;
        a[2] += line.userData.speed as number;
        a[5] += line.userData.speed as number;
        if (a[2] > 100) {
          a[2] -= 200;
          a[5] -= 200;
        }
        line.geometry.attributes.position.needsUpdate = true;
      });

      renderer.render(scene, camera);
    };

    finishLoad();
    animate();

    const onResize = () => {
      if (!renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer?.dispose();
      geo?.dispose();
      mat?.dispose();
      lines.forEach((line) => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
    };
  }, [loadingManager, particlesReleased]);

  if (particlesReleased) return null;

  return <canvas id="bg" ref={canvasRef} />;
}
