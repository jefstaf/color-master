
// GRID CONSTRUCTOR

class Grid { 
    constructor(countX, countY) {
        this.countCellsX = countX;
        this.countCellsY = countY;
        this.itemRadius;
        this.cellSize = this.calculateCellSize();
        if (game.logLevelDesign) {console.log("cellSize:", this.cellSize);}
        this.itemRadius = this.calculateItemRadius();
        if (game.logLevelDesign) {console.log("radius:", this.itemRadius);}
        this.margins = this.calculateMargins();
        this.Xmargin = this.margins.Xmargin;
        this.Ymargin = this.margins.Ymargin;
        this.EDGEBUFFER = this.cellSize * .05;                 
    }

    calculateCellSize() {
        return Math.min(                    
            game.width / this.countCellsX,
            game.height / this.countCellsY);
    }

    calculateItemRadius() {
        return this.cellSize / 4;                
    }

    calculateMargins() {
        var extraX = game.width - (this.countCellsX * this.cellSize);
        //console.log("extra X:", extraX);
        var extraY = game.height - (this.countCellsY * this.cellSize);
        //console.log("extra Y:", extraY);
        var Xmargin = extraX / 2;
        var Ymargin = extraY / 2;
        return {Xmargin : Xmargin,
                Ymargin : Ymargin}
    }

    draw() {
        game.ctx.strokeStyle = game.GRIDCOLOR;  
        game.ctx.lineWidth = 1;
        for (var y = 0; y < this.countCellsY; y++) {
            for (var x = 0; x < this.countCellsX; x++) {
                game.ctx.strokeRect((x * this.cellSize) + this.Xmargin, 
                                    (y * this.cellSize) + this.Ymargin, 
                                    this.cellSize,
                                    this.cellSize)
            }
        }
    }
}




// LEVEL CONSTRUCTOR

class Level {
    constructor(levelNumber) {
        if (isNaN(levelNumber)) {
            // do nothing here; do it in World constructor method
        } else {
            this.number = levelNumber;
            this.name = "Level " + this.number; 

            if (game.logLevelDesign) {console.log("Building Level", this.number, "...");}
            this.details = game.levelDesigns[this.number - 1];  // -1 so there's no level zero
            this.title = this.details.title;
            this.backgroundColor = this.details.backgroundColor;
            this.design = this.details.design;
            this.walls = [];
            this.doors = [];
            this.blockages = [];
            this.tokens = []; // pawn color-change tokens
            this.doortokens = []; // door color-change tokens
            this.coins = [];
            this.goal;
            this.pawn;
            this.allItems = []; // not including walls, doors, pawn?
            this.startingX;
            this.startingY;
            this.wallWidth = 0;    
            this.pawnChangedColorYet = false;
            this.drawMode = 0;
        }
    }

    interpretLevelDesign(design) {
        var designRows = design.length;                    
        var YElements = designRows;                 
        var Ycells = (YElements + 1) / 2;           
    
        var designCols = design[0].length - 1;              
        var XElements = (designCols) / 3;           
        var Xcells = (XElements + 1) / 2;
        
       
        return {
            designRows : designRows,
            YElements : YElements,
            Ycells : Ycells,
            designCols : designCols,
            XElements : XElements,
            Xcells : Xcells
        }
    }

    setup() {
        
        game.placeLevelText();

        var visited;
        if (game.worldIntrosSeen.includes(game.level.number)) {
            visited = true;
        } else {
            visited = false;
        }

        // adjust which HTML buttons are visible
        var rb = document.getElementById("restartButton");
        var wb = document.getElementById("exitLevelButton");
        var sb = document.getElementById("saveButton");
        var qb = document.getElementById("exitGameButton");
        if (game.currentlyInWorld) {
            rb.style.display = "none";
            wb.style.display = "none";
            sb.style.display = "inline-block";
            qb.style.display = "inline-block";
        } else {
            rb.style.display = "inline-block";
            wb.style.display = "inline-block";
            sb.style.display = "none";
            qb.style.display = "none";
        }

        // show levelStartAnimation except when re-entering a world
        if (game.currentlyInWorld && visited) {
            game.startAnimation = false;
        } else {
            game.startAnimation = true;
        }
        
        // set canvas background color
        if (this.backgroundColor != null) {
            game.canvas.style.background = this.backgroundColor.rgb;
        } else {
            game.canvas.style.background = game.DEFAULT_BG_COLOR;
        }

        // build level
        this.designData = this.interpretLevelDesign(this.design);        
        this.designRows = this.designData.designRows;
        this.YElements = this.designData.YElements;
        this.Ycells = this.designData.Ycells;
        this.designCols = this.designData.designCols;
        this.XElements = this.designData.XElements;
        this.Xcells = this.designData.Xcells;


        this.grid = new Grid(this.Xcells, this.Ycells); 
        this.EDGEBUFFER = this.grid.EDGEBUFFER;

        if (game.drawGrid == true) {this.grid.draw();}                               
        
        this.cellSize = this.grid.cellSize;
        this.itemRadius = this.grid.itemRadius;

        this.wallWidth =  this.grid.cellSize / 5;
        
        this.build();
        
        this.pawn.draw(); 

        if (!game.currentlyInWorld) {
            this.goal.animate();
        }

        this.allItems = this.getAllItems();
        for (var i = 0; i < this.allItems.length; i++) {
            var item = this.allItems[i];
            if (game.logLevelDesign) {console.log(item.name);}
        }
    }

    build() {
        for (var y = 0; y < this.YElements; y++) {
            var row = this.design[y];        
            var gy = game.designToGridY(y);
            
            if (row[0] == "v") {
                //console.log(row);
                for (var x = 1; x <= this.designCols; x += 3) {
                    
                    //console.log(x, x+3, row.slice(x, x + 3))
                    var gx = game.designToGridX(x);
                    var abbreviation = row[x+1];                        

                    switch (row[x]) {
                        case ".":       // empty space
                            break;
                        case "|":       // wall or door
                            if (abbreviation == "|") { // wall
                                //console.log("Vertical wall at", gx, ",", gy);
                                this.walls.push(new Wall("vertical", [gx, gy]));
                                break;
                            } else {    // door
                                //console.log("Vertical door at", gx, ",", gy, "abbr: ", abbreviation);
                                this.doors.push(new Door(abbreviation, "vertical", [gx, gy]));
                                break;
                            }
                        case "$":
                            this.coins.push(new Coin(gx, gy));
                            break;
                        case "@":
                            //console.log("Starting cell at", gx, ",", gy);
                            this.startingX = gx; 
                            this.startingY = gy;
                            this.pawn = new Pawn(game.PAWNCOLOR, this.startingX, this.startingY);
                            break;
                        case "!":
                            //console.log("Goal at", gx, ",", gy);
                            this.goal = new Goal(gx, gy);
                            break;
                        case ">":  
                            var levelNumber = parseInt(row.slice(x+1, x+3));
                            var colorObject = this.getTransportColor(levelNumber, "tokenColor");
                            //console.log(colorObject.name, "Transport Token for Level", levelNumber, "at", gx, gy);
                            this.transportTokens.push(new TransportToken(levelNumber, gx, gy, colorObject));
                            break;
                        case "<":  
                            var levelNumber = parseInt(row.slice(x+1, x+3));
                            var colorObject = this.getTransportColor(levelNumber, "pawnColor");
                            //console.log(levelNumber, colorObject);
                            //console.log(colorObject.name, "Exit Location from Level", levelNumber, "at", gx, gy);
                            this.exitLocations.push(new ExitLocation(levelNumber, gx, gy, colorObject));
                            break;
                        default: // token (pawn color-change OR door color-change)
                            
                            if (abbreviation == "+") {
                                //console.log("Door-change token at", gx, ",", gy, "abbr:", row[x], "to", row[x+2]);
                                this.doortokens.push(new DCCToken(row[x], row[x+2], gx, gy));

                            } else {
                                this.tokens.push(new PCCToken(abbreviation, gx, gy));
                                //console.log("Pawn-change token at", gx, ",", gy, "abbr:", abbreviation);
                            }
                            break;
                    }
                }
            } else if (row[0] == "h") {
                //console.log(row);
                for (var x = 1; x <= this.designCols; x += 3) {
                    //console.log(x, x + 3, row.slice(x, x + 3))
                    var gx = game.designToGridX(x);
                    var abbreviation = row[x+1];
                    switch (row[x]) {
                        case ".":       // empty space
                            break;
                        case "=":       // wall or door
                            if (abbreviation == "=") { // wall
                                //console.log("Horizontal wall at", gx, ",", gy);
                                this.walls.push(new Wall("horizontal", [gx, gy]));
                                break;
                            } else {    // door
                                //console.log("Horizontal door at", gx, ",", gy, "abbr: ", abbreviation);
                                this.doors.push(new Door(abbreviation, "horizontal", [gx, gy]));
                                break;
                            }
                        default:
                            console.log("Error in level design: Object in horizontal row");
                            break;
                    }
                } 
            }
        }

        if (game.currentlyInWorld) {
            this.placeWorldPawn();
        }

        this.updateBlockages();

    }

    getTransportColor(levelNumber, lookup) {
        if (this.worldColors != null) {         // worldColors is list of triples [level number, token color, pawn color on return]
            for (var i = 0; i < this.worldColors.length; i++) {
                var data = this.worldColors[i];
                if (data[0] == levelNumber) {
                    if (lookup == "tokenColor") {
                        return data[1];
                    } else if (lookup == "pawnColor") {
                        return data[2];
                    }
                    
                } 
            }
        }
    }

    placeWorldPawn() {

        var exitLocationLevel = game.cameFromLevel;
        var color;
        var x;
        var y;

        for (var i = 0; i < this.exitLocations.length; i++) {
            var loc = this.exitLocations[i];
            
            if (loc.levelNum == exitLocationLevel) {
                color = loc.colorObject;
                if (color != colorless) {
                    game.level.pawnChangedColorYet = true;
                    game.suppressFlicker = true;
                }
                x = loc.gridX;
                y = loc.gridY;
                break;
            } 
        }

        //console.log(color, x, y);
        this.pawn = new Pawn(color, x, y);
        game.pawn = this.pawn;

        game.setPawnColorText(color.name);

        game.exitLevelWithoutWin = false;
    }

    setDrawMode() {
        if (Math.random() < .02) {
            if (this.drawMode == 0) {
                this.drawMode = 1;
            } else {
                this.drawMode = 0;
            }
        } 
        
        return this.drawMode;
        
    }

    draw() {
        for (var i = 0; i < this.walls.length; i++) {
            this.walls[i].draw();
        }

        for (var i = 0; i < this.doors.length; i++) {
            var door = this.doors[i];
            door.draw();
            if (door.flickerFlag) {
                door.flicker();
            }
        }

        for (var i = 0; i < this.tokens.length; i++) {
            this.tokens[i].draw();
        }

        var mode = this.setDrawMode();

        for (var i = 0; i < this.doortokens.length; i++) {
            this.doortokens[i].draw(mode);
        }

        if (game.currentlyInWorld) {
            for (var i = 0; i < this.transportTokens.length; i++) {
                this.transportTokens[i].draw();
            }

            for (var i = 0; i < this.exitLocations.length; i++) {
                this.exitLocations[i].draw();
            }
        }

        for (var i = 0; i < this.coins.length; i++) {
            this.coins[i].animate();
        }
    }

    defineHitPoints(item) {

        var centerX = item.centerX;
        var centerY = item.centerY;
        var sizeAboveCenter = item.sizeAboveCenter;
        var sizeBelowCenter = item.sizeBelowCenter;
        var sizeLeftOfCenter = item.sizeLeftOfCenter;
        var sizeRightOfCenter = item.sizeRightOfCenter;
        

        // plus sign points
        var array1 = [
            [centerX, centerY],                           // center
            [centerX, centerY - sizeAboveCenter + item.topBuffer*2],   // top center
            [centerX, centerY + sizeBelowCenter - item.bottomBuffer*2],   // bottom center
            [centerX + sizeRightOfCenter - item.rightBuffer*2, centerY], // center right
            [centerX - sizeLeftOfCenter + item.leftBuffer*2,  centerY]  // center left
        ];
        
        
        var array2 = [];

        if (item instanceof DCCToken) {

            // near corner points
            array2 = [
                
                [centerX - (sizeLeftOfCenter/2) + item.leftBuffer*2,  centerY - (sizeAboveCenter/2) + item.topBuffer*2],   // top left
                [centerX - (sizeLeftOfCenter/2) + item.leftBuffer*2,  centerY + (sizeBelowCenter/2) - item.bottomBuffer*2],   // bottom left
                [centerX + (sizeRightOfCenter/2) - item.rightBuffer*2, centerY - (sizeAboveCenter/2) + item.topBuffer*2], // top right
                [centerX + (sizeRightOfCenter/2) - item.rightBuffer*2, centerY + (sizeBelowCenter/2) - item.bottomBuffer*2],  // bottom right
            ];

        } else {
            
            // far corner points
            array2 = [
                
                [centerX - sizeLeftOfCenter + item.leftBuffer*2,  centerY - sizeAboveCenter + item.topBuffer*2],   // top left
                [centerX - sizeLeftOfCenter + item.leftBuffer*2,  centerY + sizeBelowCenter - item.bottomBuffer*2],   // bottom left
                [centerX + sizeRightOfCenter - item.rightBuffer*2, centerY - sizeAboveCenter + item.topBuffer*2], // top right
                [centerX + sizeRightOfCenter - item.rightBuffer*2, centerY + sizeBelowCenter - item.bottomBuffer*2],  // bottom right
            ];

        }

        var arrayOfHPCoords = array1.concat(array2);
        //console.log(item, "HP Coords:",arrayOfHPCoords);
        return arrayOfHPCoords;
    }

