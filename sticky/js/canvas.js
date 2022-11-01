var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var contextMenu = document.getElementById('contextMenu');
var editBox = document.getElementById('editBox');
var editTextArea = document.getElementById('editText');
var needRender = true;

var colors = {
    orange: {
        fill: '#e57703',
        stroke: '#864e11',
        text: '#000000'
    },
    blue: {
        fill: '#3b8ed8',
        stroke: '#1e4f6d',
        text: '#ffffff'
    },
    green: {
        fill: '#3bd8a2',
        stroke: '#1e6d4f',
        text: '#000000'
    },
    red: {
        fill: '#d83b3b',
        stroke: '#6d1e1e',
        text: '#000000'
    },
    yellow: {
        fill: '#d8d03b',
        stroke: '#6d6d1e',
        text: '#000000'
    },
    white : {
        fill: '#ffffff',
        stroke: '#000000',
        text: '#000000'
    },
    transparent: {
        fill: 'rgba(0, 0, 0, 0)',
        stroke: 'rgba(0, 0, 0, 0)',
        text: '#000000',
        transparent: true
    }
}


canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
ctx.width = window.innerWidth;
ctx.height = window.innerHeight;

var scale = 1;
var selectedLayer = null;

// canvas is made of layers
// each layer has a name, position and a list of objects
var layers = [];

// add main layer
addLayer('main');

function addWelcomeCards() {
    let stickyNoteApp = addCard(200, 40);
    stickyNoteApp.text = 'Sticky Note App';
    stickyNoteApp.fontSize = 35;
    stickyNoteApp.lineHeight = 40;
    stickyNoteApp.height = 50;
    stickyNoteApp.width = 850;
    stickyNoteApp.color = 'blue';

    let introduction = addCard(200, 130);
    introduction.text = 'Introduction';
    introduction.fontSize = 35;
    introduction.lineHeight = 40;
    introduction.height = 50;
    introduction.width = 850;
    introduction.color = 'transparent';

    let introductionText = addCard(200, 200);
    introductionText.text = 'Drag the card from bottom toolbar to create a new card.\n' +
        'Double click on the card to edit the text.\n' +
        'Drag the card to move it.\n' +
        'Right click on the card to open the context menu. You can change the color of the card, size of the text, lock and unlock the card or delete it.\n' +
        'Click on the card to select it. You can select multiple cards by holding the shift key and clicking on the cards.\n' +
        'Click Ctrl + C to copy the selected cards and Ctrl + V to paste them.\n' +
        'Hold Ctrl while dragging the card to snap it to the grid. Hold Shift to increase the grid size.\n';
    introductionText.fontSize = 20;
    introductionText.lineHeight = 25;
    introductionText.height = 300;
    introductionText.width = 850;

}

addWelcomeCards();
// draw the canvas
render();
renderContextMenu();

// drag the canvas when the mouse is down
var mouseDown = false;
var mouseDownX = 0;
var mouseDownY = 0;
var selectedObjectStack = null;
var selectedObject;
var movingObject = false;
var hoverObject;
var resizingObject = false;
var currentPos = {
    x: 0,
    y: 0
};
var copiedObject;

// add a layer to the canvas
function addLayer(layerName) {
    layers.push({
        name: layerName,
        x: 0,
        y: 0,
        objects: [],
        is_layer: true
    });
    selectedLayer = layerName;
}

// add an object to a layer
function addObject(layerName, object) {
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].name === layerName) {
            layers[i].objects.push(object);
        }
    }

    return object;
}

// check if object is visible in canvas with current scale and position
function isVisible(layer, object) {
    var screenPosition = getScreenPosition(object);
    return screenPosition.x + object.width * scale > 0 && screenPosition.x < ctx.width && screenPosition.y + object.height * scale > 0 && screenPosition.y < ctx.height;
}

function isFullyVisible(object) {
    var screenPosition = getScreenPosition(object);
    return screenPosition.x > 0 && screenPosition.x + object.width * scale < ctx.width && screenPosition.y > 0 && screenPosition.y + object.height * scale < ctx.height;
}

// draw all objects in a layer
function drawLayer(layerName) {
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].name === layerName) {
            for (var j = 0; j < layers[i].objects.length; j++) {
                if (isVisible(layers[i], layers[i].objects[j])) {
                    drawObject(layers[i], layers[i].objects[j]);
                }
            }
        }
    }
}

