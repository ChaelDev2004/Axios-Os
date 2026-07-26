export {};

declare module "meshline" {
  export const MeshLineGeometry: typeof import("three").BufferGeometry;
  export const MeshLineMaterial: typeof import("three").Material;
}

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: Record<string, unknown>;
    meshLineMaterial: Record<string, unknown>;
  }
}