    getAllItems() {
        var allItems = [];

        //allItems.push(this.pawn);

        if (!game.currentlyInWorld) {
            allItems.push(this.goal);
        }

        for (var i = 0; i < this.tokens.length; i++) {
            var item = this.tokens[i];
            allItems.push(item);
        }

        for (var i = 0; i < this.doortokens.length; i++) {
            var item = this.doortokens[i];
            allItems.push(item);
        }

        if (game.currentlyInWorld) {
            for (var i = 0; i < this.transportTokens.length; i++) {
                var item = this.transportTokens[i];
                allItems.push(item);
            }

            for (var i = 0; i < this.exitLocations.length; i++) {
                var item = this.exitLocations[i];
                allItems.push(item);
            }
        }

        for (var i = 0; i < this.coins.length; i++) {
            var item = this.coins[i];
            allItems.push(item);
        }
        
        return allItems;
    }

    drawHitPoints() {
        
        var allItems = this.getAllItems();


        for (var i = 0; i < allItems.length; i++) {
            
            var item = allItems[i];

            var fontColor = "black";
            if (item.colorObject != null) {
                var darkFlag = item.colorObject.checkBgColor();
                if (darkFlag) {
                    fontColor = "white";
                } else {
                    fontColor = "black";
                }
            }
            
            var arrayOfHPCoords = this.defineHitPoints(item);

            for (var j = 0; j < arrayOfHPCoords.length; j++) {
                            

                var x = arrayOfHPCoords[j][0];
                var y = arrayOfHPCoords[j][1];
                this.drawDot(x, y, fontColor);

            }
        }
    }

    drawDot(x, y, color) {
          
        var pointSize = 2;  // hard coded constant!!!!!
        game.ctx.fillStyle = color;
        game.ctx.beginPath();
        game.ctx.arc(x, y, pointSize, 0, Math.PI * 2, true);
        game.ctx.fill();
      
    }

    updateBlockages() {

        // Clear previous list
        this.blockages.length = 0;
        

        // Add all walls to blockages

        for (var i = 0; i < this.walls.length; i++) {
            this.blockages.push(this.walls[i]);
        }
        

        // Add all doors except pawn color to blockages

        for (var i = 0; i < this.doors.length; i++) {
            var door = this.doors[i];
            if (door.colorObject != this.pawn.colorObject) {
                this.blockages.push(door);
            } 
        }

    }
    /* not in use
    removeToken(tokenCaught) {
        for (var i = 0; i < this.tokens.length; i++) {
            var token = this.tokens[i];
            if (token == tokenCaught) {
                this.tokens.splice(i, 1); // removes one element at index i
            }
        }
    }
    */

    removeCoin(coinCaught) {
        for (var i = 0; i < this.coins.length; i++) {
            var coin = this.coins[i];
            if (coin == coinCaught) {
                this.coins.splice(i, 1); // removes one element at index i
            }
        }

    }

}

class World extends Level {
    constructor(letter) {          // equivalent to level number, but it's a capital letter
        super();
        this.number = letter;
        if (game.logLevelDesign) {console.log("Building World", this.number, "...");}
        this.numeric = this.number.charCodeAt(0) - 65; // converts A to 0, B to 1, etc.
        this.details = game.worldDesigns[this.numeric];
        this.title = this.details.title;
        this.backgroundColor = this.details.backgroundColor;
        this.design = this.details.design;
        this.walls = [];
        this.doors = [];
        this.blockages = [];
        this.tokens = []; // pawn color-change tokens
        this.doortokens = []; // door color-change tokens
        this.coins = [];
        this.goal;
        this.pawn;
        this.allItems = []; // not including walls, doors, pawn?
        this.startingX;
        this.startingY;
        this.wallWidth = 0;    
        this.pawnChangedColorYet = false;
        this.drawMode = 0;

        this.name = "World " + parseInt(this.numeric + 1);
        this.transportTokens = [];
        this.exitLocations = [];
        this.worldColors = this.details.colors;
    }
}



// VISIBLE ITEMS ON GAME BOARD

class VisibleItem {
    constructor() {
        this.speedX = 0;     
        this.speedY = 0;
        this.width = 0;
        this.height = 0;
        this.EDGEBUFFER = game.level.EDGEBUFFER;
        this.topBuffer = this.EDGEBUFFER;
        this.bottomBuffer = this.EDGEBUFFER;
        this.leftBuffer = this.EDGEBUFFER;
        this.rightBuffer = this.EDGEBUFFER; 
    }

    newPos() {
        this.x += this.speedX;
        this.y += this.speedY;
    }     
}

class ImageInCell extends VisibleItem {
    constructor() {
        super(); 
    }

    calculateCoords(gridX, gridY) {
        this.centerX = game.gridToPixelsX(gridX);
        this.centerY = game.gridToPixelsY(gridY);
        this.x = this.centerX - (this.displayWidth / 2);
        this.y = this.centerY - (this.displayHeight / 2);

        this.sizeAboveXY = 0;
        this.sizeBelowXY = this.displayHeight;
        this.sizeLeftOfXY = 0;
        this.sizeRightOfXY = this.displayWidth;

        this.sizeAboveCenter = this.displayHeight / 2 - this.topBuffer;
        this.sizeBelowCenter = this.displayHeight / 2 - this.bottomBuffer;
        this.sizeLeftOfCenter = this.displayWidth / 2 - this.leftBuffer;
        this.sizeRightOfCenter = this.displayWidth / 2 - this.rightBuffer;
    }

}

class SpriteInCell extends ImageInCell {
    constructor() {
        super();
        this.imageInfo = { sheet : null,
                            sheetVerticalOffset : 0,
                            sheetHorizontalOffset : 0,
                            imgQty : 1,
                            width : 0,
                            height : 0, 
                            leftBuffer : 0,
                            rightBuffer : 0,
                            topBuffer : 0,
                            bottomBuffer : 0,
                            animationRate : game.GLOBAL_ANIMATION_RATE,
                        }; 

        this.displayWidth = game.level.cellSize - (game.level.wallWidth / 2);
        this.displayHeight = game.level.cellSize - (game.level.wallWidth / 2);

        this.currentImageIndex = 0;
        this.animationRate = this.imageInfo.animationRate;
        this.animationCounter = 0;
    }

    pullImageInfo() {
        this.width = this.imageInfo.width;
        this.height = this.imageInfo.height;
        this.leftBuffer = this.imageInfo.leftBuffer;
        this.rightBuffer = this.imageInfo.rightBuffer;
        this.topBuffer = this.imageInfo.topBuffer;
        this.bottomBuffer = this.imageInfo.bottomBuffer;
    }

    animate() {
        var current = this.currentImageIndex;
        var imgQty = this.imageInfo.imgQty;
        var cutWidth = this.imageInfo.width;

        if (imgQty > 1) {
            if (this.animationCounter < this.animationRate) { 
                this.animationCounter++;
            } else {
                if (current + 1 < imgQty) {
                    this.currentImageIndex += 1;
                } else {
                    this.currentImageIndex = 0;
                }
                this.animationCounter = 0;
            }
        }

        var sheet = this.imageInfo.sheet;
        var sourceX = this.imageInfo.sheetHorizontalOffset + 
                        (cutWidth * this.currentImageIndex);
        var sourceY = this.imageInfo.sheetVerticalOffset;

        this.draw(sheet, sourceX, sourceY);
    
    }

    draw(sheet, sourceX, sourceY) {
        game.ctx.drawImage(sheet, sourceX, sourceY, this.width, this.height, // where to get image from sheet
                        this.x, this.y, this.displayWidth, this.displayHeight); // where to put image on canvas
    }
}


class Coin extends SpriteInCell {
    constructor(gridX, gridY) {
        super();

        this.imageInfo.sheet = game.coinSprite;
        this.imageInfo.sheetVerticalOffset = 0;
        this.imageInfo.sheetHorizontalOffset = 0;
        this.imageInfo.imgQty = 6;
        this.imageInfo.width = 50;
        this.imageInfo.height = 50; 
        this.imageInfo.leftBuffer = 3;
        this.imageInfo.rightBuffer = 3;
        this.imageInfo.topBuffer = 3;
        this.imageInfo.bottomBuffer = 3;

        this.pullImageInfo();
        this.calculateCoords(gridX, gridY);

        this.name = "Coin at (" + gridX + ", " + gridY + ")";

    }

}

class Goal extends SpriteInCell {          
    constructor(gridX, gridY) {
        super();

        this.imageInfo.sheet = game.goalSprite;
        this.imageInfo.sheetVerticalOffset = 0;
        this.imageInfo.sheetHorizontalOffset = 0;
        this.imageInfo.imgQty = 8;
        this.imageInfo.width = 50;
        this.imageInfo.height = 50; 
        this.imageInfo.leftBuffer = 2;
        this.imageInfo.rightBuffer = 2;
        this.imageInfo.topBuffer = 2;
        this.imageInfo.bottomBuffer = 2;

        this.pullImageInfo();
        this.calculateCoords(gridX, gridY);

        this.name = "Goal at (" + gridX + ", " + gridY + ")";
    }
}

class DrawnItem extends VisibleItem {         // lines and arcs drawn as strokes on canvas (not images and sprites)
    constructor(colorObjects) {
        super();
        if (Array.isArray(colorObjects)) {
            this.colorObject1 = colorObjects[0];
            this.colorObject2 = colorObjects[1];
            this.color1 = this.colorObject1.rgb;
            this.color2 = this.colorObject2.rgb;
        } else {
            this.colorObject = colorObjects;
            this.color = this.colorObject.rgb;
        }            
    }
    
}

class WallDoor extends DrawnItem {
    constructor(colorObject, orientation, beforeCell) {
        super(colorObject);
        this.lineWidth = game.level.wallWidth;                      
        this.orientation = orientation;
        this.beforeCell = beforeCell;
        this.beforeX = this.beforeCell[0];
        this.beforeY = this.beforeCell[1];
        this.flickerFlag = false;
        this.calculateCoords();
        this.draw();
    }

    calculateCoords() {
        this.x = game.gridToPixelsX(this.beforeX);
        this.y = game.gridToPixelsY(this.beforeY);

        if (this.orientation == "horizontal") {
            this.startingX = this.x - (game.level.cellSize / 2);
            this.endingX = this.x + (game.level.cellSize / 2);
            this.startingY = this.y;
            this.endingY = this.y;
        } else if (this.orientation == "vertical") {
            this.startingX = this.x;
            this.endingX = this.x;
            this.startingY = this.y - (game.level.cellSize / 2);
            this.endingY = this.y + (game.level.cellSize / 2);
        } else {
            console.log("Error in horizontal or vertical wall/door")
        }
    }

    draw() {
        game.ctx.strokeStyle = this.color;
        game.ctx.lineWidth = this.lineWidth;
        game.ctx.beginPath();
        game.ctx.lineCap = "round";
        game.ctx.moveTo(this.startingX, this.startingY);
        game.ctx.lineTo(this.endingX, this.endingY);
        game.ctx.stroke();
        if (this.colorObject == colorless) {
            this.flickerFlag = true;
        }
    }

    flicker() {
        var prob = Math.random();
        if (prob < 0.1) {
            this.color = randomColor();
        } else if (prob > 0.7) {
            this.color = game.PAWNCOLOR.rgb; 
        } 
        
    }
}

class Wall extends WallDoor {
    constructor(orientation, beforeCell) {
        var colorObject = black;                    
        super(colorObject, orientation, beforeCell);
        this.name = orientation + " wall at (" + this.beforeX + ", " + this.beforeY + ")";
    }

}

class Door extends WallDoor {
    constructor(colorAbbreviation, orientation, beforeCell) {
        var colorObject = AbbrToColorObj(colorAbbreviation);
        //console.log("door color:", colorObject.name);
        super(colorObject, orientation, beforeCell);
        this.name = colorObject.name + orientation + " door at (" + this.beforeX + ", " + this.beforeY + ")";
    }

}


class DrawnItemInCell extends DrawnItem {
    constructor(colorObjects, gridX, gridY, width, height) {
        //console.log(colorObjects);
        super(colorObjects);
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = game.gridToPixelsX(gridX); 
        this.y = game.gridToPixelsY(gridY); 
        this.width = width;
        this.height = height;

        this.topBuffer = this.EDGEBUFFER;
        this.bottomBuffer = this.EDGEBUFFER;
        this.leftBuffer = this.EDGEBUFFER;
        this.bottomBuffer = this.EDGEBUFFER;
    }
}


class TransportToken extends DrawnItemInCell {
    constructor(destinationLevelNumber, gridX, gridY, colorObject) {
        super(colorObject, gridX, gridY, game.level.itemRadius * 2, game.level.itemRadius * 2);
        this.levelNum = destinationLevelNumber;
        this.name = "Transport Token for Level " + this.levelNum + " at (" + gridX + ", " + gridY + ")";
        this.radius = game.level.cellSize / 3.5;
        this.lineWidth =  game.level.cellSize / 10;  
        this.shadowSize = game.level.cellSize / 20;
        this.calculateCoords();
        this.topBuffer = 0; 
        this.bottomBuffer = 0;
        this.leftBuffer = 0;
        this.rightBuffer = 0;
        this.width = this.radius *2;
        this.height = this.radius *2;

        this.visible = true;
        this.levelBeaten = false;
        
    }

