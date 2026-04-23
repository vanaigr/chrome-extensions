importScripts('autofill.js');
const autofill = globalThis.autofill

chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'run') return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
        await run(tab);
    } catch (e) {
        console.error('[AX Tree Clicker]', e);
    }
});

async function run(tab) {
    const target = { tabId: tab.id };
    await chrome.debugger.attach(target, '1.3');
    try {
        await send(target, 'Accessibility.enable');
        await send(target, 'DOM.enable');
        await send(target, 'Runtime.enable');

        await performAction(target, tab)
    } finally {
        await chrome.debugger.detach(target).catch(() => {});
    }
}

async function performAction(target, tab) {
    const hostname = new URL(tab.url).hostname

    if(hostname.endsWith('workday.com') || hostname.endsWith('myworkdayjobs.com')) {
        await selectRadio(target, ['previously worked', 'been employed'], ['no'])
        await selectOption(target, [/phone.+?type/i], ['mobile'])

        await fillInput(target, 'address line 1', autofill.street)
        await fillInput(target, 'postal code', autofill.zip)

        await selectOption(target, ['sponsorship'], ['no'])
        await selectOption(target, ['ever worked'], ['no'])
        await selectOption(target, ['convicted'], ['no'])
        await selectOption(target, ['legally permitted'], ['yes'])
        await selectOption(target, [/updates.+?sms/i], ['no'])

        await selectOption(target, ['gender', 'sex'], ['not declared', 'male'])
        await selectOption(target, ['hispanic'], ['no'])
        await selectOption(target, ['race'], ['not wish', 'white'])
        await selectOption(target, ['veteran'], ['decline', 'not a'])

        await fillInput(target, /^Name$/, autofill.fullName)

        const today = new Date()
        await fillSpinbutton(target, /^Month$/, 1 + today.getMonth())
        await fillSpinbutton(target, /^Day$/, today.getDate())
        await fillSpinbutton(target, /^Year$/, today.getFullYear())

        await selectCheckbox(target, 'I do not want to answer')
        await selectCheckbox(target, 'terms and conditions')
    }
    else if(hostname.endsWith('applytojob.com')) {
        await fillInput(target, 'first name', autofill.firstName)
        await fillInput(target, 'last name', autofill.lastName)
        await fillInput(target, 'email', autofill.email)
        await fillInput(target, 'phone', autofill.phone)
        await fillInput(target, 'linkedin', autofill.linkedin)
        await fillInput(target, /^address/i, autofill.street)
        await fillInput(target, 'city', autofill.city)
        await fillInput(target, 'state', autofill.state)
        await fillInput(target, 'postal', autofill.zip)

        await selectCombobox(target, ['18 years'], ['yes'])
        await selectCombobox(target, ['live in the United States'], ['yes'])
        await selectCombobox(target, ['sponsorship'], [/no$/i])
        await selectCombobox(target, ['citizenship'], [/non-citizen allowed to work for any/i])

        await fillInput(target, /^Name$/, autofill.fullName)

        const today = new Date()
        await fillInput(
            target,
            /^Date$/,
            today.getFullYear()
                + '-' + (1 + today.getMonth()).toString().padStart(2, '0')
                + '-' + today.getDate().toString().padStart(2, '0'),
        )
    }
}

async function selectCheckbox(target, text) {
    try {
        const nodes = await getTree(target)

        const checkbox = nodes.find(it => nodeRole(it) === 'checkbox' && testNodeName(it, text))
        if(!checkbox) {
            console.error(`No checkbox for ${text}`)
            return
        }

        await click(target, checkbox.backendDOMNodeId)
    }
    catch(error) {
        console.error(error, error?.stack)
    }
}

async function fillSpinbutton(target, labelText, value) {
    try {
        const nodes = await getTree(target)

        const input = nodes.find(it => nodeRole(it) === 'spinbutton' && testNodeName(it, labelText))
        if(!input) {
            console.error(`No input for ${labelText}`)
            return
        }

        await setValue(target, input.backendDOMNodeId, value)
    }
    catch(error) {
        console.error(error, error?.stack)
    }
}
async function fillInput(target, labelText, value) {
    try {
        const nodes = await getTree(target)

        const input = nodes.find(it => nodeRole(it) === 'textbox' && testNodeName(it, labelText))
        if(!input) {
            console.error(`No input for ${labelText}`)
            return
        }

        await setValue(target, input.backendDOMNodeId, value)
    }
    catch(error) {
        console.error(error, error?.stack)
    }
}

