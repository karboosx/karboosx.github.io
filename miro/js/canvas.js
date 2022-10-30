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

// // add a rectangle to the main layer
// let a = addCard(100, 100); a.text = 'A';
// a.fontSize = 16;
// a.lineHeight = 20;
//
// addCard(300, 300).text = 'Bffffffffffffffffffffffffffffffffff\n' +
//     'testowo';

// draw the canvas
render();

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
        ctx.strokeStyle = '#000000';
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
            ctx.fillText(wrappedText[i], object.x + 5, object.y + Math.max(object.lineHeight/4, 10) + (i * object.lineHeight));
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
    //editTextArea.style.padding = 4.4 * scale + 'px ' + 5 * scale + 'px';
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
    // add delete object button to context menu
    var deleteButton = document.createElement('button');
    deleteButton.innerHTML = 'Delete';
    deleteButton.addEventListener('click', function () {
        removeObject(selectedObjectStack);
        selectedObjectStack = null;
        render();
    });
    contextMenu.appendChild(deleteButton);

    // add button to move object to front
    var frontButton = document.createElement('button');
    frontButton.innerHTML = 'Move to front';
    frontButton.addEventListener('click', function () {
        moveObjectToTop();
    });
    contextMenu.appendChild(frontButton);

    // add button to move object to back
    var backButton = document.createElement('button');
    backButton.innerHTML = 'Move to back';
    backButton.addEventListener('click', function () {
        moveObjectToBottom();
    });
    contextMenu.appendChild(backButton);

    // add change color buttons to context menu
    for (let color in colors) {
        var colorButton = document.createElement('button');
        colorButton.innerHTML = color;
        colorButton.style.backgroundColor = colors[color].fill;
        colorButton.addEventListener('click', function () {
            selectedObject.color = color;
            render();
        });
        contextMenu.appendChild(colorButton);
    }


    if (selectedObject.locked) {
        var lockButton = document.createElement('button');
        lockButton.innerHTML = 'Unlock';
        lockButton.addEventListener('click', function () {
            selectedObject.locked = false;
            render();
        });
        contextMenu.appendChild(lockButton);
    }

    if (!selectedObject.locked) {
        var unlockButton = document.createElement('button');
        unlockButton.innerHTML = 'Lock';
        unlockButton.addEventListener('click', function () {
            selectedObject.locked = true;
            render();
        });
        contextMenu.appendChild(unlockButton);
    }

    // increase font size
    var fontSizeButton = document.createElement('button');
    fontSizeButton.innerHTML = 'Increase font size';
    fontSizeButton.addEventListener('click', function () {
        selectedObject.fontSize += 1;
        selectedObject.lineHeight += 1;
        render(true);
    });
    contextMenu.appendChild(fontSizeButton);

    // decrease font size
    var fontSizeButton = document.createElement('button');
    fontSizeButton.innerHTML = 'Decrease font size';
    fontSizeButton.addEventListener('click', function () {
        selectedObject.fontSize -= 1;
        selectedObject.lineHeight -= 1;
        render(true);
    });
    contextMenu.appendChild(fontSizeButton);

}