    calculateCoords() {
        this.sizeAboveXY = this.radius;
        this.sizeBelowXY = this.radius;
        this.sizeLeftOfXY = this.radius;
        this.sizeRightOfXY = this.radius;

        this.sizeAboveCenter = this.radius;
        this.sizeBelowCenter = this.radius;
        this.sizeLeftOfCenter = this.radius;
        this.sizeRightOfCenter = this.radius;

        this.centerX = this.x;
        this.centerY = this.y;
        
        this.left = this.x - this.radius;
        this.right = this.x + this.radius;
        this.top = this.y - this.radius;
        this.bottom = this.y + this.radius;
    }

    draw() { 

        var fillColor;
        var SHADOW_COLOR = gray50;

        // draw shadow        
        fillColor = SHADOW_COLOR;                      
        game.ctx.fillStyle = fillColor.rgb;
        game.ctx.fillRect(this.left + this.shadowSize, this.top + this.shadowSize, this.width + this.shadowSize, this.height + this.shadowSize); 

        // fill center with color based on if beaten        
        if (this.levelBeaten) {
            fillColor = game.BEATEN_LEVEL_COLOR;
        } else {
            fillColor = this.colorObject;
        }
        game.ctx.fillStyle = fillColor.rgb;
        game.ctx.fillRect(this.left, this.top, this.width, this.height); 
        

        // draw box with token color
        game.ctx.strokeStyle = this.color;
        game.ctx.lineWidth = this.lineWidth;
        game.ctx.beginPath();
        game.ctx.moveTo(this.left, this.top);
        game.ctx.lineTo(this.right, this.top);
        game.ctx.stroke();
        game.ctx.lineTo(this.right, this.bottom);
        game.ctx.stroke();
        game.ctx.lineTo(this.left, this.bottom);
        game.ctx.stroke();
        game.ctx.closePath();
        game.ctx.stroke();

        // put level number inside
        var fontColor;
        var darkFlag = fillColor.checkBgColor();
        if (darkFlag) {
            fontColor = "white";
        } else {
            fontColor = "black";
        }

        game.ctx.font="22px Tahoma";
        game.ctx.textAlign="center"; 
        game.ctx.textBaseline = "middle";
        game.ctx.fillStyle = fontColor;
        game.ctx.fillText(this.levelNum, this.left+(this.width/2), this.top+(this.height/2));
        
    }
    
}


class ExitLocation extends DrawnItemInCell {
    constructor(comingFromLevelNumber, gridX, gridY, colorObject) {
        super(colorObject, gridX, gridY, game.level.itemRadius * 2, game.level.itemRadius * 2);
        this.levelNum = comingFromLevelNumber;
        this.name = "Exit Location for Level " + this.levelNum + " at (" + gridX + ", " + gridY + ")";
        this.radius = game.level.cellSize / 3;
        //this.lineWidth =  game.level.cellSize / 10;  
        this.calculateCoords();
        var b = 0;
        this.topBuffer = b;
        this.bottomBuffer = b;
        this.leftBuffer = b;
        this.rightBuffer = b;
        this.width = this.radius*1.8;
        this.height = this.radius*1.8;
    }

    calculateCoords() {
        this.sizeAboveXY = this.radius;
        this.sizeBelowXY = this.radius;
        this.sizeLeftOfXY = this.radius;
        this.sizeRightOfXY = this.radius;

        this.sizeAboveCenter = this.radius;
        this.sizeBelowCenter = this.radius;
        this.sizeLeftOfCenter = this.radius;
        this.sizeRightOfCenter = this.radius;

        this.centerX = this.x;
        this.centerY = this.y;

        
        this.left = this.x - this.radius + this.leftBuffer;
        this.right = this.x + this.radius - this.rightBuffer;
        this.top = this.y - this.radius + this.topBuffer;
        this.bottom = this.y + this.radius - this.bottomBuffer;
    }


    draw() {
        if (game.showExitLocations ){
                  
            var fillColor = this.colorObject;
            game.ctx.fillStyle = fillColor.rgb;
            game.ctx.fillRect(this.left, this.top, this.width, this.height); 

            // put level number inside
            var fontColor;
            var darkFlag = fillColor.checkBgColor();
            if (darkFlag) {
                fontColor = "white";
            } else {
                fontColor = "black";
            }

            game.ctx.font="22px Tahoma";
            game.ctx.textAlign="center"; 
            game.ctx.textBaseline = "middle";
            game.ctx.fillStyle = fontColor;
            game.ctx.fillText(this.levelNum, this.left+(this.width/2)-this.leftBuffer, this.top+(this.height/2)-this.topBuffer);
        }
    }
}



class DCCToken extends DrawnItemInCell {        // door color change token
    constructor(colorAbbr1, colorAbbr2, gridX, gridY) {
        var colorObject1 = AbbrToColorObj(colorAbbr1);
        var colorObject2 = AbbrToColorObj(colorAbbr2);
        var colorObjects = [colorObject1, colorObject2];
        super(colorObjects, gridX, gridY, game.level.itemRadius * 1.5, game.level.itemRadius * 1.5);
        this.name = colorObject1.name + "-" + colorObject2.name + " door-change token at (" + gridX + ", " + gridY + ")";
        this.radius = game.level.cellSize / 2;
        this.lineWidth =  game.level.cellSize / 4;
        this.calculateCoords();
        
    }

    calculateCoords() {
        this.sizeAboveXY = this.radius;
        this.sizeBelowXY = this.radius;
        this.sizeLeftOfXY = this.radius;
        this.sizeRightOfXY = this.radius;

        this.sizeAboveCenter = this.radius;
        this.sizeBelowCenter = this.radius;
        this.sizeLeftOfCenter = this.radius;
        this.sizeRightOfCenter = this.radius;

        this.centerX = this.x;
        this.centerY = this.y;

        
        this.startingXH = this.x - this.radius + game.level.wallWidth;
        this.endingXH = this.x + this.radius - game.level.wallWidth;
        this.startingYH = this.y;
        this.endingYH = this.y;
        
        this.startingXV = this.x;
        this.endingXV = this.x;
        this.startingYV = this.y - this.radius + game.level.wallWidth;
        this.endingYV = this.y + this.radius - game.level.wallWidth;
    }

    draw(mode) { 
        //console.log(this.color1, this.color2);

        var hColor;
        var vColor;

        if (mode == 0) {
            hColor = this.color1;
            vColor = this.color2;
        } else {
            vColor = this.color1;
            hColor = this.color2;
        }

        game.ctx.lineWidth = this.lineWidth;
        game.ctx.lineCap = "round";

        game.ctx.strokeStyle = hColor;
        game.ctx.beginPath();
        game.ctx.moveTo(this.startingXH, this.startingYH);
        game.ctx.lineTo(this.endingXH, this.endingYH);
        game.ctx.stroke();

        game.ctx.strokeStyle = vColor;
        game.ctx.beginPath();
        game.ctx.moveTo(this.startingXV, this.startingYV);
        game.ctx.lineTo(this.endingXV, this.endingYV);
        game.ctx.stroke();

        
        game.ctx.lineWidth = this.radius / 2;
        game.ctx.lineCap = "square";

        game.ctx.strokeStyle = blend(hColor, vColor);
        game.ctx.beginPath();
        game.ctx.moveTo(this.centerX, this.centerY);
        game.ctx.lineTo(this.centerX, this.centerY);
        game.ctx.stroke();
    }
}



class CircleInCell extends DrawnItemInCell {
    constructor(colorObject, gridX, gridY) {
        super(colorObject, gridX, gridY, game.level.itemRadius * 2, game.level.itemRadius * 2);
        this.radius = game.level.itemRadius;
        this.lineWidth =  this.radius / 2;    
        this.calculateCoords();

        var b = this.radius / 10;

        this.topBuffer = b;
        this.bottomBuffer = b;
        this.leftBuffer = b;
        this.rightBuffer = b;
    }

    calculateCoords() {
        this.sizeAboveXY = this.radius;
        this.sizeBelowXY = this.radius;
        this.sizeLeftOfXY = this.radius;
        this.sizeRightOfXY = this.radius;

        this.sizeAboveCenter = this.radius;
        this.sizeBelowCenter = this.radius;
        this.sizeLeftOfCenter = this.radius;
        this.sizeRightOfCenter = this.radius;

        this.centerX = this.x;
        this.centerY = this.y;
    }


    draw() {                                            
        game.ctx.strokeStyle = this.color;
        game.ctx.lineWidth = this.lineWidth;
        game.ctx.beginPath();
        game.ctx.arc(this.x, this.y, this.radius, 0, (2 * Math.PI));
        game.ctx.stroke();
    }                                                   
}


class PCCToken extends CircleInCell {        // pawn color change token
    constructor(colorAbbreviation, gridX, gridY) {
        var colorObject = AbbrToColorObj(colorAbbreviation);
        super(colorObject, gridX, gridY);
        this.name = colorObject.name + " pawn-change token at (" + gridX + ", " + gridY + ")";
    }
}


class Pawn extends CircleInCell {                          
    constructor(colorObject, gridX, gridY) {
        super(colorObject, gridX, gridY);
        this.isColliding = false;
        this.isCollidingWith = [];
        this.name = "Pawn";
        this.paralyzed = false;
    }

    newPos() {
        this.x += this.speedX;
        this.y += this.speedY;

        this.calculateCoords();
        this.checkCollisions();
        this.name = "Pawn at (" + this.x + ", " + this.y + ")";
    }

    flicker() {
        var currentPawnColorText = document.getElementById("currentColorSpan").innerText;
        game.setPawnColorText(game.questionMarks(currentPawnColorText));
        var prob = Math.random();
        if (prob < 0.1) {
            this.color = randomColor();
        } else if (prob > 0.7) {
            this.color = game.PAWNCOLOR.rgb; 
        } 
        
    }

    processItemsCaught(itemsToAdd) {
        var newItems = [];

        if (itemsToAdd != null) {
            
            for (var i = 0; i < itemsToAdd.length; i++) {
                var itemCaught = itemsToAdd[i];
                if (this.isCollidingWith.includes(itemCaught)) {
                    
                } else {
                    //console.log("CAUGHT:", itemCaught.name);
                    newItems.push(itemCaught);
                    this.isCollidingWith.push(itemCaught);
                    
                }
            }
        } 

        return newItems;
    }

    removeCollidingWith(itemToRemove) {
        //console.log("No Longer Colliding With:", itemToRemove.name);
        for (var i = 0; i < this.isCollidingWith.length; i++) {
            var itemInCollidingWithList = this.isCollidingWith[i];
            if (itemInCollidingWithList == itemToRemove) {
                this.isCollidingWith.splice(i, 1); // removes one element at index i
            }
        }
        //console.log("Still Colliding With:", this.isCollidingWith);
    }
    


    checkCollisions() {
        //console.log(this.isColliding);

        game.ctx.beginPath();
        game.ctx.arc(game.pawn.x, game.pawn.y, game.pawn.radius, 0, (2 * Math.PI));

        var pawnTokensCaught = this.checkLoopCollision(game.level.tokens);
        var newPTs = this.processItemsCaught(pawnTokensCaught);
        for (var i = 0; i < newPTs.length; i++) {
            this.changeColor(newPTs[i]);
        }

        var doorTokensCaught = this.checkLoopCollision(game.level.doortokens);
        var newDTs = this.processItemsCaught(doorTokensCaught);
        for (var i = 0; i < newDTs.length; i++) {
            var doorTokenCaught = newDTs[i];
            var colorObject1 = doorTokenCaught.colorObject1;
            var colorObject2 = doorTokenCaught.colorObject2;
            
            for (var i = 0; i < game.level.doors.length; i++) {
                
                var door = game.level.doors[i];

                if (door.colorObject == colorObject1) {
                    door.colorObject = colorObject2;   
                    door.color = door.colorObject.rgb;
                } else if (door.colorObject == colorObject2) {
                    door.colorObject = colorObject1;
                    door.color = door.colorObject.rgb;
                } 
                
            }
            game.level.updateBlockages();
        }

        if (game.currentlyInWorld) {
            var transportTokensCaught = this.checkLoopCollision(game.level.transportTokens);
            var newTTs = this.processItemsCaught(transportTokensCaught);
            for (var i = 0; i < newTTs.length; i++) {
                game.transportTokenCaught(newTTs[i]);
                return;
            }
        }
        
        var coinsCaught = this.checkLoopCollision(game.level.coins);
        // no need to processItemsCaught because they are removed upon contact
        if (coinsCaught != null) {
            for (var i = 0; i < coinsCaught.length; i++) {
                var coinCaught = coinsCaught[i];
                //console.log("CAUGHT COIN:", coinCaught.name);
                game.level.removeCoin(coinCaught);
                //console.log("Removed from game:", coinCaught.name);
                //console.log("Now Colliding With:", this.isCollidingWith);
            }
        }
        
        var goalCaught = false;
        if (!game.currentlyInWorld) {
            goalCaught = this.checkSingleCollision(game.level.goal);
            
            if (goalCaught == true) {
                game.goalReached();
            }

        }

        // remove items no longer touching
        var emptyList = []; 
        var allItemsCaught = emptyList.concat(pawnTokensCaught).concat(doorTokensCaught).concat(transportTokensCaught);

        for (var i = 0; i < this.isCollidingWith.length; i++) {
            
            var itemInCollidingWithList = this.isCollidingWith[i];

            var stillTouching = false;
            
            if (allItemsCaught.includes(itemInCollidingWithList)) {
                stillTouching = true;
            }
            
            if (!stillTouching) {
                this.removeCollidingWith(itemInCollidingWithList);
            }
        
        }
        

        //console.log("token:", tokenCaught, "coin:", coinCaught, "goal:", goalCaught, "colliding:", this.isColliding);
        /*
        if (this.isColliding == true) {     // changes isColliding back after not on token anymore
            
            if ((tokenCaught == null) && (doorTokenCaught == null) && (coinCaught == null) && (goalCaught == false)) {
                this.isColliding = false;
            }
        }
        */
    }

