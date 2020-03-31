import './NodeDisplayer.scss';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDebounce, useKeyPress, useWindowSize } from 'use-hooks';

import { Node } from '../../../mesh-messager-core/build';

export interface NodeDisplayerProps {
  nodes: Record<string, Node>;
}

interface DD {
  x: number;
  y: number;
}

export interface NodeVisual {
  nodeData: Node;
  pos: DD;
  radius: number;
}

export interface ConnectionVisual {
  from: string;
  to: string;
}

const INTERACTION_SCALE = 10e-9;
const CONNECTIVITY_SCALE = 10e3;
const OPTIMAL_DISTANCE = 400;
const OPTIMAL_DISTANCE_CONNECTED = OPTIMAL_DISTANCE / 2;
const MAX_FORCE = OPTIMAL_DISTANCE_CONNECTED / 10;

const CAMERA_CHANGE_SCALE = 10e-3;
const CAMERA_MAX_DELTA = 5;

function calcGravitationForce(distance: number, connected: boolean): number {
  return (
    Math.pow(
      distance - (connected ? OPTIMAL_DISTANCE_CONNECTED : OPTIMAL_DISTANCE),
      3
    ) /
    (1 / INTERACTION_SCALE)
  );
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getOffset(p1: DD, p2: DD): DD {
  return {
    x: p2.x - p1.x,
    y: p2.y - p1.y
  };
}

function getDistance(offset: DD): number {
  const { x, y } = offset;
  return Math.sqrt(x ** 2 + y ** 2);
}

function startRendering(
  nodesMap: Record<string, Node>,
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  let visualNodes: NodeVisual[] = [];
  const cameraPosition: DD = { x: width / 2, y: height / 2 };
  // let visualConnections : ConnectionVisual[] = [];

  function process(timeDelta: number) {
    // update collection
    visualNodes = Object.values(nodesMap).map(
      node =>
        visualNodes.find(n => node === n.nodeData) || {
          pos: { x: rand(0, width), y: rand(0, height) },
          nodeData: node,
          radius: 25
        }
    );

    // move nodes
    visualNodes.forEach(node => {
      const velocity = visualNodes.reduce(
        (acc, node2) => {
          if (node.nodeData === node2.nodeData) return acc;

          const n1 = node.nodeData;
          const n2 = node2.nodeData;

          const areConnected = n1.successor === n2.id || n2.successor === n1.id;

          const offset = getOffset(node.pos, node2.pos);
          const dist = getDistance(offset);
          const interactionForceRaw =
            calcGravitationForce(dist, areConnected) *
            timeDelta *
            (areConnected ? CONNECTIVITY_SCALE : 1);

          const interactionForce =
            interactionForceRaw < 0
              ? Math.max(interactionForceRaw, -MAX_FORCE)
              : Math.min(interactionForceRaw, MAX_FORCE);

          const angle = Math.atan2(offset.x, offset.y);

          // console.log(dist, "=>", interactionForce, offset, angle);

          const interactionX = Math.sin(angle) * interactionForce;
          const interactionY = Math.cos(angle) * interactionForce;

          const { x, y } = acc;
          if (
            isNaN(interactionX) ||
            isNaN(interactionY) ||
            interactionX === Infinity ||
            interactionY === Infinity
          )
            debugger;

          // debugger;

          return {
            x: x + interactionX,
            y: y + interactionY
          };
        },
        { x: 0, y: 0 }
      );

      // console.log(velocity.x, velocity.y);

      node.pos.x += velocity.x;
      node.pos.y += velocity.y;
    });

    const newCameraPosition = visualNodes.reduce(
      (acc, node) => {
        return {
          x: acc.x + node.pos.x / visualNodes.length,
          y: acc.y + node.pos.y / visualNodes.length
        };
      },
      { x: 0, y: 0 }
    );

    const cameraDelta = getOffset(cameraPosition, newCameraPosition);
    const cameraDeltaScaled: DD = {
      x: cameraDelta.x * CAMERA_CHANGE_SCALE,
      y: cameraDelta.y * CAMERA_CHANGE_SCALE
    };

    const cameraDeltaLimited: DD = {
      x:
        cameraDeltaScaled.x < 0
          ? Math.max(cameraDeltaScaled.x, -CAMERA_MAX_DELTA)
          : Math.min(cameraDeltaScaled.x, CAMERA_MAX_DELTA),
      y:
        cameraDeltaScaled.y < 0
          ? Math.max(cameraDeltaScaled.y, -CAMERA_MAX_DELTA)
          : Math.min(cameraDeltaScaled.y, CAMERA_MAX_DELTA)
    };

    cameraPosition.x += cameraDeltaLimited.x;
    cameraPosition.y += cameraDeltaLimited.y;

    // if (Math.random() > 0.99) {
    //   console.log(visualNodes);
    //   console.log(cameraPosition);
    // }
  }

  function draw() {
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(0, 0, width, height);

    ctx.closePath();

    function drawNode({
      radius,
      pos: { x, y },
      nodeData: { id, dead }
    }: NodeVisual) {
      ctx.fillStyle = dead ? "whitesmoke" : "lightgray";
      ctx.strokeStyle = "gray";

      const centerX = x - radius / 2;
      const centerY = y - radius / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.closePath();

      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "25px Arial";
      ctx.fillText(Node.shortId(id), centerX, centerY);
    }

    function drawConnection({ nodeData, pos, radius }: NodeVisual) {
      function drawArrow(
        fromx: number,
        fromy: number,
        tox: number,
        toy: number
      ) {
        const headlen = 10; // length of head in pixels
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.lineTo(
          tox - headlen * Math.cos(angle - Math.PI / 6),
          toy - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(tox, toy);
        ctx.lineTo(
          tox - headlen * Math.cos(angle + Math.PI / 6),
          toy - headlen * Math.sin(angle + Math.PI / 6)
        );
      }

      if (nodeData.successor === nodeData.id) return;

      const succ = visualNodes.find(
        node => node.nodeData.id === nodeData.successor
      );
      if (!succ) return;

      ctx.strokeStyle = "black";

      const posCenter: DD = {
        x: pos.x - radius / 2,
        y: pos.y - radius / 2
      };

      const offset: DD = getOffset(pos, succ.pos);
      const dist = getDistance(offset);
      const angle = Math.atan2(offset.x, offset.y);
      const arrowLength = dist - radius;
      const arrow: DD = {
        x: posCenter.x + arrowLength * Math.sin(angle),
        y: posCenter.y + arrowLength * Math.cos(angle)
      };

      ctx.beginPath();
      if (
        succ.nodeData.predecessor &&
        succ.nodeData.predecessor === nodeData.id
      )
        ctx.lineWidth = 2;
      else ctx.lineWidth = 1;

      drawArrow(posCenter.x, posCenter.y, arrow.x, arrow.y);
      ctx.closePath();

      ctx.stroke();
    }

    ctx.translate(
      -cameraPosition.x + width / 2,
      -cameraPosition.y + height / 2
    );

    // const centerRadius = 5;
    // ctx.fillStyle = "red";
    // ctx.arc(-centerRadius / 2, -centerRadius / 2, centerRadius, 0, Math.PI * 2);
    // ctx.fill();
    // ctx.closePath();

    visualNodes.forEach(node => drawConnection(node));
    visualNodes.forEach(node => drawNode(node));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  let timePrev = Date.now();
  let id = 0;
  const tick = () => {
    const timeNow = Date.now();
    const timeDelta = timeNow - timePrev;

    process(timeDelta);
    draw();

    id = requestAnimationFrame(tick);
    timePrev = timeNow;
  };

  tick();

  return () => cancelAnimationFrame(id);
}

const NodeDisplayer = ({ nodes }: NodeDisplayerProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const { height, width } = useWindowSize();
  const windowSize = useMemo(() => ({ height, width }), [height, width]);
  const windowSizeD = useDebounce(windowSize, 500);

  const abortFunction = useRef(() => {});

  const rPressed = useKeyPress("r", true);

  const restart = useCallback(() => {
    abortFunction.current();

    const canvas = canvasRef.current as HTMLCanvasElement;
    const { offsetHeight: height, offsetWidth: width } = canvas;

    abortFunction.current = startRendering(nodes, canvas, width, height);
  }, [nodes]);

  useLayoutEffect(() => {
    const el = wrapperRef.current as HTMLDivElement;
    setCanvasSize({ width: el.offsetWidth, height: el.offsetHeight });
  }, [windowSizeD]);

  useEffect(() => {
    restart();
  }, [restart, canvasSize]);

  useEffect(() => {
    if (rPressed) restart();
  }, [rPressed, restart]);

  return useMemo(
    () => (
      <div styleName="nodeDisplayer" ref={wrapperRef}>
        <canvas ref={canvasRef} {...canvasSize} />
      </div>
    ),
    [canvasSize]
  );
};

export default NodeDisplayer;
