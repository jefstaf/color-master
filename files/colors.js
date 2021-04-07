class Color {
  constructor(abbreviation, name, rgbCode, formula) {
    this.abbr = abbreviation;
    this.name = name;
    this.rgb = rgbCode;
    this.formula = formula;
    this.level = this.calculateLevel();
    this.alphaDescription = this.getADescription();
    this.levelDescription = this.getLDescription();
    
    // for development only
    this.checkFormula();
  }

  // for development only - to check when creating new color definitions

  checkFormula() {
    var result;
    if (this.formula.length == 0) { // level one colors
      result = true;
    } else {
      var c1 = this.formula[0];
      var c2 = this.formula[1];
      var blendedRGB = c1.RGBblend(c2);
      if (blendedRGB == this.rgb) {
        result = true;
      } else {
        result = false;
        console.log(this.name + " formula is accurate? " + result);
      }
    }
    
  }

  calculateLevel() {
    if (this.formula.length == 0) { // class one colors, formerly called "level one colors"
      return 1; 
    } else {
      var c1 = this.formula[0];
      var c2 = this.formula[1];
      return c1.level + c2.level;
    }

  }

  RGB_Array() {
    var [a,b,c] = this.rgb.split(',');
    //console.log("a, b, c : ", a, b, c);
    var r1 = parseInt(a.slice(4));
    var g1 = parseInt(b);
    var b1 = parseInt(c);
    //console.log(this.rgb, ": ", r1, g1, b1);
    return [r1, g1, b1];
  }
  
  RGB_CSV() {
    var [a, b, c] = this.rgb.split(',');
    var r1 = parseInt(a.slice(4));
    var g1 = parseInt(b);
    var b1 = parseInt(c);
    return r1 + ", " + g1 + ", " + b1;
  }

  formulaToHTML() {
    if (this.formula.length == 0) {
      return "base(1)";
    } else {
      var a = this.formula[0];
      var b = this.formula[1];
      return a.abbr + "(" + a.level + ")+" + b.abbr + "(" + b.level + ")";
    }
  }
    
  gridHTML() {     
    // produces HTML text to show in color grid

    var htmlToInsert = "";
      
    htmlToInsert += this.abbr;
    htmlToInsert += "<br />";
    htmlToInsert += this.name;
    htmlToInsert += "<br />";
    htmlToInsert += this.RGB_CSV();
    htmlToInsert += "<br />";
    htmlToInsert += this.formulaToHTML();

    return htmlToInsert;
  }


  // checks whether this color is a "dark" background color (requiring white text)
  checkBgColor() {
    var [r, g, b] = this.RGB_Array();

    var luminance = (0.299*r + 0.587*g + 0.114*b)/255;

    if (luminance < 0.53) {             // dark colors - use white font
        return true;
    } else {                            // bright colors - use black font
        return false;
    }


  }

  getADescription() {
    var array = [this.abbr, this.name, "Class " + this.level, this.RGB_CSV(), this.formulaToHTML()];
    return array.join(" : ")
  }

  getLDescription() {
    var array = ["Class " + this.level, this.abbr, this.name, this.RGB_CSV(), this.formulaToHTML()];
    return array.join(" : ")
  }
  
  RGBblend(new_color) {
    let c1 = this.RGB_Array();
    let c2 = new_color.RGB_Array();

    var newR = Math.round((c1[0] + c2[0]) / 2);
    var newG = Math.round((c1[1] + c2[1]) / 2);
    var newB = Math.round((c1[2] + c2[2]) / 2);

    var newString = arrayToRGB([newR, newG, newB]);
    //console.log("blended color: ", newString);

    return newString;
  }

}




// COLOR DEFINITIONS
const ALL_COLORS = [];

// USED IN GRID - NOT ACTUALLY A COLOR, JUST USED IN COLOR GRID
const gridSeparator = new Color('/', 'or', 'rgb(1,1,1)',[]);
ALL_COLORS.push(gridSeparator);
const halfIndent = new Color('-', 'indent', 'rgb(1,1,1)',[]);
ALL_COLORS.push(halfIndent);
const nonExistent = new Color('~', 'undefined', 'rgb(100,100,100)',[]);
ALL_COLORS.push(nonExistent);
// new Color ('#') abbreviation '#' used in level grid for first cell w/ level #

