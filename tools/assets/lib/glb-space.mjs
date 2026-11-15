// Desfaz a quantização (KHR_mesh_quantization) de um GLB de personagem já gerado e volta tudo
// para o espaço do modelo em metros, como estava antes do `quantize()` do build. Assim o refit
// (refit.mjs) mede o corpo e encaixa peças novas com as mesmas medidas do build original.
import * as THREE from 'three';

const mat4 = (a) => new THREE.Matrix4().fromArray(a);

/** Leva malhas skinadas de volta para metros e refaz as matrizes inversas de bind. */
export function dequantizeSkinned(doc) {
  const root = doc.getRoot();
  for (const skin of root.listSkins()) {
    const joints = skin.listJoints();
    const ibmAcc = skin.getInverseBindMatrices();
    const ibm = ibmAcc.getArray();
    // IBM_quantizado = IBM_original · Q, e IBM_original = (mundo do osso no bind)⁻¹  ⇒  Q = mundo · IBM
    const Q = mat4(joints[0].getWorldMatrix()).multiply(mat4(Array.from(ibm.slice(0, 16))));
    for (let j = 1; j < joints.length; j++) {
      const q = mat4(joints[j].getWorldMatrix()).multiply(mat4(Array.from(ibm.slice(j * 16, j * 16 + 16))));
      const d = q.elements.reduce((s, v, k) => Math.max(s, Math.abs(v - Q.elements[k])), 0);
      if (d > 1e-3) throw new Error(`osso ${joints[j].getName()} com bind diferente (${d})`);
    }
    const N = new THREE.Matrix3().getNormalMatrix(Q);
    const done = new Set();
    for (const node of root.listNodes()) {
      if (node.getSkin() !== skin || !node.getMesh()) continue;
      for (const prim of node.getMesh().listPrimitives()) {
        for (const sem of ['POSITION', 'NORMAL']) {
          const acc = prim.getAttribute(sem);
          if (!acc || done.has(acc)) continue;
          done.add(acc);
          const out = new Float32Array(acc.getCount() * 3);
          const v = new THREE.Vector3(), el = [];
          for (let i = 0; i < acc.getCount(); i++) {
            acc.getElement(i, el);
            v.set(el[0], el[1], el[2]);
            if (sem === 'POSITION') v.applyMatrix4(Q); else v.applyMatrix3(N).normalize();
            out.set([v.x, v.y, v.z], i * 3);
          }
          acc.setArray(out).setNormalized(false);
        }
        for (const sem of prim.listSemantics()) {
          const acc = prim.getAttribute(sem);
          if (!/^(TEXCOORD|WEIGHTS|COLOR)/.test(sem) || !acc.getNormalized() || done.has(acc)) continue;
          done.add(acc);
          const out = new Float32Array(acc.getCount() * acc.getElementSize()), el = [];
          for (let i = 0; i < acc.getCount(); i++) { acc.getElement(i, el); out.set(el, i * el.length); }
          acc.setArray(out).setNormalized(false);
        }
      }
    }
    const fresh = new Float32Array(joints.length * 16);
    joints.forEach((j, k) => fresh.set(mat4(j.getWorldMatrix()).invert().elements, k * 16));
    ibmAcc.setArray(fresh);
  }
}