function wrapText(object) {
    var text = object.text;
    var widthS = object.width + 10;

    ctx.save();
    ctx.font = object.font;
    // split text into lines and wrap if needed
    var baseLines = text.split("\n");
    var lines = [];
    var line = '';

    for (var il = 0; il < baseLines.length; il++) {
        var words = baseLines[il].split(' ');
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            var width = ctx.measureText(line + word).width;
            if (width < widthS) {
                line += word + ' ';
            } else if (line.length > 0) {
                lines.push(line);
                line = word + ' ';
            } else {
                line = word + ' ';
            }
        }
        lines.push(line);
        line = '';
    }
    ctx.restore();
    return lines;
}

function isSelected(object) {
    return selectedObjectStack && selectedObjectStack.indexOf(object) > -1;
}

function getFont(object) {
    return object.fontSize + 'px ' + object.fontFamily;
}

// draw an rect from an object with global scale
function drawObject(layer, object) {
    ctx.save();
    ctx.fillStyle = colors[object.color].fill;

    if (selectedObjectStack && selectedObjectStack.indexOf(object) !== -1 && colors[object.color].transparent) {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.setLineDash([5, 3]);
    }else {
        ctx.strokeStyle = colors[object.color].stroke;
    }

    if (isSelected(object)) {
        // make stroke thicker
        ctx.lineWidth = 2;
    }

    ctx.translate(layer.x, layer.y);
    ctx.scale(scale, scale);
    ctx.beginPath();

    if (object.text) {
        ctx.font = getFont(object);
        var wrappedText = wrapText(object);

        // if text is too long, make the box taller
        if (wrappedText.length > 0) {
            if (object.height < object.lineHeight * wrappedText.length + 5) {
                object.height = object.lineHeight * wrappedText.length + 5;
            }

            // if longest word in the wrappedText line is longer than box, make the box wider
            for (var i = 0; i < wrappedText.length; i++) {
                let width = ctx.measureText(wrappedText[i]).width;
                if (width + 10 > object.width) {
                    object.width = width + 10;
                }
            }
        }
    }

    ctx.rect(object.x, object.y, object.width, object.height);
    ctx.fill();

    ctx.stroke();

    // no shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    // draw text in center of rect with boundary and if possible wrap text and scale to match boundary
    if (object.text && !(selectedObject === object && colors[object.color].transparent && editBox.style.display !== 'none')) {
        ctx.font = getFont(object);
        ctx.fontSize = object.font;
        //set text color
        ctx.fillStyle = colors[object.color].text;

        // draw wrapped text
        for (var i = 0; i < wrappedText.length; i++) {
            ctx.fillText(wrappedText[i], object.x + 5, object.y + 7.5 + (i * object.lineHeight));
        }
    }
    ctx.restore();
}

// clear and render the canvas
function render(soft = false) {
    if (!soft) {
        closeContextMenu();
        hideEditBox();
    }
    requestAnimationFrame(redraw);
}

var drawing = false;
function redraw(){
    if (drawing) {
        return;
    }
    drawing = true;
    clear();
    draw();
    drawing = false;
}

function draw() {
    ctx.textBaseline = 'top';

    for (var i = 0; i < layers.length; i++) {
        drawLayer(layers[i].name);
    }
}

function clear() {
    ctx.clearRect(0, 0, ctx.width, ctx.height);
}

function getLayer(selectedLayer) {
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].name === selectedLayer) {
            return layers[i];
        }
    }
}

// get object and layer at position adjusted for layer position and scale
function getObjectAt(clientX, clientY, withLock = false) {
    for (var il = layers.length - 1; il >= 0; il--) {
        let layer = layers[il];

        var x = (clientX - layer.x) / scale;
        var y = (clientY - layer.y) / scale;
        for (var i = layer.objects.length - 1; i >= 0; i--) {
            var object = layer.objects[i];
            if (object.locked && !withLock) {
                continue;
            }

            if (x >= object.x && x <= object.x + object.width && y >= object.y && y <= object.y + object.height) {
                return [object];
            }
        }
    }

    return layers;
}

