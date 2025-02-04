/**
 * @param  {string} html
 * Convert an HTML string to new Document
 */
export function formatNextDocument(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

/**
 * @param {Element} target
 * @param {Element} source
 * Clone Attributes to new Node
 */
function cloneAttributes(target: Element, source: Element) {
  Array.from(source.attributes).forEach((attr) => {
    target.setAttribute(attr.nodeName, attr.nodeValue);
  });
}

/**
 * @param  {Document} nextDoc
 * Replace Body
 */
export function replaceBody(nextDoc: Document): void {
  const nodesToPreserve = document.body.querySelectorAll('[flamethrower-preserve]');
  nodesToPreserve.forEach((oldDocElement) => {
    let nextDocElement = nextDoc.body.querySelector('[flamethrower-preserve][id="' + oldDocElement.id + '"]');
    if (nextDocElement) {
      // same element found in next doc

      // copy attributes
      cloneAttributes(oldDocElement, nextDocElement);

      // copy new child nodes
      while (oldDocElement.firstChild) {
        oldDocElement.removeChild(oldDocElement.firstChild);
      }
      nextDocElement.childNodes.forEach((node) => oldDocElement.appendChild(node));

      nextDocElement.replaceWith(oldDocElement);
    }
  });

  document.body.replaceWith(nextDoc.body);
}

/**
 * @param  {Document} nextDoc
 * Merge new head data
 */
export function mergeHead(nextDoc: Document): void {
  // Update head
  // Head elements that changed on next document
  const getValidNodes = (doc: Document): Element[] => Array.from(doc.querySelectorAll('head>:not([rel="prefetch"]'));
  const oldNodes = getValidNodes(document);
  const nextNodes = getValidNodes(nextDoc);

  // const { staleNodes, freshNodes } = partitionNodes(oldNodes, nextNodes);

  // staleNodes.forEach((node) => node.remove());

  // document.head.append(...freshNodes);

  // Start merging: Make sure to keep the order of the head tag nextNode
  let i = 0;
  while (i < oldNodes.length && i < nextNodes.length) {
    if (!oldNodes[i].isEqualNode(nextNodes[i])) {
      oldNodes[i].replaceWith(nextNodes[i]);
    }
    i++;
  }
  let j = i;
  while (j < oldNodes.length) {
    oldNodes[j].remove();
    j++;
  }
  j = i;
  while (j < nextNodes.length) {
    document.head.append(nextNodes[j]);
    j++;
  }
}

function partitionNodes(oldNodes: Element[], nextNodes: Element[]): PartitionedNodes {
  const staleNodes: Element[] = [];
  const freshNodes: Element[] = [];
  let oldMark = 0;
  let nextMark = 0;
  while (oldMark < oldNodes.length && nextMark < nextNodes.length) {
    const old = oldNodes[oldMark];
    const next = nextNodes[nextMark];
    if (old.isEqualNode(next)) {
      oldMark++;
      nextMark++;
      continue;
    }
    const oldInFresh = freshNodes.findIndex((node) => node.isEqualNode(old));
    if (oldInFresh !== -1) {
      freshNodes.splice(oldInFresh, 1);
      oldMark++;
      continue;
    }
    const nextInStale = staleNodes.findIndex((node) => node.isEqualNode(next));
    if (nextInStale !== -1) {
      staleNodes.splice(nextInStale, 1);
      nextMark++;
      continue;
    }
    old && staleNodes.push(old);
    next && freshNodes.push(next);
    oldMark++;
    nextMark++;
  }

  return { staleNodes, freshNodes };
}

type PartitionedNodes = {
  freshNodes: Element[];
  staleNodes: Element[];
};

/**
 * Runs JS in the fetched document
 * head scripts will only run with data-reload attr
 * all body scripts will run
 */
export function runScripts(): void {
  // Run scripts with data-reload attr
  const headScripts = document.head.querySelectorAll('[data-reload]');
  // headScripts.forEach(replaceAndRunScript);
  loadScriptSync(headScripts);

  // Run scripts in body
  const bodyScripts = document.body.querySelectorAll('script');
  // bodyScripts.forEach(replaceAndRunScript);
  loadScriptSync(bodyScripts);
}

// Private helper to re-execute scripts
function replaceAndRunScript(oldScript: HTMLScriptElement): void {
  const newScript = document.createElement('script');
  const attrs = Array.from(oldScript.attributes);
  for (const { name, value } of attrs) {
    newScript[name] = value;
  }
  newScript.append(oldScript.textContent);
  oldScript.replaceWith(newScript);
}

// Load array scripts synchronously
function loadScriptSync(scripts: NodeListOf<Element>, index: number = 0): void {
  if(scripts.length == index){
      return;
  }

  let oldScript = scripts[index];
  const newScript = document.createElement('script');
  const attrs = Array.from(oldScript.attributes);
  for (const { name, value } of attrs) {
    newScript.setAttribute(name, value);
  }
  newScript.append(oldScript.textContent);

  // If exist src attribute, add event onload
  if(newScript.src){
    newScript.onload = function () {
      loadScriptSync(scripts, ++index)
    };
    oldScript.replaceWith(newScript);
  }
  else{
    oldScript.replaceWith(newScript);
    loadScriptSync(scripts, ++index)
  }
}
