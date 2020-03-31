import './CommunicationLocalSimulation.scss';

import { addNode, addSomeNode, communicationLocal, connectedNodes, kickSomeone } from 'mesh-messager-local';
import React from 'react';

import { Node } from '../../../mesh-messager-core/build';
import NodeDisplayer from '../NodeDisplayer';

window.onkeypress = async (event: KeyboardEvent) => {
  switch (event.key) {
    case "=":
    case "+":
      const n = await addSomeNode();
      setTimeout(() => n.startLifecycle(), 1000);
      break;
    case "-":
      kickSomeone();
      break;
  }
};

(window as any).clearNodes = () => {
  Object.values(connectedNodes).forEach(node => {
    node.stopLifecycle();
    delete connectedNodes[node.id.toString()];
  });
};
(window as any).getNode = (id: string) => connectedNodes[id];
(window as any).getFingers = (id: string) => connectedNodes[id].fingers;
(window as any).kickNode = (id: string) => {
  const node = connectedNodes[id];
  node.stopLifecycle();

  delete connectedNodes[id];
};
(window as any).addNode = (id: string, to: string = id) => {
  const node = new Node(communicationLocal, BigInt(id), BigInt(to));

  if (id !== to) node.joinNode(BigInt(to));

  connectedNodes[id] = node;

  node.startLifecycle();
};

(async () => {
  const rootNode = new Node(communicationLocal).setLogging(false);
  addNode(rootNode);

  const delay = 10;
  await Promise.all(
    new Array(10).fill(null).map(async (_, i) => {
      await new Promise(res => setTimeout(() => res(), delay * i));
      const n = await addSomeNode();
      n.startLifecycle();
    })
  );

  console.log("firstly connectedNodes:", Object.keys(connectedNodes).length);

  // Object.values(connectedNodes).forEach(n => console.log(n.toString()));

  // const changeInterval = 500;
  // setInterval(() => {
  //   if (Math.random() > 0.5) addSomeNode();
  // }, changeInterval);

  // setTimeout(
  //   () =>
  //     setInterval(() => {
  //       if (Math.random() > 0.5) kickSomeone();
  //     }, changeInterval),
  //   1000
  // );
})();

const CommunicationLocalSimulation = () => {
  return <NodeDisplayer nodes={connectedNodes} />;
};

export default CommunicationLocalSimulation;