function getScreenPosition(selectedObject) {
    if (selectedObject.is_layer) {
        return {
            x: selectedObject.x * scale,
            y: selectedObject.y * scale
        };
    }

    var layer = getLayer(selectedObject.layer);
    return {
        x: selectedObject.x * scale + layer.x,
        y: selectedObject.y * scale + layer.y
    };
}

function resizeEditBox() {
    var screenPosition = getScreenPosition(selectedObject);
    editBox.style.display = 'block';
    editTextArea.value = selectedObject.text;
    // move edit box to selected object
    editBox.style.left = screenPosition.x + 'px';
    editBox.style.top = screenPosition.y + 'px';
    editBox.style.width = selectedObject.width * scale + 'px';
    editBox.style.height = selectedObject.height * scale + 'px';
}

function showEditBox() {
    resizeEditBox();
    // set editbox textarea font to match canvas font and scale
    editTextArea.style.fontSize = selectedObject.fontSize * scale + 'px';
    editTextArea.style.lineHeight = selectedObject.lineHeight * scale + 'px';
    editTextArea.style.fontFamily = selectedObject.fontFamily;
    editTextArea.style.padding = 4.4 * scale + 'px ' + 5 * scale + 'px';
    editTextArea.style.backgroundColor = colors[selectedObject.color].fill;
    editTextArea.style.color = colors[selectedObject.color].text;

    if (colors[selectedObject.color].transparent) {
        editTextArea.classList.add('border');
    } else {
        editTextArea.classList.remove('border');
    }
    editTextArea.focus();
}

function hideEditBox() {
    editBox.style.display = 'none';
}

function addCard(x, y, layerName = 'main') {
    return addObject(layerName, {
        x: (x - layers[layers.length - 1].x) / scale,
        y: (y - layers[layers.length - 1].y) / scale,
        width: 100,
        height: 100,
        text: '',
        color: 'green',
        layer: layerName,
        locked: false,
        fontSize: 16,
        lineHeight: 20,
        fontFamily: 'Arial',
    });
}


function closeContextMenu() {
    contextMenu.style.display = 'none';
}
function showContextMenu() {

}

function removeObject(objects) {
    for (var i = 0; i < layers.length; i++) {
        for (var j = 0; j < layers[i].objects.length; j++) {
            for (var k = 0; k < objects.length; k++) {
                if (layers[i].objects[j] === objects[k]) {
                    layers[i].objects.splice(j, 1);
                    j--;
                }
            }
        }
    }
}