// COLORLESS COLOR OBJECT (PAWN STARTING COLOR)
const colorless = new Color('*', 'colorless', 'rgb(150,150,150)', []);
ALL_COLORS.push(colorless);


// Class 1 (primary) colors
const black = new Color('9', 'black', 'rgb(0,0,0)', []);
ALL_COLORS.push(black);
const white = new Color('0', 'white', 'rgb(255,255,255)', []);
ALL_COLORS.push(white); 
const red = new Color('r', 'red', 'rgb(255,0,0)', []);
ALL_COLORS.push(red);
const yellow = new Color('y', 'yellow', 'rgb(255,255,0)', []);
ALL_COLORS.push(yellow);
const blue = new Color('b', 'blue', 'rgb(0,187,255)', []);
ALL_COLORS.push(blue);
const gray33 = new Color('3', 'gray (33%)', 'rgb(170,170,170)', []);
ALL_COLORS.push(gray33);
const gray67 = new Color('6', 'gray (67%)', 'rgb(85,85,85)', []);
ALL_COLORS.push(gray67);
const phosphor = new Color('4', 'phosphor', 'rgb(0,255,0)', []);
ALL_COLORS.push(phosphor);


// Class 2 (secondary) colors
const gray50 = new Color('5', 'gray (50%)', 'rgb(128,128,128)', [white,black]);
ALL_COLORS.push(gray50);
const maroon = new Color('m', 'maroon', 'rgb(128,0,0)',  [red,black]);
ALL_COLORS.push(maroon);
const olive = new Color('O', 'olive', 'rgb(128,128,0)', [yellow,black]);
ALL_COLORS.push(olive);
const navy = new Color('n', 'navy', 'rgb(0,94,128)', [blue,black]);
ALL_COLORS.push(navy);
const orange = new Color('o', 'orange', 'rgb(255,128,0)', [red,yellow]);
ALL_COLORS.push(orange);
const green = new Color('g', 'green', 'rgb(128,221,128)', [yellow,blue]);
ALL_COLORS.push(green);
const violet= new Color('v', 'violet', 'rgb(128,94,128)', [red,blue]);
ALL_COLORS.push(violet);
const salmon = new Color('s', 'salmon', 'rgb(255,128,128)', [red,white]);
ALL_COLORS.push(salmon);
const celeste = new Color('c', 'celeste', 'rgb(128,221,255)', [blue,white]);
ALL_COLORS.push(celeste);
const xanthic = new Color('x', 'xanthic', 'rgb(255,255,128)', [yellow,white]);
ALL_COLORS.push(xanthic);