    checkSingleCollision(item) {
        var arrayOfHPCoords = game.level.defineHitPoints(item);
        
        for (var i = 0; i < arrayOfHPCoords.length; i++) {
            var x = arrayOfHPCoords[i][0];
            var y = arrayOfHPCoords[i][1];
            if (game.ctx.isPointInPath(x, y)) {
                //console.log(item.name);
                //console.log(x, y);
                return true;
            }
        }
        return false;
    }

    checkLoopCollision(array) {
        var itemsCaught = [];

        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            
            var hitFlag = this.checkSingleCollision(item);
            if (hitFlag == true) {
                //console.log(item.name);
                itemsCaught.push(item);   
            }
        }

        if (itemsCaught.length > 0) {
            return itemsCaught;
        } else {
            return null;
        }
    }

    changeColor(tokenCaught) {
        //console.log("Changed Yet?", game.level.pawnChangedColorYet);

        game.beginBlendAnimation(tokenCaught);

        if (game.level.pawnChangedColorYet == false) {
            this.colorObject = tokenCaught.colorObject;
            this.color = this.colorObject.rgb;
            game.level.pawnChangedColorYet = true;

            //game.level.removeToken(tokenCaught);
            //console.log("first token caught; pawn color replaced");
        } else {
            this.color = blend(this.color, tokenCaught.color);
            this.colorObject = RGBtoColorObj(this.color);
            
            //game.level.removeToken(tokenCaught);
            //console.log("subsequent token caught; pawn color blended");
        }
        
        var newColorName;
        var noColorFoundMessage;
        if (game.currentlyInWorld) {
            noColorFoundMessage = "undefined.\n(You can save, quit, and reload game.)";
        } else {
            noColorFoundMessage = "undefined.\n(You might want to restart.)";
        }
        
        
        
        if (this.colorObject !== undefined) {
            newColorName = this.colorObject.name;
        } else {
            newColorName = noColorFoundMessage;
        }
         
        game.setPawnColorText(newColorName);
        //console.log("pawn color: " + newColorName); 
        if (newColorName == noColorFoundMessage) {
            console.log(game.pawn.color);
        }
        

        game.level.updateBlockages();
        
    }

    checkWallsUp() {
        //console.log(game.pawn.x, game.pawn.y);
        var wallsHit = [];
        for (var i = 0; i < game.blockages.length; i++) {
            var wall = game.blockages[i]
            if (wall.orientation == "horizontal") {
                //console.log(wall.startingX, wall.endingX, wall.startingY, wall.endingY);
                if ((wall.startingX < game.pawn.x + game.pawn.radius) && 
                    (game.pawn.x - game.pawn.radius < wall.endingX)) {
                    if ((wall.y - 5 < game.pawn.y - game.pawn.radius - 2*this.EDGEBUFFER) && 
                        (game.pawn.y - game.pawn.radius - 2*this.EDGEBUFFER < wall.y + 5)) {
                            wallsHit.push(wall);
                    }
                }

            } else if (wall.orientation == "vertical") { 
                game.ctx.beginPath();
                game.ctx.arc(game.pawn.x, game.pawn.y, game.pawn.radius, 0, (2 * Math.PI));
                if (game.ctx.isPointInPath(wall.x - this.EDGEBUFFER, wall.endingY) || 
                    game.ctx.isPointInPath(wall.x, wall.endingY) || 
                    game.ctx.isPointInPath(wall.x + this.EDGEBUFFER, wall.endingY) ) {
                        wallsHit.push(wall);
                }
            }


            if (wallsHit.length > 0) { 
                //console.log("Hit", wallsHit[0].colorObject.name, "wall/door (up) with", game.pawn.colorObject.name,"pawn");  
                return true;
            }
        }
        return false;
    }

    checkWallsDown() {
        var wallsHit = [];
        for (var i = 0; i < game.blockages.length; i++) {
            var wall = game.blockages[i]
            if (wall.orientation == "horizontal") {
                if ((wall.startingX < game.pawn.x + game.pawn.radius) && 
                    (game.pawn.x - game.pawn.radius < wall.endingX)) {
                    if ((wall.y - 5 < game.pawn.y + game.pawn.radius + 2 * this.EDGEBUFFER) && 
                        (game.pawn.y + game.pawn.radius + 2 * this.EDGEBUFFER < wall.y + 5)) {
                            wallsHit.push(wall);
                    }
                }

            } else if (wall.orientation == "vertical") { 
                game.ctx.beginPath();
                game.ctx.arc(game.pawn.x, game.pawn.y, game.pawn.radius, 0, (2 * Math.PI));
                if (game.ctx.isPointInPath(wall.x - this.EDGEBUFFER, wall.startingY) || 
                    game.ctx.isPointInPath(wall.x, wall.startingY) || 
                    game.ctx.isPointInPath(wall.x + this.EDGEBUFFER, wall.startingY) ) {
                        wallsHit.push(wall);
                }
            }

            if (wallsHit.length > 0) { 
                //console.log("Hit", wallsHit[0].colorObject.name, "wall/door (down) with", game.pawn.colorObject.name,"pawn");  
                return true;
            }
        }
        return false;
    }

    checkWallsLeft() {
        var wallsHit = [];
        for (var i = 0; i < game.blockages.length; i++) {
            var wall = game.blockages[i]
            if (wall.orientation == "vertical") {
                if ((wall.x - 5 < game.pawn.x - game.pawn.radius - this.EDGEBUFFER) && 
                    (game.pawn.x - game.pawn.radius - 2 * this.EDGEBUFFER < wall.x + 5)) {
                    if ((wall.startingY < game.pawn.y + game.pawn.radius) && 
                        (game.pawn.y - game.pawn.radius < wall.endingY)) {
                            wallsHit.push(wall);
                    }
                }
            } else if (wall.orientation == "horizontal") { 
                game.ctx.beginPath();
                game.ctx.arc(game.pawn.x, game.pawn.y, game.pawn.radius, 0, (2 * Math.PI));
                if (game.ctx.isPointInPath(wall.endingX, wall.y) || 
                    game.ctx.isPointInPath(wall.endingX, wall.y + this.EDGEBUFFER) || 
                    game.ctx.isPointInPath(wall.endingX, wall.y - this.EDGEBUFFER) ) {
                        wallsHit.push(wall);
                }
            }

            if (wallsHit.length > 0) { 
                //console.log("Hit", wallsHit[0].colorObject.name, "wall/door (left) with", game.pawn.colorObject.name,"pawn");  
                return true;
            }
        }
        return false;
    }

    checkWallsRight() {
        var wallsHit = []; 
        for (var i = 0; i < game.blockages.length; i++) {
            var wall = game.blockages[i]
            if (wall.orientation == "vertical") {
                if ((wall.x - 5 < game.pawn.x + game.pawn.radius + this.EDGEBUFFER) && 
                    (game.pawn.x + game.pawn.radius + 2 * this.EDGEBUFFER < wall.x + 5)) {
                    if ((wall.startingY < game.pawn.y + game.pawn.radius) && 
                        (game.pawn.y - game.pawn.radius < wall.endingY)) {
                            wallsHit.push(wall); 
                    }
                }
            } else if (wall.orientation == "horizontal") { 
                game.ctx.beginPath();
                game.ctx.arc(game.pawn.x, game.pawn.y, game.pawn.radius, 0, (2 * Math.PI));
                if (game.ctx.isPointInPath(wall.startingX, wall.y) || 
                    game.ctx.isPointInPath(wall.startingX, wall.y + this.EDGEBUFFER) || 
                    game.ctx.isPointInPath(wall.startingX, wall.y - this.EDGEBUFFER) ) { 
                        wallsHit.push(wall);
                }
            }
            if (wallsHit.length > 0) { 
                //console.log("Hit", wallsHit[0].colorObject.name, "wall/door (right) with", game.pawn.colorObject.name,"pawn");
                return true;
            }
        }
        return false;
    }



    moveup() {                         
        if (game.pawn.y > (this.radius + this.EDGEBUFFER)) {
            var collide = this.checkWallsUp();
            if (collide == false) {    
                game.pawn.speedY -= game.PAWNSPEED;      
            }                       
        }                   
    }

    movedown() {
        if (game.pawn.y < (game.height - this.radius - this.EDGEBUFFER)) {
            var collide = this.checkWallsDown();
            if (collide == false) {
                game.pawn.speedY += game.PAWNSPEED;
            }
        }
    }

    moveleft() {
        if (game.pawn.x > (this.radius + this.EDGEBUFFER)) {
            var collide = this.checkWallsLeft();
            if (collide == false) {
                game.pawn.speedX -= game.PAWNSPEED; 
            }
        }
    }

    moveright() {
        if (game.pawn.x < game.width - this.radius - this.EDGEBUFFER) {
            var collide = this.checkWallsRight();
            if (collide == false) {
                game.pawn.speedX += game.PAWNSPEED;
            }
        }
    }

    /*
    reset() {
        game.pawn.x = game.level.startingX;
        game.pawn.y = game.level.startingY;
        game.pawn.speedY = 0;
        game.pawn.speedX = 0;
    }
    */
}





// THE GAME AREA


class GameArea {
    constructor() {
        this.canvas = document.getElementById('canvas');
        //this.canvas.style.background = bgColor;
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 650;
        this.canvas.height = 350;
        this.showingInstructions = false;
        
    }

    showInstructions(contentDiv, button) {
        contentDiv.style.display = "block";
        button.innerText = "Hide"; 
        this.showingInstructions = true;
        var doc = document.getElementsByTagName("html");
    }

    hideInstructions(contentDiv, button) {
        contentDiv.style.display = "none";
        button.innerText = "Show";
        this.showingInstructions = false;
    }

    toggleInstructions() {
        //console.log(this.showingInstructions);
        var contentDiv = document.getElementById("ic");
        var button = document.getElementById("showInstructionsButton");
        if (this.showingInstructions == false) {
            this.showInstructions(contentDiv, button);
        } else {
            this.hideInstructions(contentDiv, button);
        }
    }

    updateButtonColors(item, modeString) {
        if (modeString == "on") {
            item.style.backgroundColor = "white";
            item.style.color = "black";
            item.style.borderColor = "black";
        } else if (modeString == "off") {
            item.style.backgroundColor = "black";
            item.style.color = "white";
            item.style.borderColor = "white";
        } else {
            console.log("error updating button colors");
        }
    }

    updateGridButtonColors() {
        var item = document.getElementById("gridButton");
        if (game.drawGrid) {
            this.updateButtonColors(item, "on");
        } else {
            this.updateButtonColors(item, "off");
        }
    }

    updateHPButtonColors() {
        var item = document.getElementById("hitPointsButton");
        if (game.drawHitPoints) {
            this.updateButtonColors(item, "on");
        } else {
            this.updateButtonColors(item, "off");
        }
    }
/*
    updateInstructionsButtonColors() {
        var item = document.getElementById("showInstructionsButton");
        if (this.showingInstructions) {
            this.updateButtonColors(item, "on");
        } else {
            this.updateButtonColors(item, "off");
        }
    }
*/
}



// THE GAME


class Game {
    constructor() {
        this.logLevelTestResults = false;       // dev - set to true to show level test results in console.log
        this.logLevelDesign = false;        // dev - set to true to show level items & grid coords in console.log
        this.logTouches = false;            // dev - set to true to show touch events in console.log
        this.showDevConsole = false;            // dev - set to true to show developer console on screen  
        this.showLevelConsole = false;       // level buttons only, for dev & as win bonus
        this.drawGrid = false;                  // (in dev console) show grid
        this.GRIDCOLOR = gray33.rgb;       //CHANGE TO USE ONE OF MY COLOR OBJECTS
        this.drawHitPoints = false;              // (in dev console) show collision points
        //this.HITPOINTCOLOR = "#000000";       // now calculated to be white or black dynamically
        this.showExitLocations = false;    // ADD TO DEV CONSOLE
        this.PAWNCOLOR = colorless;
        this.suppressFlicker = false;
        this.PAWNSPEED = 2;
        this.DEFAULT_BG_COLOR = gray67.rgb;
        this.BEATEN_LEVEL_COLOR = gray125;
        this.UNBEATEN_LEVEL_COLOR = black;  // not in use
        this.LEVEL_INTRO_COLOR = black;

        this.currentLevelNumber = "A";       
        this.currentWorldNumber = "A";
        this.currentlyInWorld = true;
        this.cameFromLevel = 0;
        this.levelDesigns = ALL_LEVEL_DESIGNS;
        this.worldDesigns = ALL_WORLD_DESIGNS;
        this.levelsBeaten = [];             // index in this list is one less than level number due to no Level 0
        this.worldIntrosSeen = [];
        this.exitLevelWithoutWin = false;


        this.coinSprite = this.loadImage("files/images/coin.png");
        this.goalSprite = this.loadImage("files/images/goal.png");
        this.GLOBAL_ANIMATION_RATE = 5;
        this.TITLE_DISPLAY_TIME = 100;
        this.showingBlendAnimation = false;
        this.blendAnimationObjects = [null, null, null];
        this.BLENDANIMATIONSPEED = 3;
        this.BLENDANIMATIONOPACITY = 0.9;
        this.TOUCHBUTTONPADDING = 16;       // allows user to touch outside the visible arrows
        this.gameArea = new GameArea();
        this.touchButtons = [];    // {id: "", rect: DOMrect object} ... has rect.top, rect.left, etc.
        this.keys = [];                             
        this.touchRLTB = [false, false, false, false] // stll in use?
        this.loaded = false;
        this.restartOnKeyRelease = false;
        this.transporting = false;
        this.animationTimer = 0;

        this.updateLevDevConsoles()
        
    }