function renderContextMenu() {
    contextMenu.innerHTML = '';

    // add div.options to contextMenu containing options for delete, lock, unlock, etc.
    var options = document.createElement('div');
    options.classList.add('options');
    contextMenu.appendChild(options);

    var deleteOption = document.createElement('button');
    deleteOption.innerHTML = 'Delete';
    deleteOption.classList.add('option');
    deleteOption.addEventListener('click', function() {
        removeObject(selectedObjectStack);
        render();
    });
    options.appendChild(deleteOption);

    var lockOption = document.createElement('button');
    lockOption.innerHTML = 'Lock';
    lockOption.classList.add('option');
    lockOption.addEventListener('click', function() {
        for (var i = 0; i < selectedObjectStack.length; i++) {
            selectedObjectStack[i].locked = true;
        }
        render();
    });
    options.appendChild(lockOption);

    var unlockOption = document.createElement('button');
    unlockOption.innerHTML = 'Unlock';
    unlockOption.classList.add('option');
    unlockOption.addEventListener('click', function() {
        for (var i = 0; i < selectedObjectStack.length; i++) {
            selectedObjectStack[i].locked = false;
        }
        render();
    });
    options.appendChild(unlockOption);

    var moveToTopOption = document.createElement('button');
    moveToTopOption.innerHTML = 'Move to Top';
    moveToTopOption.classList.add('option');
    moveToTopOption.addEventListener('click', function() {
        for (var i = 0; i < selectedObjectStack.length; i++) {
            var object = selectedObjectStack[i];
            var layer = getLayer(object.layer);
            layer.objects.splice(layer.objects.indexOf(object), 1);
            layer.objects.push(object);
        }
        render();
    });
    options.appendChild(moveToTopOption);

    var moveToBottomOption = document.createElement('button');
    moveToBottomOption.innerHTML = 'Move to Bottom';
    moveToBottomOption.classList.add('option');
    moveToBottomOption.addEventListener('click', function() {
        for (var i = 0; i < selectedObjectStack.length; i++) {
            var object = selectedObjectStack[i];
            var layer = getLayer(object.layer);
            layer.objects.splice(layer.objects.indexOf(object), 1);
            layer.objects.unshift(object);
        }
        render();
    });
    options.appendChild(moveToBottomOption);

    var increaseFontSizeOption = document.createElement('button');
    increaseFontSizeOption.innerHTML = 'Increase Font Size';
    increaseFontSizeOption.classList.add('option');
    increaseFontSizeOption.addEventListener('click', function() {
        for (var i = 0; i < selectedObjectStack.length; i++) {
            var object = selectedObjectStack[i];
            object.fontSize++;
            object.lineHeight++;
        }
        render(true);
    });
    options.appendChild(increaseFontSizeOption);

    var decreaseFontSizeOption = document.createElement('button');
    decreaseFontSizeOption.innerHTML = 'Decrease Font Size';
    decreaseFontSizeOption.classList.add('option');
    decreaseFontSizeOption.addEventListener('click', function() {
        for (var i = 0; i < selectedObjectStack.length; i++) {
            var object = selectedObjectStack[i];
            object.fontSize--;
            object.lineHeight--;
        }
        render(true);
    });
    options.appendChild(decreaseFontSizeOption);

    // add div.colors to contextMenu containing options for changing color
    var colorsContainer = document.createElement('div');
    colorsContainer.classList.add('options');
    contextMenu.appendChild(colorsContainer);

    for (let color in colors) {
        if (colors.hasOwnProperty(color)) {
            var colorOption = document.createElement('button');
            colorOption.style.backgroundColor = colors[color].fill;
            colorOption.innerText = color;
            colorOption.style.color = colors[color].text;
            colorOption.classList.add('color');
            colorOption.addEventListener('click', function() {
                for (var i = 0; i < selectedObjectStack.length; i++) {
                    selectedObjectStack[i].color = color;
                }
                render();
            });
            colorsContainer.appendChild(colorOption);
        }
    }

}

function startMoving(cursorX, cursorY, isShift) {
    movingObject = false;
    resizingObject = false;
    mouseDown = true;
    mouseDownX = cursorX;
    mouseDownY = cursorY;

    // if object is selected with a shit key, add to selectedObjectStack
    if (isShift && selectedObjectStack && selectedObjectStack !== layers) {
        var object = getObjectAt(cursorX, cursorY);
        for (var i = 0; i < object.length; i++) {
            if (object[i] && selectedObjectStack.indexOf(object[i]) === -1 && !object[i].is_layer) {
                selectedObjectStack.push(object[i]);
            }
        }
    } else {
        let object = getObjectAt(cursorX, cursorY);

        if (object.length === 1 && !object[0].is_layer && selectedObjectStack && selectedObjectStack.length > 1 && selectedObjectStack.indexOf(object[0]) !== -1) {

        } else {
            selectedObjectStack = object;
        }
    }

    if (selectedObjectStack.length > 0) {

        for (var i = 0; i < selectedObjectStack.length; i++) {
            var elementAtMouse = selectedObjectStack[i];

            var screenPosition = getScreenPosition(elementAtMouse);
            if (!elementAtMouse.is_layer) {
                selectedObject = elementAtMouse;
            }
            // when clicked on right bottom corner of object, resize
            if (!elementAtMouse.is_layer && cursorX >= screenPosition.x + elementAtMouse.width * scale - 10 && cursorY >= screenPosition.y + elementAtMouse.height * scale - 10) {
                resizingObject = true;
                movingObject = false;
                elementAtMouse.startingWidth = elementAtMouse.width;
                elementAtMouse.startingHeight = elementAtMouse.height;
            } else {
                elementAtMouse.startingX = elementAtMouse.x;
                elementAtMouse.startingY = elementAtMouse.y;
                movingObject = true;
                resizingObject = false;
            }
        }
    }

    render();
}

canvas.addEventListener('mousedown', function (e) {
    let cursorX = e.clientX;
    let cursorY = e.clientY;
    let isShift = e.shiftKey;

    if (e.target !== contextMenu) {
        closeContextMenu();
        hideEditBox();
    } else {
        return;
    }
    startMoving(cursorX, cursorY, isShift);
});