// Class 3 (tertiary) colors
const gray25 = new Color('2', 'gray (25%)', 'rgb(192,192,192)', [gray50,white]);
ALL_COLORS.push(gray25);
const gray75 = new Color('7', 'gray (75%)', 'rgb(64,64,64)', [gray50,black]);
ALL_COLORS.push(gray75);
const brown = new Color('B', 'brown', 'rgb(192,111,64)', [green,red]);
ALL_COLORS.push(brown);
const cherry = new Color('j', 'cherry', 'rgb(192,47,64)', [violet,red]);
ALL_COLORS.push(cherry);
const tangerine = new Color('J', 'tangerine', 'rgb(255,192,0)', [orange,yellow]);
ALL_COLORS.push(tangerine);
const sage = new Color('S', 'sage', 'rgb(128,158,128)', [orange,blue]);
ALL_COLORS.push(sage);
const prussian = new Color('P', 'Prussian blue', 'rgb(64,141,192)', [violet,blue]);
ALL_COLORS.push(prussian);
const tan = new Color('t', 'tan', 'rgb(192,175,64)', [violet,yellow]);
ALL_COLORS.push(tan);
const lime = new Color('L', 'lime', 'rgb(192,238,64)', [green,yellow]);
ALL_COLORS.push(lime);
const turquoise = new Color('q', 'turquoise', 'rgb(64,204,192)', [green,blue]);
ALL_COLORS.push(turquoise);
const chestnut = new Color('h', 'chestnut', 'rgb(128,64,0)', [orange,black]);
ALL_COLORS.push(chestnut);
const hazelnut = new Color('Z', 'hazelnut', 'rgb(64,0,0)', [maroon,black]);
ALL_COLORS.push(hazelnut);
const forest = new Color('f', 'forest', 'rgb(64,111,64)', [green,black]);
ALL_COLORS.push(forest);
const eggplant = new Color('e', 'eggplant', 'rgb(64,47,64)', [violet,black]);
ALL_COLORS.push(eggplant);
const apricot = new Color('a', 'apricot', 'rgb(255,192,128)', [orange,white]);
ALL_COLORS.push(apricot);
const mint = new Color('M', 'mint', 'rgb(192,238,192)', [green,white]);
ALL_COLORS.push(mint);
const lavender = new Color('l', 'lavender', 'rgb(192,175,192)', [violet,white]);
ALL_COLORS.push(lavender);
const pink = new Color('p','pink','rgb(255,192,192)',[salmon,white]);
ALL_COLORS.push(pink);
const ice = new Color('i', 'ice', 'rgb(192,238,255)', [celeste,white]);
ALL_COLORS.push(ice);
const vermilion = new Color('V', 'vermilion', 'rgb(255,64,0)', [orange,red]);
ALL_COLORS.push(vermilion);
const dustyBlue = new Color('d', 'dusty blue', 'rgb(128,158,192)', [salmon,blue]);
ALL_COLORS.push(dustyBlue);
const watermelon = new Color('W', 'watermelon', 'rgb(255,64,64)', [salmon,red]);
ALL_COLORS.push(watermelon);
const seaFoam = new Color('F', 'sea foam', 'rgb(128,221,192)', [xanthic,blue]);
ALL_COLORS.push(seaFoam);
const marigold = new Color('G', 'marigold', 'rgb(255,192,64)', [salmon,yellow]);
ALL_COLORS.push(marigold);
const mauve = new Color('U', 'mauve', 'rgb(192,111,128)', [celeste,red]);
ALL_COLORS.push(mauve);
const keyLime = new Color('K', 'key lime', 'rgb(192,238,128)', [celeste,yellow]);
ALL_COLORS.push(keyLime);
const aqua = new Color('Q', 'aqua', 'rgb(64,204,255)', [celeste,blue]);
ALL_COLORS.push(aqua);
const kelly = new Color('k', 'kelly', 'rgb(0,175,64)', [navy,phosphor]);
ALL_COLORS.push(kelly);
const ruby = new Color('Y', 'ruby', 'rgb(192,0,0)', [maroon,red]);
ALL_COLORS.push(ruby);



// Class 4 colors
const gray125 = new Color('1', 'gray (12.5%)', 'rgb(224,224,224)', [gray25,white]);
ALL_COLORS.push(gray125);
const gray825 = new Color('8', 'gray (82.5%)', 'rgb(32,32,32)', [gray75,black]);
ALL_COLORS.push(gray825);
const rose = new Color('R', 'rose', 'rgb(224,151,160)', [cherry,white]);
ALL_COLORS.push(rose);
const beige = new Color('A', 'beige', 'rgb(224,183,160)', [brown,white]);
ALL_COLORS.push(beige);
const chocolate = new Color('C', 'chocolate', 'rgb(96,56,32)', [brown,black]);
ALL_COLORS.push(chocolate);
const periwinkle = new Color('w', 'periwinkle', 'rgb(160,198,224)', [prussian,white]);
ALL_COLORS.push(periwinkle);
const teal = new Color('E', 'teal', 'rgb(96,149,160)', [brown,blue]);
ALL_COLORS.push(teal);
const byzantium = new Color('z', 'Byzantium', 'rgb(160,71,96)', [prussian,red]);
ALL_COLORS.push(byzantium);