    updateLevDevConsoles() {
        var topBar = document.getElementById("topBar");
        var devDiv = document.getElementById("dev");
        var levDiv = document.getElementById("lev");
        if (this.showDevConsole || this.showLevelConsole) {
            topBar.style.display = "block";
            levDiv.style.display = "inline-block";
            if (this.showDevConsole) {
                devDiv.style.display = "inline-block";
            } else {
                devDiv.style.display = "none";
            }
        } else {
            topBar.style.display = "none";
        }
    }

    checkLevelNumbers() {
        var numList = [];
        for (var i = 0; i < this.levelDesigns.length; i++) {
            var level = this.levelDesigns[i];
            var n = level.number
            if (n == null) {
                alert("Some level(s) have no number!");
                break
            } else if (numList.includes(n)) {
                alert("Too many Level Number " + String(n) + "s!");
            } else {
                numList.push(n);
            }
        }

        for (var i = 1; i < this.levelDesigns.length; i++) {
            var level = this.levelDesigns[i];
            var previousLevel = this.levelDesigns[i-1];
            if (level.number - 1 != previousLevel.number) {
                alert("Gap in level numbers:" + String(previousLevel.number) + " to " + String(level.number));
            }
        }
        //console.log(numList);

        return numList;

    }


    checkWorldNumbers() {
        var numList = [];
        for (var i = 0; i < this.worldDesigns.length; i++) {
            var level = this.worldDesigns[i];
            var n = level.number
            if (n == null) {
                alert('Some world(s) have no "number"!');
                break
            } else if (numList.includes(n)) {
                alert("Too many World " + n + "'s!");
            } else {
                numList.push(n);
            }
        }

        for (var i = 1; i < this.worldDesigns.length; i++) {
            var level = this.worldDesigns[i];
            var previousLevel = this.worldDesigns[i-1];
            if (level.number.charCodeAt(0) - 1 != previousLevel.number.charCodeAt(0)) {
                alert("Gap in world numbers:" + previousLevel.number + " to " + level.number);
            }
        }
        
        //console.log(numList);

        return numList;

    }

    sortLevels(a, b) {
        if (a.number < b.number) {
            return -1;
        }
        if (a.number > b.number) {
            return 1;
        }
        return 0;
    }

    

    placeLevelText() {
        var levSpan = document.getElementById("levelNum");
        var titleSpan = document.getElementById("levelTitle");

        if (game.winAnimation) {
            levSpan.innerText = game.previousLevel.name;
            titleSpan.innerText = game.previousLevel.title;
        } else {
            levSpan.innerText = game.level.name;
            titleSpan.innerText = game.level.title;
        }
    }

    generateLevelsBeatenList() {
        for (var i = 1; i <= this.levelDesigns.length; i++) {
            this.levelsBeaten.push(false);
        }
    }

    start() {
        if (this.levelsBeaten == []) {
            this.generateLevelsBeatenList();
        }

           

        //console.log("START GAME");
        //console.log(this.levelsBeaten);
        //console.log(this.currentLevelNumber);
        
        this.stopped = false;        
        this.canvas = this.gameArea.canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.ctx = this.gameArea.ctx;
        this.levelsThatExist = this.checkLevelNumbers();           // only needed during development
        this.worldsThatExist = this.checkWorldNumbers();           // only needed during development
        this.levelDesigns.sort(this.sortLevels);
        this.worldDesigns.sort(this.sortLevels);
        
        

        if (isNaN(this.currentLevelNumber)) {                   // world 
            this.currentlyInWorld = true;
            this.level = new World(this.currentLevelNumber);
        } else {
            this.currentlyInWorld = false;
            this.level = new Level(this.currentLevelNumber); 
        }

        
        this.checkLevelDesign(); // only needed during development, can be commented out       
        this.level.setup();
        this.walls = this.level.walls;
        this.doors = this.level.doors;  
        this.blockages = this.level.blockages;  
        this.tokens = this.level.tokens;  
        this.doortokens = this.level.doortokens;
        if (this.currentlyInWorld) {
            this.transportTokens = this.level.transportTokens;
            this.exitLocations = this.level.exitLocations;
        }
        
        this.coins = this.level.coins;                               
        this.pawn = this.level.pawn;
        this.goal = this.level.goal;
        this.startAnimation; 
        this.winAnimation;
        this.finalAnimation;
        

        this.createKeyboardListeners();

        if (this.currentlyInWorld) {
            this.updateLevelsBeaten();
        }

        if (!this.loaded) {
            this.repeatingFunction = requestAnimationFrame(game.refresh); 
            this.loaded = true;
        }
        
    }

    loadImage(src) {
        var pic = new Image();
        pic.src = src;
        return pic;
    }


    // TESTS TO CHECK LEVEL DESIGN
    // TESTS TO CHECK LEVEL DESIGN
    // TESTS TO CHECK LEVEL DESIGN
    checkLevelDesignButtonPressed() {
        var old_value = game.logLevelTestResults;
        game.logLevelTestResults = true;
        game.checkLevelDesign();
        game.logLevelTestResults = old_value;
    }

    checkLevelDesign() {
        if (game.logLevelTestResults) {console.log("Testing Level", game.level.number, "...")}
        var design = game.level.design;

        var designRowCount = this.designExistsTest(design);
        var gridRowCount = this.rowCountTest(designRowCount);
        this.vhTest(design, designRowCount);
        var rowLength = this.sameLengthTest(design, designRowCount); // count actual characters, not including prefix
        var designColCount = this.divisibleByThreeTest(rowLength); // count three-character-codes
        var gridColCount = this.columnToGridTest(designColCount);
        this.lrColTest(design, designRowCount, rowLength);
        this.hasTitleTest(game.level.title);
        if (!this.currentlyInWorld) {
            this.hasPawnTest(design, designRowCount);
            this.hasGoalTest(design, designRowCount); 
        } else { 
            var colors = game.level.worldColors;
            var allLevels = game.levelsThatExist;

            var [fromLevels, toLevels, tokenDetails] = this.worldTTAlignTest(design, designRowCount, colors, allLevels);
            this.worldTTColorsTest(fromLevels, toLevels, colors);
        } 
        

        if (game.logLevelTestResults) {console.log("...All 10 tests finished on Level", game.level.number);}
        if (game.logLevelDesign) {console.log("grid:", gridColCount, "x", gridRowCount);}
    }


    // DESIGN EXISTS TEST: nonzero number of rows in design
    designExistsTest(design) {
        var rowCount = design.length;
        var testResult = false;
        if (rowCount == 0) {
            alert("Design has no rows!");
        } else {
            testResult = true;
        }
        if (game.logLevelTestResults) {console.log("1/10: Design Exists Test passed?", testResult);}
        return rowCount;
    }
    
    
    // ROW COUNT TEST: design will lead to a whole number of grid rows
    rowCountTest(rowCount) {
        var testResult = false;
        var gridRowCount = (rowCount + 1) / 2;
        if (Number.isInteger(gridRowCount)) {
            testResult = true;
        } else {
            alert("Invalid number of rows in design!");
        }
        if (game.logLevelTestResults) {console.log("2/10: Row Count Test passed?", testResult);}
        return gridRowCount;
    }
            
    
    // V-H TEST
    vhTest(design, rowCount) {
        var testResult = false;
        var vTestResult = true;
        var hTestResult = true;
        
        for (var rowNum = 0; rowNum < rowCount; rowNum++) {
            var prefix = design[rowNum][0];

            // row zero & even indexed rows start with v
            if (Number.isInteger(rowNum/2)) {
                if (!(prefix == "v")) {
                    vTestResult = false;
                }
            // odd indexed rows start with h
            } else {
                if (!(prefix == "h")) {
                    hTestResult = false;
                }
            }
        }
        if (vTestResult && hTestResult) {
            testResult = true;
        } else {
            alert("Did not find expected v-h row(s)!");
        }
        if (game.logLevelTestResults) {console.log("3/10: V-H Test passed?", testResult);}
    }
        

    // SAME LENGTH TEST: all rows are the same # of columns
    sameLengthTest(design, rowCount) {
        var testResult = true;
    
        var firstRowLength = design[0].length; // including prefix
        for (var rowNum = 0; rowNum < rowCount; rowNum++) {
            var rowLength = design[rowNum].length; // including prefix
            if (rowLength != firstRowLength) {
                testResult = false;
            }
        }
        if (!testResult) {
            alert("Rows not all the same number of columns!");
            if (game.logLevelTestResults) {console.log("4/10: Same Length Test passed?", testResult);}
            return null;
        } 
        if (game.logLevelTestResults) {console.log("4/10: Same Length Test passed?", testResult);}
        return firstRowLength - 1; // not including prefix
    }

    // DIVISIBLE BY THREE TEST: design will lead to a whole number of three-character codes
    divisibleByThreeTest(rowLength) {
        var testResult = false;
        var designColCount = rowLength / 3;
        if (Number.isInteger(designColCount)) {
            testResult = true;
        } else {
            alert("Row length not divisible by three!");
            if (game.logLevelTestResults) {console.log("5/10: Divisible By Three test passed?", testResult);}
        }
        if (game.logLevelTestResults) {console.log("5/10: Divisible By Three test passed?", testResult);}
        return designColCount;
    }      
    
    // COLUMN TO GRID TEST: design will lead to a whole number of design cols
    columnToGridTest(designColCount) {
        var testResult = false;
        var gridColCount = (designColCount + 1) / 2;
        if (Number.isInteger(gridColCount)) {
            testResult = true;
        } else {
            alert("Cannot convert 3-character codes into columns!");
            if (game.logLevelTestResults) {console.log("6/10: Column To Grid test passed?", testResult);}
        }
        if (game.logLevelTestResults) {console.log("6/10: Column To Grid test passed?", testResult);}
        return gridColCount;
    }       
    
    // L-R COLUMN TEST: leftmost & rightmost cols are for walkable cells not vertical walls/doors?
    lrColTest(design, rowCount, rowLength) {
        var testResult = true;
        for (var rowNum = 0; rowNum < rowCount; rowNum++) {
            var row = design[rowNum];
            var firstChar = row[1]; // first char after prefix 
            var lastChar = row[rowLength]; // not need -1 to adjust for 0 index because rowLength already is one shorter because doesn't count prefix
            if ((firstChar == "|") || (lastChar == "|")) {
                testResult = false;
                if (game.logLevelTestResults) {console.log("7/10: L-R Column Test result:", testResult);}
                return;
            }
        }
        
        if (game.logLevelTestResults) {console.log("7/10: L-R Column Test result:", testResult);}
    }

    // HAS TITLE TEST: Level has a Title
    hasTitleTest(title) {
        var testResult = false;

        if (title.length > 0) {
            testResult = true;
            if (game.logLevelTestResults) {console.log("8/10: Has Title:", testResult);}
            return;
        } 
        
        alert("There is no TITLE!");
        if (game.logLevelTestResults) {console.log("8/10: Has Title:", testResult);}
        return;
        
    }
    
    // HAS PAWN TEST: Level has a Pawn
    hasPawnTest(design, rowCount) {
        var testResult = false;
        for (var rowNum = 0; rowNum < rowCount; rowNum++) {
            var row = design[rowNum];
            var pawnLoc = row.indexOf("@"); // returns -1 if not found
            
            if (pawnLoc != -1) {
                testResult = true;
                if (game.logLevelTestResults) {console.log("9/10: Has Pawn:", testResult);}
                return;
            } 
        }
        alert("There is no PAWN!");
        if (game.logLevelTestResults) {console.log("9/10: Has Pawn:", testResult);}
        return;
        
    }

    // HAS GOAL TEST: Level has a Goal
    hasGoalTest(design, rowCount) {
        var testResult = false;
        for (var rowNum = 0; rowNum < rowCount; rowNum++) {
            var row = design[rowNum];
            var goalLoc = row.indexOf("!"); // returns -1 if not found
            
            if (goalLoc != -1) {
                testResult = true;
                if (game.logLevelTestResults) {console.log("10/10: Has Goal:", testResult);}
                return;
            } 
        }
        alert("There is no GOAL!");
        if (game.logLevelTestResults) {console.log("10/10: Has Goal:", testResult);}
        return;
    }

    // WORLD TRANSPORT TOKENS ALIGNMENT TEST: ENTER-EXIT TOKENS IN PAIRS, LEVELS EXIST
    worldTTAlignTest(design, rowCount, colors, allLevels) {
        var fromLevels = [];
        var toLevels = [];
        var tokenDetails = [];

        for (var rowNum = 0; rowNum < rowCount; rowNum++) {
            var row = design[rowNum];
                for (var charNum = 0; charNum < row.length; charNum++) {
                    var char = row[charNum];
                    if (char == '<') {
                        var fromLevel = parseInt(row.slice(charNum+1, charNum+3));
                        //console.log("from:", fromLevel);
                        fromLevels.push(fromLevel);

                    } else if (char == '>') {
                        var toLevel = parseInt(row.slice(charNum+1, charNum+3));
                        //console.log("to:", toLevel);
                        toLevels.push(toLevel);
                    }
                }
        }

        for (var n = 0; n < colors.length; n++) {
            var levelDetails = colors[n];
            var levelNum = levelDetails[0];
            tokenDetails.push(levelNum);
        }

        fromLevels.sort(function(a, b){return a-b}); 
        toLevels.sort(function(a, b){return a-b});
        tokenDetails.sort(function(a, b){return a-b});

        //console.log("Can enter from:", fromLevels);
        //console.log("Can exit to:", toLevels);
        //console.log("Token details for:", tokenDetails);

        var testResult = true;

        // every 'from' is for a level that exists & has a corresponding 'to' -- except the first one (lowest number)
        for (var i = 1; i < fromLevels.length; i++) {
            var levelNum = fromLevels[i];

            if (!allLevels.includes(levelNum)) {
                if (game.logLevelTestResults) {console.log("9/10: TT Align: Level", levelNum, "does not exist!");}
                //alert("Level " + String(levelNum) + " does not exist!");
                testResult = false;
            }
        
            if (!toLevels.includes(levelNum)) {
                if (game.logLevelTestResults) {console.log("9/10: TT Align: Missing exit to Level", levelNum);}
                //alert("Missing exit to Level " + String(levelNum));
                testResult = false;
            }
            


        }

        // every 'to' is for a level that exists & has a corresponding 'from' -- except the last one (highest number)
        for (var i = 0; i < toLevels.length - 1; i++) {
            var levelNum = toLevels[i];

            if (!allLevels.includes(levelNum)) {
                if (game.logLevelTestResults) {console.log("9/10: TT Align: Level", levelNum, "does not exist!");}
                //alert("Level " + String(levelNum) + " does not exist!");
                testResult = false;
            }

            if (!fromLevels.includes(levelNum)) {
                if (game.logLevelTestResults) {console.log("9/10: TT Align: Missing entrance from Level", levelNum);}
                testResult = false;
                //alert("Missing entrance from Level " + String(levelNum));
            }
        }

        if (testResult == true) {
            if (game.logLevelTestResults) {console.log("9/10: TT Align Test passed?", testResult);}
        }

        return [fromLevels, toLevels, tokenDetails];

    }

