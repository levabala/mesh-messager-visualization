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

(async () => {
  const rootNode = new Node(communicationLocal).setLogging(false);
  addNode(rootNode);

  const delay = 10;
  await Promise.all(
    new Array(10).fill(null).map(async (_, i) => {
      await new Promise(res => setTimeout(() => res(), delay * i));
      addSomeNode();
    })
  );

  Object.values(connectedNodes).map(node => node.startLifecycle());

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