function finishMove() {
    mouseDown = false;
    movingObject = false;
    resizingObject = false;

    render();
}

canvas.addEventListener('mouseup', function (e) {
    finishMove();
});

function move(cursorX, cursorY, isShift, isCtrl) {
    var object = getObjectAt(cursorX, cursorY);
    if (object.length > 0 && !object[0].is_layer) {
        canvas.style.cursor = 'pointer';

        if (cursorX >= getScreenPosition(object[0]).x + object[0].width * scale - 10 && cursorY >= getScreenPosition(object[0]).y + object[0].height * scale - 10) {
            canvas.style.cursor = 'nwse-resize';
        }

        hoverObject = object[0];

    } else {
        canvas.style.cursor = 'default';
    }

    currentPos.x = cursorX;
    currentPos.y = cursorY;

    var step = 10;

    if (isShift) {
        step = 100;
    }

    if (mouseDown && selectedObjectStack.length > 0) {
        if (movingObject) {
            for (var i = 0; i < selectedObjectStack.length; i++) {
                var element = selectedObjectStack[i];
                if (element.is_layer) {
                    element.x = element.startingX + (cursorX - mouseDownX);
                    element.y = element.startingY + (cursorY - mouseDownY);

                } else {
                    element.x = element.startingX + (cursorX - mouseDownX) / scale;
                    element.y = element.startingY + (cursorY - mouseDownY) / scale;

                    if (isCtrl) {
                        element.x = Math.round(element.x / step) * step;
                        element.y = Math.round(element.y / step) * step;
                    }
                }
            }
        } else if (resizingObject) {
            for (var i = 0; i < selectedObjectStack.length; i++) {
                element = selectedObjectStack[i];
                element.width = element.startingWidth + (cursorX - mouseDownX) / scale;
                element.height = element.startingHeight + (cursorY - mouseDownY) / scale;

                if (isCtrl) {
                    element.width = Math.round(element.width / step) * step;
                    element.height = Math.round(element.height / step) * step;
                }
                if (element.width < 20) {
                    element.width = 20;
                }

                if (element.height < 20) {
                    element.height = 20;
                }
            }
        }

        render();
    }
}

canvas.addEventListener('mousemove', function (e) {

    let cursorX = e.clientX;
    let cursorY = e.clientY;
    let isShift = e.shiftKey;
    let isCtrl = e.ctrlKey;
    move(cursorX, cursorY, isShift, isCtrl);
});

function editObjectAt(cursorX, cursorY) {
    var object = getObjectAt(cursorX, cursorY);
    if (object.length > 0) {
        for (var i = 0; i < object.length; i++) {
            if (!object[i].is_layer) {
                selectedObject = object[i];
                showEditBox();
                return;
            }
        }
    }
}

canvas.addEventListener('dblclick', function (e) {
    // when double clicking on an object, create textarea to edit text
    let cursorX = e.clientX;
    let cursorY = e.clientY;
    editObjectAt(cursorX, cursorY);
})

function zoom(delta, cursorX, cursorY, factor = 0.2) {
    var oldScale = scale;

    if (delta > 0) {
        scale += factor;
    } else {
        scale -= factor;
    }

    if (scale < 0.1) {
        scale = 0.1;
    }
    if (scale > 10) {
        scale = 10;
    }

    // move all leyers to match the mouse position
    for (var i = 0; i < layers.length; i++) {

        layers[i].x = cursorX - (cursorX - layers[i].x) * scale / oldScale;
        layers[i].y = cursorY - (cursorY - layers[i].y) * scale / oldScale;
    }

    render();
}

// when the mouse wheel is scrolled, zoom in or out
canvas.addEventListener('mousewheel', function (e) {
    zoom(e.wheelDelta, e.clientX, e.clientY);
});

canvas.addEventListener('wheel', function (e) {
    zoom(-e.deltaY, e.clientX, e.clientY);
});

function openContextMenu(x, y) {
    var object = getObjectAt(x, y, true);
    if (object.length > 0) {
        for (var i = 0; i < object.length; i++) {
            if (!object[i].is_layer) {
                contextMenu.style.display = 'block';
                contextMenu.style.left = x + 'px';
                contextMenu.style.top = y + 'px';
                selectedObjectStack = object;
                selectedObject = object[i];

                // if context menu is outside of the canvas, move it inside
                if (contextMenu.offsetLeft + contextMenu.offsetWidth > canvas.offsetLeft + canvas.offsetWidth) {
                    contextMenu.style.left = canvas.offsetLeft + canvas.offsetWidth - contextMenu.offsetWidth + 'px';
                }
                return;
            }
        }

    }
}