    // WORLD TRANSPORT TOKENS COLORS TEST: COLORS ARE DEFINED
    worldTTColorsTest(fromLevels, toLevels, colors) {

        
        var testResult;

        // all 'from' tokens have a pawn return color defined
        for (var i = 0; i < fromLevels.length; i++) {
            var levelNum = fromLevels[i];

            for (var j = 0; j < colors.length; j++) {
                
                var details = colors[j];
                if (details[0] == levelNum) {
                    var pawnColor = details[2];
                    if (!ALL_COLORS.includes(pawnColor)) {
                        if (game.logLevelTestResults) {console.log("10/10: TT Colors: Level", levelNum, "has no pawn return color!");}
                        //alert("Level " + String(levelNum) + " has no pawn return color!");
                        testResult = false;
                    }
                }
            }
    
        }

        // all 'to' tokens have a TT token color defined
        for (var i = 0; i < toLevels.length; i++) {
            var levelNum = toLevels[i];

            for (var j = 0; j < colors.length; j++) {
                var details = colors[i];
                if (details[0] == levelNum) {
                    var tokenColor = details[1];
                    if (!ALL_COLORS.includes(tokenColor)) {
                        if (game.logLevelTestResults) {console.log("10/10: TT Colors: Level", levelNum, "TT token has no color!");}
                        //alert("Level " + String(levelNum) + " TT token has no color!");
                        testResult = false;
                    }
                }
            }

        }

        if (testResult == true) {
            if (game.logLevelTestResults) {console.log("10/10: TT Colors Test passed?", testResult);}
        }

    }







    
    gridToPixels(gridXY) {
        return (game.level.cellSize / 2) + gridXY * game.level.cellSize;
    }

    gridToPixelsX(gridX) {
        return game.level.grid.Xmargin + game.gridToPixels(gridX);
    }

    gridToPixelsY(gridY) {
        return game.level.grid.Ymargin + game.gridToPixels(gridY);
    }
    
    designToGridX(designX) {
        return (designX - 1) / 3 / 2;
    }

    designToGridY(designY) {
        return designY / 2;
    }

    toggleGrid() {
        game.drawGrid = !this.drawGrid; 
        game.gameArea.updateGridButtonColors();
    }

    toggleHP() {
        game.drawHitPoints = !this.drawHitPoints;
        game.gameArea.updateHPButtonColors();
    }

    toggleInstructions() {
        game.gameArea.toggleInstructions();
        //game.gameArea.updateInstructionsButtonColors();
    }

    transportTokenCaught(token) {
        game.loaded = false;
        game.currentLevelNumber = token.levelNum;
        game.transporting = true;
        game.startOver();
    }

    restartButtonPressed() {
        game.loaded = false;
        game.startOver();
    }

    exitLevelButtonPressed() {
        game.exitLevelWithoutWin = true;
        game.currentLevelNumber = game.currentWorldNumber;
        game.loaded = false;
        game.startOver();
    }
    

    levelIncButtonPressed() {
        game.loaded = false;
        if (game.currentlyInWorld) {
            game.worldIncButtonPressed();
            game.startOver();
        } else {
            game.levelInc();
        }
        
    }

    levelDecButtonPressed() {
        game.loaded = false;
        if (game.currentlyInWorld) {
            
            game.worldDec();
            game.startOver();
        } else {
            if (game.currentLevelNumber > 1) {
                game.levelDec();
            } 
        }
        
    }

    levelInc() {
        var max = game.levelDesigns.length;
        if (game.currentLevelNumber < max) {
            game.currentLevelNumber += 1;
            game.startOver();
        } else {
            console.log("There are no more levels!")
        }
    }
    
    levelDec() {
        if (game.currentLevelNumber > 0) {
            game.currentLevelNumber -= 1
            game.startOver();
        } else {
            console.log("There are no negative levels!")
        }
    }

    startOver() {
        game.stopAnimation();
        game.start();
    }

    levelAnimation(mode) {

        if ((mode == "start") && (game.currentlyInWorld)) {
            if (!game.worldIntrosSeen.includes(game.level.number)) {
                game.worldIntrosSeen.push(game.level.number);
            }   
        } 

        var vOffset = 0;
        if (mode == "final") {
            vOffset = game.animationTimer;
        }
        
        var x = game.canvas.width * (1/8);
        var y = game.canvas.height / 4;
        var w = game.canvas.width * (6/8);
        var h = game.canvas.height / 2;


        var gradient = game.ctx.createLinearGradient(0, 0, w*1.5, 0);
        gradient.addColorStop("0", "rgb(255,192,192)");
        gradient.addColorStop("0.2", "rgb(255,192,128)");
        gradient.addColorStop("0.4", "rgb(255,255,128)");
        gradient.addColorStop("0.6", "rgb(192,238,192)");
        gradient.addColorStop("0.8", "rgb(128,221,255)");
        gradient.addColorStop("1.0", "rgb(192,175,192)");

        // draw background
        var rgb = game.LEVEL_INTRO_COLOR.rgb;
        var opacity = .9;
        var rgba = rgb.split(')')[0];       // the part before the ')'
        rgba += "," + opacity + ")"
        game.ctx.fillStyle = rgb;
        game.ctx.fillRect(0,0,game.width,game.height);

        // draw inner box
        var rgb = game.LEVEL_INTRO_COLOR.rgb;
        var opacity = .9;
        var rgba = rgb.split(')')[0];       // the part before the ')'
        rgba += "," + opacity + ")"
        game.ctx.fillStyle = rgb;
        game.ctx.fillRect(x,y,w,h);
        

        // set font color
        var fontColor = gradient;

        // top text
        var text1;
        var textCenterX = x + (w / 2);
        var textCenterY = y + h * .22 - vOffset;

        if (textCenterY < game.height + 50) {
            game.ctx.fillStyle = white.rgb;
            game.ctx.font = "28px Georgia";       
            game.ctx.textAlign = "center";
            if (mode == "start") {
                text1 = this.level.name + ":";
            } else if (mode == "win") {
                text1 = "You beat";
            } else if (mode == "final") {
                text1 = "";
            }
            game.ctx.fillText(text1, textCenterX, textCenterY);

            var lines;
            if (mode == "final") {
                if (CREDITS.length % 2 != 0) {
                    CREDITS.push('');
                }
                lines = CREDITS.length;
            } else {
                lines = 1;
            }
        }
        
        
        for (var n = 0; n < lines; n=n+2) {

            // middle text
            var text2;
            textCenterX = x + (w / 2);
            textCenterY = y + h * .575 + 75*n  - vOffset;

            if (textCenterY < game.height + 50) {
                game.ctx.fillStyle = fontColor;
                game.ctx.font = "42px Georgia";       
                game.ctx.textAlign = "center";
                if (mode == "start") {
                    text2 = this.level.title;
                } else if (mode == "win") {
                    text2 = this.previousLevel.name + "!";
                } else if (mode == "final") {
                    text2 = CREDITS[n];
                }
                game.ctx.fillText(text2, textCenterX, textCenterY);
            }
            
            
            if (mode == "final") {
                var text2point5 = CREDITS[n+1];
                if (typeof text2point5 != undefined) {
                    textCenterY = textCenterY + 50;
                    if (textCenterY < game.height + 50) {
                        game.ctx.fillStyle = white.rgb;
                        game.ctx.font = "20px Arial"; 
                        game.ctx.fillText(text2point5, textCenterX, textCenterY);
                    }
                } else {
                    alert("undefined");
                }
            }
            
        }
        

        // bottom text
        var text3;
        textCenterX = x + (w / 2);
        if (mode == "final") {
            var originalY = game.canvas.height + lines * 75  - vOffset; 
            textCenterY = Math.max(originalY, y + h*.5);
            
            text3 = "Bonus! Level+ and Level- buttons (top of screen). Don't forget to Save!"
        } else {
            textCenterY = y + (h * .88);
            text3 = "Click, touch screen, or press Space Bar or Enter to start."
        }
        game.ctx.fillStyle = white.rgb;
        game.ctx.font = "20px Arial"; 
        game.ctx.fillText(text3, textCenterX, textCenterY);

        

    }

    levelWinAnimation() {
        game.winAnimation = true;
    }

    gameWinAnimation() {
        game.finalAnimation = true;
    }

    setPawnColorText(text) {
        var textBox = document.getElementById("currentColorSpan");
        textBox.innerText = text;
    }

    questionMarks(currentValue) {
        var qms = currentValue;
        var prob = Math.random();
        if (prob < 0.1) {
            
            if (qms.length >= 6) {
                qms = "????";
            } else {
                var x = Math.random();
                if (x < .7) {
                    qms += "?";
                } else {
                    qms = "?";
                }
            }
        } 

        return qms; 
    }

    endStartAnimationK(e) {
        if (e.repeat) { 
            return 
        } else if ((e.key == " ") || (e.key == "Enter")) { 
            game.startAnimation = false;
            game.animationTimer = 0;
            game.removeStartAnimationListeners;
            //game.stopped = false;
        }
    }

    endStartAnimation(e) {
        if (e.repeat) { 
            return 
        } else { 
            game.startAnimation = false;
            game.animationTimer = 0;
            game.removeStartAnimationListeners;
            //game.stopped = false;
        }
    }

    removeStartAnimationListeners() {
        document.removeEventListener('keydown', game.endStartAnimationK);
        document.removeEventListener('touchstart', game.endStartAnimation);
        document.removeEventListener('mouseup', game.endStartAnimation);
    }

    endWinAnimationK(e) {
        if (e.repeat) { 
            return 
        } else if ((e.key == " ") || (e.key == "Enter")) { 
            game.winAnimation = false;
            game.finalAnimation = false;
            game.animationTimer = 0;
            game.removeWinAnimationListeners;
            //game.stopped = false;
        }
    }

    endWinAnimation(e) {
        if (e.repeat) { 
            return 
        } else { 
            game.winAnimation = false;
            game.finalAnimation = false;
            game.animationTimer = 0;
            game.removeWinAnimationListeners;
            //game.stopped = false;
        }
    }

    removeWinAnimationListeners() {
        document.removeEventListener('keydown', game.endWinAnimationK);
        document.removeEventListener('touchstart', game.endWinAnimation);
        document.removeEventListener('mouseup', game.endWinAnimation);
    }

    refresh() {
        

        if (game.startAnimation || (game.winAnimation || game.finalAnimation)) {
            //console.log(game.animationTimer);
            game.animationTimer++;

            var displayTime = game.TITLE_DISPLAY_TIME;
            
            if (!game.finalAnimation) {  // final animation - manual only
                if (game.animationTimer > displayTime) {
                        game.endStartAnimation({repeat: false});
                        game.endWinAnimation({repeat: false});
                }
            }

            if (game.winAnimation || game.finalAnimation) {
                document.addEventListener('keydown', game.endWinAnimationK);
                document.addEventListener('touchstart', game.endWinAnimation);
                document.addEventListener('mouseup', game.endWinAnimation);
                if (game.winAnimation) {
                    game.levelAnimation("win");
                } else {
                    game.levelAnimation("final");
                }
                
                

            } else if (game.startAnimation) {
                document.addEventListener('keydown', game.endStartAnimationK);
                document.addEventListener('touchstart', game.endStartAnimation);
                document.addEventListener('mouseup', game.endStartAnimation);
                game.levelAnimation("start");
                
            }

            game.repeatingFunction = requestAnimationFrame(game.refresh);

        } else if (!game.stopped) {
            
            

            game.placeLevelText();

            game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
            game.pawn.speedX = 0;
            game.pawn.speedY = 0;   

            if (!game.pawn.paralyzed) {

                if ((game.keys && game.keys[37]) 
                    || (game.touchRLTB[1])) { 
                        game.pawn.moveleft(); 
                    } 
                if ((game.keys && game.keys[39])
                    || (game.touchRLTB[0])) { 
                        game.pawn.moveright(); 
                    }
                if ((game.keys && game.keys[38]) 
                    || (game.touchRLTB[2])) { 
                        game.pawn.moveup(); 
                    }
                if ((game.keys && game.keys[40])
                    || (game.touchRLTB[3])) { 
                        game.pawn.movedown(); 
                    }
                if (!game.currentlyInWorld) {
                    if (game.keys && game.keys[82]) {             
                        game.restartOnKeyRelease = true;                
                    } else {                                      
                        if (game.restartOnKeyRelease) {                
                            game.restartOnKeyRelease = false;                               
                            game.restartButtonPressed(); 
                            return;                    
                        } 
                    }
                }
            
            }
            
            if (game.drawGrid == true) {
                game.level.grid.draw();
            }

            game.level.draw();  // walls, doors, tokens, and coins

            game.pawn.newPos();
            game.pawn.draw();
            
            if (game.transporting) { 
                game.transporting = false;
                return;
            }

            if (game.level.pawnChangedColorYet == false) {
                if (game.currentlyInWorld && game.suppressFlicker) {
                    // do not flicker
                } else {
                    game.pawn.flicker();
                }
            }
            
            if (!game.currentlyInWorld) {
                game.goal.animate();
            }


            if (game.drawHitPoints == true) {
                
                game.level.drawHitPoints();
            }


            if (game.showingBlendAnimation) {
                game.updateBlendAnimation();
                game.drawBlendAnimation();
                
            }
        
            game.repeatingFunction = requestAnimationFrame(game.refresh);
        }

    }