canvas.addEventListener('mousedown', function (e) {
    if (e.target !== contextMenu) {
        closeContextMenu();
        hideEditBox();
    } else {
        return;
    }

    movingObject = false;
    resizingObject = false;
    mouseDown = true;
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;

    // if object is selected with a shit key, add to selectedObjectStack
    if (e.shiftKey && selectedObjectStack && selectedObjectStack !== layers) {
        var object = getObjectAt(e.clientX, e.clientY);
        for (var i = 0; i < object.length; i++) {
            if (object[i] && selectedObjectStack.indexOf(object[i]) === -1 && !object[i].is_layer) {
                selectedObjectStack.push(object[i]);
            }
        }
    } else {
        let object = getObjectAt(e.clientX, e.clientY);

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
            if (!elementAtMouse.is_layer && e.clientX >= screenPosition.x + elementAtMouse.width * scale - 10 && e.clientY >= screenPosition.y + elementAtMouse.height * scale - 10) {
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
});
canvas.addEventListener('mouseup', function (e) {
    mouseDown = false;
    movingObject = false;
    resizingObject = false;

    render();
});

canvas.addEventListener('mousemove', function (e) {

    var object = getObjectAt(e.clientX, e.clientY);
    if (object.length > 0 && !object[0].is_layer) {
        canvas.style.cursor = 'pointer';

        if (e.clientX >= getScreenPosition(object[0]).x + object[0].width * scale - 10 && e.clientY >= getScreenPosition(object[0]).y + object[0].height * scale - 10) {
            canvas.style.cursor = 'nwse-resize';
        }

        hoverObject = object[0];

    } else {
        canvas.style.cursor = 'default';
    }

    currentPos.x = e.clientX;
    currentPos.y = e.clientY;

    var step = 10;

    if (e.shiftKey) {
        step = 100;
    }

    if (mouseDown && selectedObjectStack.length > 0) {
        if (movingObject) {
            for (var i = 0; i < selectedObjectStack.length; i++) {
                var element = selectedObjectStack[i];
                if (element.is_layer) {
                    element.x = element.startingX + (e.clientX - mouseDownX);
                    element.y = element.startingY + (e.clientY - mouseDownY);

                }else {
                    element.x = element.startingX + (e.clientX - mouseDownX) / scale;
                    element.y = element.startingY + (e.clientY - mouseDownY) / scale;

                    if (e.ctrlKey) {
                        element.x = Math.round(element.x / step) * step;
                        element.y = Math.round(element.y / step) * step;
                    }
                }
            }
        } else if (resizingObject) {
            for (var i = 0; i < selectedObjectStack.length; i++) {
                element = selectedObjectStack[i];
                element.width = element.startingWidth + (e.clientX - mouseDownX) / scale;
                element.height = element.startingHeight + (e.clientY - mouseDownY) / scale;

                if (e.ctrlKey) {
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
});

canvas.addEventListener('dblclick', function (e) {
    // when double clicking on an object, create textarea to edit text
    var object = getObjectAt(e.clientX, e.clientY);
    if (object.length > 0) {
        for(var i = 0; i < object.length; i++) {
            if (!object[i].is_layer) {
                selectedObject = object[i];
                showEditBox();
                return;
            }
        }
    }
})
// when the mouse wheel is scrolled, zoom in or out
canvas.addEventListener('mousewheel', function (e) {
    var oldScale = scale;
    let factor = 0.2;

    if (e.wheelDelta > 0) {
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
        layers[i].x = e.clientX - (e.clientX - layers[i].x) * scale / oldScale;
        layers[i].y = e.clientY - (e.clientY - layers[i].y) * scale / oldScale;
    }

    render();
});

// when right click, show context menu at the mouse position only if there is object at the mouse position
canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    var object = getObjectAt(e.clientX, e.clientY, true);
    if (object.length > 0) {
        for(var i = 0; i < object.length; i++) {
            if (!object[i].is_layer) {
                contextMenu.style.display = 'block';
                contextMenu.style.left = e.clientX + 'px';
                contextMenu.style.top = e.clientY + 'px';
                selectedObjectStack = object;
                selectedObject = object[i];

                renderContextMenu();
                return;
            }
        }

    }
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
    render();
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

// when newCard is hold, create new card and start dragging
newCard.addEventListener('mousedown', function (e) {
    e.preventDefault();
    var newobj = addCard(e.clientX, e.clientY, selectedLayer);
    selectedObjectStack = [newobj];
    newobj.startingX = newobj.x - newobj.width/2;
    newobj.startingY = newobj.y - newobj.height/2;

    movingObject = true;
    resizingObject = false;
    mouseDown = true;
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;

    render();
});

// close instructions div when close button is clicked
var closeInstructions = document.getElementById('closeInstructions');
closeInstructions.addEventListener('click', function () {
    var instructions = document.getElementById('instructions');
    instructions.style.display = 'none';
    closeInstructions.style.display = 'none';
});