async function selectRadio(target, inputTexts, optionTexts) {
    try {
        const nodes = await getTree(target)
        const byId = new Map(nodes.map(it => [it.nodeId, it]))

        const button = findAndMapFirst(inputTexts, (inputText) => {
            const generic = nodes.find(it => {
                return nodeRole(it) === 'generic' && testNodeName(it, inputText)
            })
            if(!generic) return

            const radioButtons = getDescendants(generic, byId).filter(it => nodeRole(it) === 'radio')

            const button = findAndMapFirst(optionTexts, optionText => {
                const button = radioButtons.find(it => testNodeName(it, optionText))
                if(button) return [button]
            })
            if(button) return [button]
        })

        if(!button) {
            console.error(`No button for ${inputTexts}`)
            return
        }

        await click(target, button.backendDOMNodeId)
    }
    catch(error) {
        console.error(error, error?.stack)
    }
}

async function selectCombobox(target, inputTexts, optionTexts) {
    try {
        const nodes = await getTree(target)
        const byId = new Map(nodes.map(it => [it.nodeId, it]))

        const option = findAndMapFirst(inputTexts, (inputText) => {
            const combobox = nodes.find(it => {
                return nodeRole(it) === 'combobox' && testNodeName(it, inputText)
            })
            if(!combobox) return

            const options = getDescendants(combobox, byId).filter(it => nodeRole(it) === 'option')

            const option = findAndMapFirst(optionTexts, optionText => {
                const option = options.find(it => testNodeName(it, optionText))
                if(option) return [option]
            })
            if(option) return [option]
        })

        if(!option) {
            console.error(`No option for ${inputTexts}`)
            return
        }
        console.error(`Yes option for ${inputTexts}`)

        await makeOptionSelected(target, option.backendDOMNodeId)
    }
    catch(error) {
        console.error(error, error?.stack)
    }
}

async function selectOption(target, selectTexts, optionTexts) {
    try {
        let selectOpenButton = await (async() => {
            const buttons = (await getTree(target)).filter(it => nodeRole(it) === 'button')
            return findAndMapFirst(selectTexts, (text) => {
                const button = buttons.find(it => testNodeName(it, text))
                if(button) return [button]
            })
        })()

        if(!selectOpenButton) {
            selectOpenButton = await (async() => {
                const nodes = await getTree(target)
                const byId = new Map(nodes.map((it) => [it.nodeId, it]));

                return findAndMapFirst(selectTexts, (text) => {
                    const group = nodes.find(it => {
                        return nodeRole(it) === 'group' && testNodeName(it, text)
                    })
                    if(!group) return

                    const button = getDescendants(group, byId).find(it => nodeRole(it) === 'button')
                    if(button) return [button]
                })
            })()
        }

        if (!selectOpenButton || selectOpenButton.backendDOMNodeId == null) {
            console.error(`No button for ${selectTexts}`)
            return
        }

        if(getAccessibilityProp(selectOpenButton, 'expanded') !== true) {
            await click(target, selectOpenButton.backendDOMNodeId);
        }

        const option = await pollFor(async() => {
            const option = await (async() => {
                const options = await getFocusedOptions(target)

                return findAndMapFirst(optionTexts, (text) => {
                    const opption = options.find(it => testNodeName(it, text))
                    if(opption) return [opption]
                })
            })()

            if(option) return [option]
        });

        if (!option || option.backendDOMNodeId == null) {
            await click(target, currentButton.backendDOMNodeId);
            await blur(target)

            console.error(`No option for ${selectTexts}`)
            return
        }

        await click(target, option.backendDOMNodeId);
        await blur(target)
    }
    catch(error) {
        console.error(error, error?.stack)
    }
}