    stopAnimation() {
        cancelAnimationFrame(game.repeatingFunction);
        game.blendAnimationObjects = [null, null, null];
        game.stopped = true;
    }

    createKeyboardListeners() {
        window.addEventListener('keydown', function (e) {
            game.keys = (game.keys || []);
            game.keys[e.keyCode] = (e.type == "keydown");
            var blockNormalFunctions = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
            if (blockNormalFunctions.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
        })
        window.addEventListener('keyup', function (e) {
            game.keys[e.keyCode] = (e.type == "keydown");
        })
        document.addEventListener('touchstart', game.touchStart);
        document.addEventListener('touchend', game.touchEnd);
        document.addEventListener('touchcancel', game.touchEnd);
        document.oncontextmenu = function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
    }

    getTouchCharacteristics(touchObject, direction) {
        // some website said that because some browsers like 
        // mobile Safari re-use touch objects between events, it is better
        // for some reason to copy the properties instead of referencing the object
        // itself ... I am also using this function to add my own new characteristic: direction
        var identifier = touchObject.identifier
        var pageX = touchObject.pageX
        var pageY = touchObject.pageY
        return {identifier, pageX, pageY, direction}
    }

    getTouchButtonCoordinates(id) {
        var element = document.getElementById(id);
        var rect = element.getBoundingClientRect();
        //console.log(id, "X:", rect.left, "-", rect.right,
        //            ", Y:", rect.top, "-", rect.bottom);

        return rect;
    }

    setupTouchButtons() {
        game.touchButtons = []; // empty out the old ones
        var elementIDs = ["leftArrow", "upArrow", "downArrow", "rightArrow"];

        for (var i = 0; i < elementIDs.length; i++) {
            var id = elementIDs[i];
            var rect = game.getTouchButtonCoordinates(id);
            game.touchButtons.push({id: id, rect: rect, });//touching: false});
        }
    }

    touchStart(e) {
        game.setupTouchButtons(); // CHANGE - don't do this every time a touch is detected
                                    // but only when window is resized or scrolled or something

        
        //if (e.touches) {
            var touches = e.changedTouches
            for (var i = 0; i < touches.length; i++) { 
                // would only ever be more than one (& only ever index > 0) if truly simultaneous touches?
                
                var touch = touches[i];
                var touchX = touch.pageX;
                var touchY = touch.pageY;
                if (game.logTouches) {console.log("Touched:", touchX, ",", touchY);}
                //console.log(game.touchButtons);

                for (var i = 0; i < game.touchButtons.length; i++) {
                    var arrowObject = game.touchButtons[i];
                    var arrow = arrowObject.rect;
                    var hpad = game.TOUCHBUTTONPADDING;
                    var vpad = hpad * 2;
                    var direction = "no direction";
                    //console.log(arrow);
                    if ((touchX >= arrow.left - hpad) && (touchX <= arrow.right + hpad)) {
                        if ((touchY >= arrow.top - vpad) && (touchY <= arrow.bottom + vpad)) {
                            //arrowObject.touching = true;
                            //console.log("Touching:", arrowObject.id);
                            
                            //e.preventDefault(); // so you're not selecting text/images/etc.
                            //Note: preventDefault doesn't work due to passive listener something something

                            // id's are leftArrow, upArrow, downArrow, rightArrow
                            if (arrowObject.id.includes("right")) {
                                game.touchRLTB[0] = true; 
                                direction = "right";
                                
                            }

                            else if (arrowObject.id.includes("left")) {
                                game.touchRLTB[1] = true; 
                                direction = "left";
                                
                            }

                            else if (arrowObject.id.includes("up")) {
                                game.touchRLTB[2] = true; 
                                direction = "up";
                                
                            }

                            else if (arrowObject.id.includes("down")) {
                                game.touchRLTB[3] = true; 
                                direction = "down";
                                
                            }

                            if (game.logTouches) {console.log("start touch:", direction)}

                            ongoingTouches.push(game.getTouchCharacteristics(touch, direction));

                        }
                    }
                }    
                
            }
        //}
        
    }
    
    
    touchEnd(e) {

        var touches = e.changedTouches;
        
        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            //console.log("touch ID:", touch.identifier);
            var idxSet = ongoingTouchIndexById(touch.identifier);

            //console.log("IDX SET:", idxSet);

            for (var j = idxSet.length; j>=0; j--) {
                var idx = idxSet[j];
                //console.log("IDX:", idx);

                if (idx >= 0) {
                    if (ongoingTouches[idx].direction == "right") {
                        game.touchRLTB[0] = false;
                        if (game.logTouches) {console.log("end touch: right")}
                    } else if (ongoingTouches[idx].direction == "left") {
                        game.touchRLTB[1] = false;
                        if (game.logTouches) {console.log("end touch: left")}
                    } else if (ongoingTouches[idx].direction == "up") {
                        game.touchRLTB[2] = false;
                        if (game.logTouches) {console.log("end touch: up")}
                    } else if (ongoingTouches[idx].direction == "down") {
                        game.touchRLTB[3] = false;
                        if (game.logTouches) {console.log("end touch: down");}
                    } 
                    
                    //console.log("ongoingTouches:", ongoingTouches.length);
                    //console.log(JSON.stringify(ongoingTouches));
                    //console.log("Removing:", ongoingTouches[idx]);
                    //console.log("from index:", idx);
                    //ongoingTouches.splice(idx, 1);
                    //console.log("OngoingTouches:", ongoingTouches.length);
                    //console.log(JSON.stringify(ongoingTouches));
                }
            }
            

        }

        

    }
    
    touchAreas() {
        var wid = window.innerWidth;
            //console.log("Inner Width:", wid);
        //var hi = window.innerHeight;
        var canX = game.canvas.width;
            //console.log("Canvas X: ", canX);
        var canY = game.canvas.height;
        var xMargin = (wid - canX) / 2;
            //console.log("X-Margin: ", xMargin);
        
        var boundRight = xMargin + (canX * 0.8);
        var boundLeft = xMargin + (canX * 0.2);
        var boundTop = 100;
        var boundBottom = (canY * 0.8);
    
        return [boundRight, boundLeft, boundTop, boundBottom];
    }

    goalReached() { 
        if (this.level.coins.length == 0) {
            
            if (!game.currentlyInWorld) {
                this.addToLevelsBeaten();
            }
            
        

            this.previousLevel = this.level;
            this.cameFromLevel = this.currentLevelNumber;

             

            if (this.cameFromLevel % 10 != 0) {                     // assumes always 10 levels per world
                this.currentLevelNumber = this.currentWorldNumber;      // go back to same world
            } else {
                this.worldInc();                          // go to next world
            }
            this.exitLevelWithoutWin = false;

            
            if (this.cameFromLevel == game.levelDesigns.length) {  // last level
                
                this.gameWinAnimation();
                this.showLevelConsole = true;
                this.updateLevDevConsoles();
            } else {
                this.levelWinAnimation();
            }

            game.startOver();
            
        } else {
            //console.log("Have not yet collected all coins");
        }
    }

    addToLevelsBeaten() {
        this.levelsBeaten[this.currentLevelNumber - 1] = true; 
    }

    updateLevelsBeaten() {
        for (var i = 0; i < this.level.transportTokens.length; i++) {
            var token = this.level.transportTokens[i];
            if (game.levelsBeaten[token.levelNum - 1]) {
                token.levelBeaten = true;
            }
        }
    }

    nextLetter(letter) {
        return String.fromCharCode(letter.charCodeAt(0) + 1);
    }

    prevLetter(letter) {
        return String.fromCharCode(letter.charCodeAt(0) - 1);
    }

    worldIncButtonPressed() {
        
        var lastWorldNumber = game.worldDesigns[game.worldDesigns.length-1].number; // last world in game
        
        if (this.currentLevelNumber != lastWorldNumber) {        
            var worldNum = game.level.numeric + 1; // the current world's number (world 1 is 1)
            
            this.levelsBeaten = [];
            for (var i = 0; i < worldNum*10; i++) {
                this.levelsBeaten.push(true)
            }
            
            game.cameFromLevel = game.findLastLevelBeaten();    
            
               
            this.worldInc();
            
            

        } else {
            console.log("There are no more worlds!")
        }
    }

    worldInc() {
        var nextWorld = this.nextLetter(this.currentWorldNumber);
        this.currentWorldNumber = nextWorld;
        this.currentLevelNumber = this.currentWorldNumber;
        this.suppressFlicker = false;
    }

    worldDec() {
        if (this.currentLevelNumber != "A") {
            var worldNum = game.level.numeric - 1; // two less than the current world's number (world 2 is 0)
            this.levelsBeaten = [];
            for (var i = 0; i < worldNum*10; i++) {
                this.levelsBeaten.push(true)
            }
            game.cameFromLevel = game.findLastLevelBeaten();
            var prevWorld = this.prevLetter(this.currentWorldNumber);
            this.currentWorldNumber = prevWorld;
            this.currentLevelNumber = this.currentWorldNumber;
            this.suppressFlicker = false;
        } else {
            console.log("There are no previous worlds!")
        }
        
    }

    handleUndefinedColors(token, newRGB) {
        if (token.colorObject == null) {
            token.colorObject = new Color("%", "undefined", newRGB, []);
            token.colorObject.rgb = newRGB;
        }
    }

    beginBlendAnimation(tokenCaught) {
        game.showingBlendAnimation = true; 

        // object dimensions: square, full screen height by full screen height
        var w = game.height; 
        var h = game.height;

        /////// Animation #1 (caught color)
        var xStart1 = game.width; // off screen to right
        var yStart = 0;               

        game.blendAnimationObjects[1] = {token: tokenCaught, 
                                        //radius: radius, 
                                        //lineWidth: lineWidth,
                                        x: xStart1,
                                        y: yStart,
                                        w: w,
                                        h: h,
                                        moveToward: "left",
                                        visible: true,
                                        drawText: true}; 
        
        
        if (game.level.pawnChangedColorYet) {

            var xStart0 = 0 - w; // off screen to left

            var token = Object.assign({}, game.pawn); // if just use pawn as token, when pawn color changes, animation color changes
            this.handleUndefinedColors(token, token.color);

            /////// Animation #0 (pawn original color)
            game.blendAnimationObjects[0] = {token: token, 
                //radius: radius, 
                //lineWidth: lineWidth,
                x: xStart0,
                y: yStart,
                w: w,
                h: h,
                moveToward: "right",
                visible: true,
                drawText: true};            


            /////// Animation #2 (blend of Animations #0 and #1)
            var newColor = blend(game.pawn.color, tokenCaught.color);
            var newToken = new Object();
            newToken.colorObject = RGBtoColorObj(newColor);

            game.handleUndefinedColors(newToken, newColor);

            game.blendAnimationObjects[2] = {token: newToken, 
                //radius: radius, 
                //lineWidth: lineWidth,
                x: 0,      // even though the object is created immediately, it won't be drawn until anything overlaps
                y: yStart,      // so the x & w here don't matter & will be immediately overwritten up update function
                w: 0,
                h: h,
                moveToward: "auto", // dimensions & location will be dynamically calculated
                visible: false,
                drawText: false}
            //console.log(game.blendAnimationObjects[2]);

        }
        
        game.drawBlendAnimation(); 
                                                    
        
    }

    findOverlappingRegion(obj0, obj1) {     // horizontally moving rectangles of idential y coords only
        var xOverlappingL = null;
        var xOverlappingR = null;     // returns null for both if not overlapping

        if ((obj0.moveToward != "right") || (obj1.moveToward != "left")) {
            //console.log("BlendAnimation objects are not moving to cross each other");
        }
        if (obj0.x + obj0.w >= obj1.x) {
            xOverlappingL = obj1.x;
            xOverlappingR = obj0.x + obj0.w;
        }

        var xRange = [xOverlappingL, xOverlappingR];
        return xRange;
    }