// Class 5+ colors
const taupe = new Color('T', 'taupe', 'rgb(160,135,96)', [violet,tan]);
ALL_COLORS.push(taupe);
const thistle = new Color('H', 'thistle', 'rgb(192,143,160)', [salmon,dustyBlue]);
ALL_COLORS.push(thistle);
const dustyViolet = new Color('D', 'dusty violet', 'rgb(160,166,192)', [ice,violet]);
ALL_COLORS.push(dustyViolet);
const eggshell = new Color('X', 'eggshell', 'rgb(240,219,208)', [beige,white]);
ALL_COLORS.push(eggshell);
const iris = new Color('I', 'iris', 'rgb(160,135,160)', [prussian,salmon]);
ALL_COLORS.push(iris);
const puce = new Color('N', 'puce', 'rgb(160,103,96)', [brown,violet]);
ALL_COLORS.push(puce);

// Even higher
const purple = new Color('u', 'purple', 'rgb(112,106,144)', [byzantium,prussian]);
ALL_COLORS.push(purple);



//console.log(ALL_COLORS);





// RANDOM COLOR FUNCTIONS

function randomColorObj() {
  return ALL_COLORS[Math.floor(Math.random()*(ALL_COLORS.length-1))];
}

function randomColor() {
  
  var r = Math.floor(Math.random() * 255);    
  var g = Math.floor(Math.random() * 255);    
  var b = Math.floor(Math.random() * 255);    
  var newString = numbersToColor([r, g, b])
  //console.log(newString);
  return newString;
  
}

// COLOR BLENDING FUNCTIONS

function colorToNumbers(rgbString) {
  var [a,b,c] = rgbString.split(",");
  var r1 = parseInt(a.slice(4));
  var g1 = parseInt(b);
  var b1 = parseInt(c);
  //console.log(rgbString, ": ", r1, g1, b1);
  return [r1, g1, b1];
}

function RGBtoHTML(rgbString) {
  var [a,b,c] = rgbString.split(",");
  var r1 = parseInt(a.slice(4));
  var g1 = parseInt(b);
  var b1 = parseInt(c);
  return r1 + ", " + g1 + ", " + b1;
}

function cellToHTML(cell) {     
  // takes an individual color cell from COLOR_LIST
  // Example: ["r", "red", "rgb(255,0,0)", "base"]

  var htmlToInsert = "";

  var abbrev = cell[0];
  var English = cell[1];
  var rgbCode = cell[2];
  var formula = cell[3];
  
  if (cell.length > 0) {
      htmlToInsert += abbrev;
      htmlToInsert += "<br />";
      htmlToInsert += English;
      htmlToInsert += "<br />";
      htmlToInsert += RGBtoHTML(rgbCode);
      htmlToInsert += "<br />";
      htmlToInsert += formula;
  }

  return htmlToInsert;
}

function numbersToColor(rgbArray) {
  var rgbString = "rgb(" + rgbArray[0] + "," + rgbArray[1] + "," + rgbArray[2] + ")"; //automatically converts numbers to string
  //console.log (rgbArray, ": ", rgbString)
  return rgbString;
}

function blend(color1, color2) {
  var c1 = colorToNumbers(color1);
  var c2 = colorToNumbers(color2);

  var newR = Math.round((c1[0] + c2[0]) / 2);
  var newG = Math.round((c1[1] + c2[1]) / 2);
  var newB = Math.round((c1[2] + c2[2]) / 2);

  var newString = numbersToColor([newR, newG, newB]);
  //console.log("blended color: ", newString);
  return newString;
}


function arrayToRGB(rgbArray) {
  var rgbString = "rgb(" + rgbArray[0] + "," + rgbArray[1] + "," + rgbArray[2] + ")"; 
  //console.log (rgbArray, ": ", rgbString)
  return rgbString;
}

function AbbrToColorObj(abbreviation) {
  for (i = 0; i < ALL_COLORS.length; i++) {
    var color = ALL_COLORS[i];
    if (color.abbr == abbreviation) {
      return color;
    } 
  }
}

function RGBtoColorObj(rgb) {
  for (i = 0; i < ALL_COLORS.length; i++) {
    var color = ALL_COLORS[i];
    if (color.rgb == rgb) {
      return color;
    } 
  }
}