function getDescendants(node, byId) {
    const children = [...(node.childIds || [])]
        .map(it => byId.get(it))
        .filter(it => it)

    return [...children, ...children.flatMap(child => getDescendants(child, byId))]
}
async function getNodeCurrent(target, oldNode) {
    return (await getTree(target)).find(it => it.backendDOMNodeId === oldNode.backendDOMNodeId)
}
async function getFocusedOptions(target) {
    const nodes = await getTree(target);
    const byId = new Map(nodes.map((it) => [it.nodeId, it]));

    const listbox = nodes.find(it => {
        return nodeRole(it) === 'listbox' && getAccessibilityProp(it, 'focused') === true
    })
    if(!listbox) return []

    return getDescendants(listbox, byId).filter(it => nodeRole(it) === 'option')
}

function testNodeName(node, test) {
    if(typeof test === 'string') {
        return nodeName(node).toLowerCase().includes(test.toLowerCase())
    }
    else {
        return test.test(nodeName(node))
    }
}
function nodeName(n) { return n?.name?.value || ''; }
function nodeRole(n) { return n?.role?.value || ''; }
function getAccessibilityProp(n, name) {
    return n?.properties?.find(p => p.name === name)?.value?.value;
}
async function getTree(target) {
    const { nodes } = await send(target, 'Accessibility.getFullAXTree');
    return nodes;
}
async function click(target, backendNodeId) {
    const { object } = await send(target, 'DOM.resolveNode', { backendNodeId });
    try {
        await send(target, 'Runtime.callFunctionOn', {
            objectId: object.objectId,
            functionDeclaration: 'function () { this.click(); }',
            returnByValue: true,
        });
    } finally {
        await send(target, 'Runtime.releaseObject', { objectId: object.objectId }).catch(() => {});
    }
}
async function setValue(target, backendNodeId, value) {
    const { object } = await send(target, 'DOM.resolveNode', { backendNodeId });
    try {
        await send(target, 'Runtime.callFunctionOn', {
            objectId: object.objectId,
            functionDeclaration: `function (v) {
this.focus();
const proto = this instanceof HTMLTextAreaElement
? HTMLTextAreaElement.prototype
: HTMLInputElement.prototype;
const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
setter.call(this, v);
this.dispatchEvent(new Event('input',  { bubbles: true }));
this.dispatchEvent(new Event('change', { bubbles: true }));
}`,
            arguments: [{ value }],
            returnByValue: true,
        });
    } finally {
        await send(target, 'Runtime.releaseObject', { objectId: object.objectId }).catch(() =>
        {});
    }
}
async function makeOptionSelected(target, backendNodeId) {
    const { object } = await send(target, 'DOM.resolveNode', { backendNodeId });
    try {
        const { result } = await send(target, 'Runtime.callFunctionOn', {
            objectId: object.objectId,
            functionDeclaration: `function () {
const info = { tag: this.tagName, value: this.value, id: this.id };
const select = this.closest('select');
info.selectId = select && select.id;
info.selectBefore = select && select.value;
if (!select) return info;
select.focus();
const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
setter.call(select, this.value);
info.selectAfterSet = select.value;
select.dispatchEvent(new Event('input',  { bubbles: true }));
select.dispatchEvent(new Event('change', { bubbles: true }));
info.selectAfterEvents = select.value;
return info;
}`,
            returnByValue: true,
        });
        console.log('[makeOptionSelected]', result?.value);
    } finally {
        await send(target, 'Runtime.releaseObject', { objectId: object.objectId }).catch(() => {});
    }
}
async function blur(target) {
  await send(target, 'Runtime.callFunctionOn', {
    objectId: object.objectId, // TODO
    functionDeclaration: 'function () { this.blur(); }',
    returnByValue: true,
  });
}
function send(target, method, params) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(target, method, params || {}, (result) => {
            const err = chrome.runtime.lastError;
            if (err) reject(new Error(`${method}: ${err.message}`));
                else resolve(result);
        });
    });
}
async function pollFor(predicate) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const result = await predicate()
        if(result) return result[0]

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}
const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS  = 3000;
function findAndMapFirst(array, predicate) {
    for(const value of array) {
        const result = predicate(value)
        if(result) return result[0]
    }
}