// when right click, show context menu at the mouse position only if there is object at the mouse position
canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    let x = e.clientX;
    let y = e.clientY;
    openContextMenu(x, y);
});

// when editing text, update the object text
editTextArea.addEventListener('input', function (e) {
    if (selectedObject) {
        selectedObject.text = editTextArea.value;
        redraw();
        resizeEditBox();
    }
});


// when delete key is pressed, delete the selected object
document.addEventListener('keydown', function (e) {
    // if editing, do nothing
    if (editTextArea === document.activeElement) {
        return;
    }

    if (e.keyCode === 46) {
        removeObject(selectedObjectStack);
        selectedObjectStack = null;
        render();
    }

    // when ctrl+c is pressed, copy the selected object
    let layer = getLayer(selectedLayer);
    if (e.key === 'c' && e.ctrlKey && selectedObjectStack && selectedObjectStack.length > 0) {
        console.log('copy');
        copiedObject = JSON.parse(JSON.stringify(selectedObjectStack));

        for (var i = 0; i < copiedObject.length; i++) {
            copiedObject[i].x = copiedObject[i].x - (currentPos.x - layer.x) / scale ;
            copiedObject[i].y = copiedObject[i].y - (currentPos.y - layer.y) / scale ;
        }
    }

    // when ctrl + v is pressed, paste the copied object at the mouse position
    if (e.key === 'v' && e.ctrlKey && copiedObject) {
        console.log('paste');

        for (var i = 0; i < copiedObject.length; i++) {
            let newobj = addObject(selectedLayer, JSON.parse(JSON.stringify(copiedObject[i])));
            newobj.x = (currentPos.x - layer.x) / scale + newobj.x;
            newobj.y = (currentPos.y - layer.y) / scale + newobj.y;
        }
        render();
    }
});

// when window is resized, resize the canvas
window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.width = window.innerWidth;
    ctx.height = window.innerHeight;
    render(true);
});



// function to move the selected object to the top of the layer
function moveObjectToTop() {
    for (var i = 0; i < layers.length; i++) {
        for (var j = 0; j < layers[i].objects.length; j++) {
            if (layers[i].objects[j] === selectedObject) {
                layers[i].objects.splice(j, 1);
                layers[i].objects.push(selectedObject);
                render();
                return;
            }
        }
    }
}

function moveObjectToBottom() {
    for (var i = 0; i < layers.length; i++) {
        for (var j = 0; j < layers[i].objects.length; j++) {
            if (layers[i].objects[j] === selectedObject) {
                layers[i].objects.splice(j, 1);
                layers[i].objects.unshift(selectedObject);
                render();
                return;
            }
        }
    }
}

function selectAll(layerName) {
    var layer = getLayer(layerName);
    if (layer) {
        selectedObjectStack = layer.objects;
        render();
    }
}

var newCard = document.getElementById('newCard');

function addNewCardAt(x, y) {
    var newobj = addCard(x, y, selectedLayer);
    selectedObjectStack = [newobj];
    newobj.startingX = newobj.x - newobj.width / 2;
    newobj.startingY = newobj.y - newobj.height / 2;

    movingObject = true;
    resizingObject = false;
    mouseDown = true;
    mouseDownX = x;
    mouseDownY = y;

    render();
}

// when newCard is hold, create new card and start dragging
newCard.addEventListener('mousedown', function (e) {
    e.preventDefault();
    let x = e.clientX;
    let y = e.clientY;
    addNewCardAt(x, y);
});

var touchStartTime;
var touchStartPosition;
var touchEndPosition;
var touchTaps = 0;
var touches = 0;

newCard.addEventListener('touchstart', function (e) {
    e.preventDefault();
    let x = e.touches[0].clientX;
    let y = e.touches[0].clientY;
    addNewCardAt(canvas.width / 2 - 50, canvas.height / 2 - 50);
});

