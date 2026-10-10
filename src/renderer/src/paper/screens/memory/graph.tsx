/** WebGL force graph for the memory browser, with SVG fallback when WebGL
 *  is missing or the context is lost. Colour is always paired with a label
 *  or the legend. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { forceLayout, type Positions } from '@/components/memoryGraph/forceLayout';
import { clusterHue, type GNode, type GraphModel } from './model';

function colorOf(cluster: number, kind: 'agent' | 'topic'): string {
  const h = clusterHue(cluster);
  return kind === 'agent' ? `hsl(${h} 62% 42%)` : `hsl(${h} 48% 62%)`;
}

function rgba(cluster: number, kind: 'agent' | 'topic'): [number, number, number, number] {
  const h = clusterHue(cluster) / 360;
  const s = kind === 'agent' ? 0.62 : 0.48;
  const l = kind === 'agent' ? 0.42 : 0.62;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4), 1];
}

function layoutOf(model: GraphModel, w: number, h: number): Positions {
  const n = model.nodes.length;
  const iterations = n > 200 ? 28 : n > 80 ? 80 : 220;
  return forceLayout(
    model.nodes.map((node) => ({ id: node.id, gravityBias: node.kind === 'agent' ? 1.4 : 0.7 })),
    model.edges.map((e) => ({ source: e.source, target: e.target, strength: 0.45 })),
    { width: Math.max(120, w), height: Math.max(120, h), iterations, padding: 48 }
  );
}

function nearest(nodes: GNode[], pos: Positions, x: number, y: number): GNode | null {
  let best: GNode | null = null;
  let bestD = 18 * 18;
  for (const n of nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const r = n.kind === 'agent' ? 16 : 10;
    const d = dx * dx + dy * dy;
    if (d < r * r && d < bestD) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

const VS = `
attribute vec2 a_pos;
attribute vec4 a_color;
attribute float a_size;
uniform vec2 u_res;
uniform float u_dpr;
varying vec4 v_color;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size * u_dpr;
  v_color = a_color;
}`;
const FS = `
precision mediump float;
varying vec4 v_color;
uniform float u_point;
void main() {
  if (u_point > 0.5) {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = dot(p, p);
    if (d > 1.0) discard;
    gl_FragColor = vec4(v_color.rgb, v_color.a * smoothstep(1.0, 0.55, d));
  } else {
    gl_FragColor = v_color;
  }
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function program(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VS);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

type GlHandle = {
  gl: WebGLRenderingContext;
  prog: WebGLProgram;
  buf: WebGLBuffer;
  draw: (model: GraphModel, pos: Positions, w: number, h: number, hi: string | null) => void;
  drop: () => void;
};

function attachGl(canvas: HTMLCanvasElement): GlHandle | null {
  const opts: WebGLContextAttributes = { antialias: true, alpha: true, premultipliedAlpha: false, failIfMajorPerformanceCaveat: false };
  const gl = (canvas.getContext('webgl', opts) ?? canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
  if (!gl) return null;
  const prog = program(gl);
  const buf = gl.createBuffer();
  if (!prog || !buf) return null;
  const locPos = gl.getAttribLocation(prog, 'a_pos');
  const locCol = gl.getAttribLocation(prog, 'a_color');
  const locSize = gl.getAttribLocation(prog, 'a_size');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uDpr = gl.getUniformLocation(prog, 'u_dpr');
  const uPoint = gl.getUniformLocation(prog, 'u_point');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const draw = (model: GraphModel, pos: Positions, w: number, h: number, hi: string | null): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uDpr, dpr);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);

    const edges = new Float32Array(model.edges.length * 2 * 7);
    let ei = 0;
    for (const e of model.edges) {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      if (!a || !b) continue;
      const col: [number, number, number, number] = [0.55, 0.55, 0.6, 0.35];
      edges[ei++] = a.x; edges[ei++] = a.y; edges[ei++] = col[0]; edges[ei++] = col[1]; edges[ei++] = col[2]; edges[ei++] = col[3]; edges[ei++] = 0;
      edges[ei++] = b.x; edges[ei++] = b.y; edges[ei++] = col[0]; edges[ei++] = col[1]; edges[ei++] = col[2]; edges[ei++] = col[3]; edges[ei++] = 0;
    }
    const packed = edges.subarray(0, ei);
    gl.bufferData(gl.ARRAY_BUFFER, packed, gl.DYNAMIC_DRAW);
    const stride = 28;
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(locCol);
    gl.vertexAttribPointer(locCol, 4, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(locSize);
    gl.vertexAttribPointer(locSize, 1, gl.FLOAT, false, stride, 24);
    gl.uniform1f(uPoint, 0);
    if (ei) gl.drawArrays(gl.LINES, 0, ei / 7);

    const pts = new Float32Array(model.nodes.length * 7);
    let pi = 0;
    for (const n of model.nodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      const c = rgba(n.cluster, n.kind);
      const dim = hi && n.kind === 'agent' && n.agentIds[0] !== hi && n.id !== `agent:${hi}`;
      pts[pi++] = p.x;
      pts[pi++] = p.y;
      pts[pi++] = c[0];
      pts[pi++] = c[1];
      pts[pi++] = c[2];
      pts[pi++] = dim ? 0.28 : 1;
      pts[pi++] = n.kind === 'agent' ? (n.id === `agent:${hi}` || n.agentIds[0] === hi ? 22 : 16) : 9;
    }
    gl.bufferData(gl.ARRAY_BUFFER, pts.subarray(0, pi), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(locCol, 4, gl.FLOAT, false, stride, 8);
    gl.vertexAttribPointer(locSize, 1, gl.FLOAT, false, stride, 24);
    gl.uniform1f(uPoint, 1);
    if (pi) gl.drawArrays(gl.POINTS, 0, pi / 7);
  };

  const drop = (): void => {
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
  };
  return { gl, prog, buf, draw, drop };
}

function NodeTip({ node }: { node: GNode }): JSX.Element {
  return (
    <div>
      <strong>{node.label}</strong>
      <div>{node.kind === 'agent' ? 'Agent' : 'Topic'} · cluster {node.cluster + 1}</div>
      {node.kind === 'topic' ? <div>Shared by {node.weight} agents</div> : null}
    </div>
  );
}

export function MemoryGraph({
  model,
  highlightAgent,
  onPick
}: {
  model: GraphModel;
  highlightAgent: string | null;
  onPick: (node: GNode) => void;
}): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GlHandle | null>(null);
  const posRef = useRef<Positions>(new Map());
  const [dims, setDims] = useState({ w: 640, h: 420 });
  const [webgl, setWebgl] = useState(true);
  const [hover, setHover] = useState<{ node: GNode; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 8 && r.height > 8) setDims({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => layoutOf(model, dims.w, dims.h),
    [model, dims.w, dims.h]
  );
  posRef.current = layout;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !webgl) return;
    const handle = attachGl(canvas);
    if (!handle) {
      setWebgl(false);
      return;
    }
    glRef.current = handle;
    const onLost = (e: Event): void => {
      e.preventDefault();
      setWebgl(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      handle.drop();
      glRef.current = null;
    };
  }, [webgl]);

  useEffect(() => {
    if (!webgl) return;
    let raf = 0;
    const tick = (): void => {
      glRef.current?.draw(model, posRef.current, dims.w, dims.h, highlightAgent);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [webgl, model, layout, dims.w, dims.h, highlightAgent]);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const node = nearest(model.nodes, posRef.current, x, y);
    setHover(node ? { node, x, y } : null);
  }, [model.nodes]);

  const onClick = useCallback(() => {
    if (hover) onPick(hover.node);
  }, [hover, onPick]);

  const labels = model.nodes.filter((n) => n.kind === 'agent');

  return (
    <div
      ref={wrapRef}
      className="pm-graph"
      role="img"
      aria-label={`Memory graph with ${model.nodes.length} nodes and ${model.edges.length} links. Colour is explained in the legend. Click a node to filter.`}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onClick={onClick}
    >
      {webgl ? (
        <canvas ref={canvasRef} width={dims.w} height={dims.h} aria-hidden="true" />
      ) : (
        <svg viewBox={`0 0 ${dims.w} ${dims.h}`} width={dims.w} height={dims.h} aria-hidden="true">
          {model.edges.map((e, i) => {
            const a = layout.get(e.source);
            const b = layout.get(e.target);
            if (!a || !b) return null;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--paper-border-strong)" strokeOpacity={0.55} />;
          })}
          {model.nodes.map((n) => {
            const p = layout.get(n.id);
            if (!p) return null;
            return (
              <circle
                key={n.id}
                cx={p.x}
                cy={p.y}
                r={n.kind === 'agent' ? 8 : 5}
                fill={colorOf(n.cluster, n.kind)}
                stroke={highlightAgent && n.agentIds.includes(highlightAgent) ? 'var(--paper-text)' : 'transparent'}
                strokeWidth={2}
              />
            );
          })}
        </svg>
      )}
      <div className="pm-graph-plot" dir="ltr" aria-hidden="true">
        {labels.map((n) => {
          const p = layout.get(n.id);
          if (!p) return null;
          return (
            <span
              key={n.id}
              className="pm-node-label"
              style={{ insetInlineStart: p.x + 10, insetBlockStart: p.y - 7 }}
            >
              {n.label}
            </span>
          );
        })}
      </div>
      {hover ? (
        <div className="paper-hover-card pm-hover" style={{ left: hover.x, top: hover.y }}>
          <NodeTip node={hover.node} />
        </div>
      ) : null}
      <div className="pm-graph-legend" aria-hidden="true">
        {model.clusters.map((c) => (
          <span key={c.id}>
            <span className="pm-swatch" style={{ background: colorOf(c.id, 'agent') }} />
            {c.label}
          </span>
        ))}
        <span>
          <span className="pm-swatch" style={{ background: colorOf(0, 'topic') }} />
          Topic
        </span>
      </div>
      <ul className="pm-sr">
        {model.nodes.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => onPick(n)}>
              {n.kind === 'agent' ? 'Agent' : 'Topic'} {n.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