    drawBlendAnimation() {
        //console.log(game.blendAnimationObjects[2]);
        var opacity = game.BLENDANIMATIONOPACITY;
        

        for (var i = 0; i < game.blendAnimationObjects.length; i++) {
            var obj = game.blendAnimationObjects[i];
            
            
            if (obj != null) {
                var token = obj.token;
                var x = obj.x;
                var y = obj.y;
                var w = obj.w;
                var h = obj.h;

                if (obj.visible) {
                    // set color for rectangle
                    if (i == 2) {               // THE BLENDED-COLOR OBJECT 
                        opacity = 1;
                    }
                    var caughtColorObject = token.colorObject;
                    var colorName = caughtColorObject.name;
                    var rgb = caughtColorObject.rgb;
                    var rgba = rgb.split(')')[0];       // the part before the ')'
                    rgba += "," + opacity + ")"
                }

                // draw rectangle
                game.ctx.fillStyle = rgba;
                game.ctx.fillRect(x,y,w,h);

                if (obj.drawText) {
                    //console.log("Drawing Text for object #", i);
                    // set location & color for text
                    var textCenterX = x + (w / 2);
                    var textCenterY = y + (h * 0.2);
                    var fontColor;

                    var darkFlag = caughtColorObject.checkBgColor();
                    if (darkFlag) {
                        fontColor = "white";
                    } else {
                        fontColor = "black";
                    }
                

                    // draw text
                    game.ctx.fillStyle = fontColor;
                    game.ctx.font = "30px Arial";      
                    game.ctx.textAlign = "center";
                    game.ctx.fillText(colorName, textCenterX, textCenterY);
                }
            }
        }
        
        

        
    }

    updateBlendAnimation() {
        
        // update AnimationObject #2 (the blended-color object)
        if ((game.blendAnimationObjects[0] != null) && (game.blendAnimationObjects[1] != null)) {
            
            var xOverlappingRange = game.findOverlappingRegion(game.blendAnimationObjects[0], game.blendAnimationObjects[1]);
            var x2 = xOverlappingRange[0];
            var w2 = xOverlappingRange[1] - xOverlappingRange[0];

            if (x2 != null) {
                game.blendAnimationObjects[0].drawText = false;
                game.blendAnimationObjects[1].drawText = false;
                game.blendAnimationObjects[2].visible = true;
            }

            // hide non-blended objects after fully overlapping
            if (w2 >= game.blendAnimationObjects[0].w) {
                game.blendAnimationObjects[0].moveToward = "shrink";
                game.blendAnimationObjects[1].moveToward = "shrink";
            }
        }

        if (game.blendAnimationObjects[2] != null) {
            game.blendAnimationObjects[2].x = x2;
            game.blendAnimationObjects[2].w = w2;

            var textWidth = game.ctx.measureText(game.blendAnimationObjects[2].token.name).width;
            
            if (w2 > textWidth) {                              // adjust to visual size of color name??
                game.blendAnimationObjects[2].drawText = true;
            } else {
                game.blendAnimationObjects[2].drawText = false;

                
                
            }
        }


        // perform moveToward (left, right, shrink, or auto)
        for (var i = 0; i < game.blendAnimationObjects.length; i++) {
            var obj = game.blendAnimationObjects[i];
            if (obj != null) {
                if (obj.moveToward == "left") {
                    if (obj.x + obj.w >= 0) {
                        obj.x -= game.BLENDANIMATIONSPEED;
                    } else {
                        game.endBlendAnimation(i);
                    }
                } else if (obj.moveToward == "right") {
                    if (obj.x > game.width) {
                        game.endBlendAnimation(i);
                    } else {
                        obj.x += game.BLENDANIMATIONSPEED;
                    }
                } else if (obj.moveToward == "shrink") {        // left/right doesn't matter, they're both centered now
                    if (obj.w <= 0) {
                        game.endBlendAnimation(i);
                    } else {
                        obj.x += game.BLENDANIMATIONSPEED;
                        obj.w -= game.BLENDANIMATIONSPEED * 2;
                        //obj.h -= game.BLENDANIMATIONSPEED;
                    }
                } else if (obj.moveToward == "auto") { 
                    if ((obj.w <= 0) && (obj.visible == true)) {
                        game.endBlendAnimation(i);          
                    }
                }
            }
        }
    }

    endBlendAnimation(i) {
        //console.log("Removing object", i);
        game.blendAnimationObjects[i] = null;

        if (game.blendAnimationObjects == [null, null, null]) {
            game.showingBlendAnimation = false;
        }
    }


    saveGame() {

        if (typeof(Storage) !== "undefined") {
            var userName = window.prompt("Input a username:\n");
            var successMessage = "Game saved for username '" + userName + "', having beaten Level " + String(this.levelsBeaten.length) + ".";

            if (userName == null || userName == "") {               // no name given
                window.alert("You didn't enter a name. Nothing saved.\n");
            } else { 
                if (localStorage.getItem(userName) === null) {      
                    // new userName; save data
                    localStorage.setItem(userName, this.levelsBeaten);
                    window.alert(successMessage);
                } else {
                    // name already exists; ask to overwrite
                    var overWrite = window.confirm("That name already exists. Do you want to overwrite?\n");
                    if (overWrite) {
                        // overwrite; save data
                        localStorage.setItem(userName, this.levelsBeaten);
                        window.alert(successMessage);
                    } else {
                        window.alert("Nothing saved. Please try again with a different name.\n");
                    }  
                }
            } 

            
        } else {
            window.alert("Sorry, your browser does not support Web Storage.");
        }

    }

    findLastLevelBeaten() {
        if (this.levelsBeaten[0] == false) {                        // [false, ...]
            
            return 0;
            
        }

        for (var i = 0; i < this.levelsBeaten.length; i++) {        // [true, true, true, false, ...]
            if (this.levelsBeaten[i] == true) {
                continue;
            } else {
                
                return i+1;
            } 
        }

        
        return (this.levelsBeaten.length);                      // [true, true, true, true, true, true, true, true, true, true]
    }


    getStartingWorldNumber() {
        var lastLevelBeaten = this.findLastLevelBeaten();
        var worldNumber = Math.floor(lastLevelBeaten / 10);      // assumes always 10 levels per world

        return this.worldDesigns[worldNumber].number;
        
    }

}


///////////////////////////  B  E  G  I  N         E  X  E  C  U  T  I  O  N  ////////////////////////////

var game = new Game();


var ongoingTouches = [];


function ongoingTouchIndexById(idToFind) {
    var returnSet = []; // each touch should have a unique id but if you touch two buttons at once they have the same id
    for (var i = 0; i < ongoingTouches.length; i++) {
        var id = ongoingTouches[i].identifier;
        //console.log("id:",id,"idToFind:",idToFind);
        if (id == idToFind) {
            returnSet.push(i);
        }
    }

    if (returnSet.length == 0) {
        returnSet.push(-1); // not found
    }

    //console.log("Ongoing Touch Index By ID:", returnSet);

    return returnSet;  
}



function startGame(levelsBeaten) {

    window.game = new Game();           // "window." accesses the global variable 

    // load saved game data if any
    window.game.levelsBeaten = levelsBeaten;
    window.game.cameFromLevel = game.findLastLevelBeaten();
    
    //console.log("Came From Level:", this.cameFromLevel)

    window.game.currentLevelNumber = game.getStartingWorldNumber(); 
    window.game.currentWorldNumber = game.getStartingWorldNumber();
    

    // hide intro screen
    var area = document.getElementById("canvasAlt");
    area.style.display = "none";

    // show canvas border
    var can = document.getElementById("canvas");
    //can.style.border = "4px solid black";
    can.style.display = "block";

    // adjust arena background color
    var a = document.getElementById("arena");
    a.style.background = "rgba(200,200,200,0.4)";

    // show controls
    var controls = document.getElementById("controls");
    controls.style.display = "grid";

    // show instructions
    var inst = document.getElementById("instructions");
    inst.style.display = "block";


    if (window.game.cameFromLevel == window.game.levelDesigns.length) { // all levels beaten
        window.game.showLevelConsole = true;
        window.game.updateLevDevConsoles();
        window.game.finalAnimation = true;
    }



    game.start();   
}


function getUserDesiredLevel() {
    var num = window.prompt("Enter the level number:");

    if (num == null) {
        return "Cancel";
    } 

    var title = window.prompt("Enter the level title:");

    if (title == null) {
        return "Cancel";
    }

    for (var i = 0; i < game.levelDesigns.length; i++) {
        var level = game.levelDesigns[i];
        //console.log(level.number, level.title.toLowerCase().trim());
        if (level.number == parseInt(num)) {
            if (level.title.toLowerCase().trim() == title.toLowerCase().trim()) {
                return level.number;
            }
        }
    }

    return null;
}

function goToLevelButtonPressed() {
    
    var levelNum = getUserDesiredLevel(); 

    if (levelNum === "Cancel") {
        // do nothing
    }
    else if (levelNum === null) {
        window.alert("Sorry. No level with that number & title found.");
    } else {
        var levelsBeaten = [];
        for (var i = 0; i < levelNum - 1; i++) {
            levelsBeaten.push(true);
        }

        //console.log(levelsBeaten);

        startGame(levelsBeaten);
    }

    
}

function creditsButtonPressed() {
    game.stopAnimation();
    var levelsBeaten = [];
    for (var i = 1; i <= ALL_LEVEL_DESIGNS.length; i++) {
        levelsBeaten.push(true);
    }
    startGame(levelsBeaten);

}


function loadGameButtonPressed() {
    if (typeof(Storage) !== "undefined") {
        var menu = document.getElementById("savedGames");
        menu.style.backgroundColor = "rgba(85,85,85,.8)";

        if (localStorage.length == 0) {
            window.alert("There are no saved games.")
        }
        
        if (menu.innerHTML != '') {         // toggle visibilty of menu
            menu.innerHTML = '';

        } else {

            for (var a in {...localStorage}) {
                var levelsBeaten = localStorage[a];

                var c = randomColorObj();
                var rgb = c.rgb;
                var fontColor;

                var darkFlag = c.checkBgColor();
                if (darkFlag) {
                    fontColor = "white";
                } else {
                    fontColor = "black";
                }
                
                menu.innerHTML += '<button class="savedLevelButton" onclick="startGame([' + levelsBeaten + '])" style="background-color:' + rgb + '; color:' + fontColor + '">' + a + '</button>';
                
                
                
            }
        }
        
    } else {
        window.alert("Sorry, your browser does not support Web Storage.");
    }
          
}

function deleteSavedGameButtonPressed() {

    if (typeof(Storage) !== "undefined") {
        var menu = document.getElementById("savedGames");
        menu.style.backgroundColor = "rgba(200,50,50,.8)";

        if (localStorage.length == 0) {
            window.alert("There are no saved games.")
        }
        
        if (menu.innerHTML != '') {         // toggle visibilty of menu
            menu.innerHTML = '';

        } else {

            for (var a in {...localStorage}) {
                var c = pink;
                var rgb = c.rgb;
                var fontColor;

                var darkFlag = c.checkBgColor();
                if (darkFlag) {
                    fontColor = "white";
                } else {
                    fontColor = "black";
                }

                
                menu.innerHTML += '<button class="savedLevelButton" onclick="deleteSavedGame(\'' + a + '\')" style="background-color:' + rgb + '; color:' + fontColor + '">' + a + '</button>';
                
                //console.log(a, ' = ', localStorage[a]);

            }
        }
        
    } else {
        window.alert("Sorry, your browser does not support Web Storage.");
    }
}


function deleteSavedGame(userName) {

    
    var confirm = window.confirm("Are you sure you want to delete " + userName + "'s game?");
    if (confirm) {
        localStorage.removeItem(userName);
        window.alert("Deleted " + userName + "'s game.");
    } else {
        window.alert("Nothing was deleted.");
    }
    
    deleteSavedGameButtonPressed(); // to toggle the menu off
    deleteSavedGameButtonPressed(); // to toggle the menu back on
}





function introScreen() {
    // show intro screen
    var area = document.getElementById("canvasAlt");
    area.style.display = "block";

    // hide canvas border
    var can = document.getElementById("canvas");
    //can.style.border = "0px solid black";
    can.style.display = "none";

    // adjust arena background color
    var a = document.getElementById("arena");
    a.style.backgroundImage = "linear-gradient(to bottom right, rgba(255,0,0,.3), rgba(255,128,0,.3), rgba(255,255,0,.3), rgba(0,128,0,.3), rgba(0,0,255,.3), rgba(128,0,0,.3))";

    // hide controls
    var controls = document.getElementById("controls");
    controls.style.display = "none";

    // hide instructions
    var inst = document.getElementById("instructions");
    inst.style.display = "none";

    // hide saved games menu
    var menu = document.getElementById("savedGames");
    menu.innerHTML = '';

}

function exitGameButtonPressed() {
    game.stopAnimation();
    game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    introScreen();
}


function disallowSpaceBarAndEnterButtonClicks() {
    document.querySelectorAll("button").forEach( function(item) {
        item.addEventListener('focus', function() {
            this.blur();
        })
    })
}



const CREDITS = [
    '',
    '',
    'YOU WIN!',
    '',
    'GAME OVER',
    '',
    '',
    'Credits & Bonus Tip:',
    '',
    '',
    'Concept',
    'Jeffrey Stafford',
    '',
    '',
    'Color definitions',
    'Jeffrey Stafford',
    '',
    '',
    'Level designs',
    'Jeffrey Stafford',
    '',
    '',
    'Debugging',
    'Jeffrey Stafford',
    '',
    '',
    'Level design mini-language',
    'Jeffrey Stafford',
    '',
    '',
    'Motion controls',
    'Jeffrey Stafford',
    '',
    '',
    'More debugging',
    'Jeffrey Stafford',
    '',
    '',
    'Color blending',
    'Jeffrey Stafford',
    '',
    '',
    'Collision detection',
    'Jeffrey Stafford',
    '',
    '',
    'Even more debugging',
    'Jeffrey Stafford',
    '',
    '',
    'Star Coin sprite',
    'DanSevenstar.xyz, opengameart.org/content/coin-animation',
    '',
    'Creative Commons CC-BY 4.0, creativecommons.org/licenses/by/4.0/',
    '',
    '',
    'Rainbow Goal sprite',
    'Jeffrey Stafford',
    '',
    '',
    'Webpage design',
    'Jeffrey Stafford',
    '',
    '',
    '*******************************',
];







