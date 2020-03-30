import './index.scss';

import { addNode, communicationLocal, connectedNodes } from 'mesh-messager-local';
import React from 'react';
import { render } from 'react-dom';

import { Node } from '../../mesh-messager-core/build';
import { register } from './serviceWorker';
import TestComponent from './TestComponent';

const rootNode = new Node(communicationLocal).setLogging(false);
addNode(rootNode);
console.log(connectedNodes, rootNode);

// here we disable console and performance for better production experience
// console.log(process.env.NODE_ENV);
// if (!process || !process.env || process.env.NODE_ENV !== "development") {
//   performance.mark = () => undefined as any;
//   performance.measure = () => undefined as any;
//   console.log = () => undefined as any;
// }

const App = () => (
  <div styleName="a">
    kek <TestComponent />
  </div>
);

render(<App />, document.getElementById("root"));

register();
