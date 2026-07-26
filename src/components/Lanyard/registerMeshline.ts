"use client";

import { extend } from "@react-three/fiber";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";

let registered = false;

export function registerMeshline() {
  if (registered) return;
  extend({ MeshLineGeometry, MeshLineMaterial });
  registered = true;
}