// close instructions div when close button is clicked
var closeInstructions = document.getElementById('closeInstructions');
closeInstructions.addEventListener('click', function () {
    var instructions = document.getElementById('instructions');
    instructions.style.display = 'none';
    closeInstructions.style.display = 'none';
});


// when touch is started with one touch, invoke startMoving
canvas.addEventListener('touchstart', function (e) {
    touches = e.touches.length;
    console.log('touchstart');
    e.preventDefault();

    if (e.target !== contextMenu) {
        closeContextMenu();
        hideEditBox();
    } else {
        return;
    }

    if (e.touches.length === 2) {
        startZooming(e.touches[0].clientX, e.touches[0].clientY, e.touches[1].clientX, e.touches[1].clientY);
        return;
    }

    if (e.touches.length === 1) {
        startMoving(e.touches[0].clientX, e.touches[0].clientY, false);
    }

    //save current time in milliseconds to check if it is a long press
    touchStartTime = new Date().getTime();
    touchStartPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
    }
});

// when touch is moved with one touch, invoke move
canvas.addEventListener('touchmove', function (e) {
    console.log('touchmove');
    e.preventDefault();

    if (e.touches.length === 2) {
        zooming(e.touches[0].clientX, e.touches[0].clientY, e.touches[1].clientX, e.touches[1].clientY);
        return;
    }
    if (e.touches.length === 1) {
        move(e.touches[0].clientX, e.touches[0].clientY, false, false);
    }

});

function processTaps() {
    console.log('processTaps', touchTaps);
    if (touches === 1 && touchTaps >= 2) {
        // if object is outside of the viewport, zoom out until it is visible

        let max = 10;
        while (!isFullyVisible(selectedObject) && max > 0) {
            max--;

            let layer = getLayer(selectedObject.layer);
            let objectOnScreen = getScreenPosition(selectedObject);

            layer.x -= objectOnScreen.x;
            redraw();

            if (!isFullyVisible(selectedObject)) {
                zoom(-1, touchStartPosition.x, touchStartPosition.y, 0.05);
                redraw();
            }
        }

        showEditBox();
    }

    touchTaps = 0;
}


function processLongTaps() {
    // when touchTaps is 1 and touch is held for more than 1000ms, show context menu
    if (touches === 1 && touchTaps === 0 && new Date().getTime() - touchStartTime > 500) {
        // if distance between touchstart and touchend is less than 100, show context menu
        if (Math.abs(touchStartPosition.x - touchEndPosition.x) < 100 && Math.abs(touchStartPosition.y - touchEndPosition.y) < 50) {
            openContextMenu(touchStartPosition.x, touchStartPosition.y);
        }
    }
}

canvas.addEventListener('touchend', function (e) {
    console.log('touchend');
    e.preventDefault();
    finishMove();
    zoomingAllowed = true;
    touchEndPosition = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
    };

    //check if it is a long press
    if (new Date().getTime() - touchStartTime < 500) {
        // if starting and ending position is less than 100px, it is a tap
        if (Math.abs(touchStartPosition.x - touchEndPosition.x) < 100 && Math.abs(touchStartPosition.y - touchEndPosition.y) < 100) {
            touchTaps++;
            setTimeout(processTaps, 500);
        } else {
            touchTaps = 0;
        }
    } else {
        processLongTaps();
        touchTaps = 0;
    }
});

var zoomingCenter;
var zoomingStartingDistance;
var zoomingAllowed = true;

function startZooming(x1, y1, x2, y2) {
    if (!zoomingAllowed) {
        return;
    }
    zoomingCenter = {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2
    };

    zoomingStartingDistance = Math.hypot(x1 - x2, y1 - y2);
    console.log('start zooming', zoomingStartingDistance);
}

function zooming(x1, y1, x2, y2) {
    if (!zoomingAllowed) {
        return;
    }
    var distance = Math.hypot(x1 - x2, y1 - y2);

    if (Math.abs(distance - zoomingStartingDistance) < 50) {
        return;
    }

    zoomingAllowed = false;

    if (distance < zoomingStartingDistance) {
        zoomingStartingDistance = distance;
        distance = -distance;
    }else {
        zoomingStartingDistance = distance;
    }

    console.log('zooming', distance);

    zoom(distance, zoomingCenter.x, zoomingCenter.y);
    setTimeout(function () {
        zoomingAllowed = true;
    }, 3);
}