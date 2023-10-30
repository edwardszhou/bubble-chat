/**
 * Initializes p5 sketch with specified color of client
 * Sketch serves as an interactive background of the home page
 * Bubbles of varying colors move randomly according to Perlin noise
 * Users can interact with world by generating bubbles via click
 * 
 * @param {Number} color color of user
 * @return instance of p5
 */
function defIntroSketch(color) {

    // p wraps an instance of p5 with access to color
    // p.opacity represents opacity of sketch
    
    return function(p) {

        let bubbles = []; // array of bubbles
    
        p.setup = function () {
            p.opacity = 1;
            p.createCanvas(p.windowWidth, p.windowHeight);
            let initialBubbles =  Math.floor(p.random(2, 5)) // random number of bubbles initially
            for(let i = 0; i < initialBubbles; i++) {
                // spreads out bubbles based on width / total number of bubbles, so one in each half/third/fourth/fifth of the width
                // colors bubbles based on color +/- 30 spread out over total number of bubbles, ex. 4 bubbles -> color + {-30, -10, 10, 30}
                bubbles.push(new Bubble(p.random(p.width * i / initialBubbles, p.width * (i + 1) / initialBubbles), p.random(p.height), p.random(300, 600), color + p.map(i, 0, initialBubbles - 1, -30, 30)));
            }
        }
        
        /**
         * Draws on canvas, updates bubbles and shows
         */
        p.draw = function () {
            p.background('white');
            for(let bubble of bubbles) {
                if(bubble.initiated < bubble.size) { // grows bubble if they aren't full size yet
                    bubble.initiate();
                }
                bubble.update();
                bubble.show();
            }
        }
        
        /**
         * Callback for mouse press, creates new bubble
         */
        p.mousePressed = function () {
            bubbles.push(new Bubble(p.mouseX, p.mouseY, p.random(300, 500), color + p.random(-30, 30)));
        }

        /**
         * Adapts canvas based on window size
         */
        p.windowResized = function() {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        }

        /**
         * Bubble class with basic random walking functionality 
         */
        class Bubble {
            /**
             * Constructs bubble with specified properties
             * 
             * @param {Number} x x position of bubble
             * @param {Number} y y position of bubble
             * @param {Number} size size of bubble
             * @param {Number} col Hue in HSB of bubble
             */
            constructor(x, y, size, col) {
                this.x = x;
                this.y = y;
                this.size = size; // maximum size of bubble
                this.col = col
                this.tx = p.random(10000); // random Perlin noise seed values for x and y
                this.ty = this.tx + 1000
                
                this.initiated = 0; // actual size of bubble, limited by this.size
            }

            /**
             * Random movement according to Perlin noise
             */
            update() {
                this.x += p.map(p.noise(this.tx), 0, 1, -2, 2);
                this.y += p.map(p.noise(this.ty), 0, 1, -2, 2);
                this.tx += 0.005;
                this.ty += 0.005;
            }

            /**
             * Draws bubble
             */
            show() {
                p.colorMode(p.HSL);
                p.noStroke();
                p.fill(this.col, 100, 97, p.opacity);
                p.circle(this.x, this.y, this.initiated);
            }
            /**
             * Grows bubble
             */
            initiate() {
                this.initiated += 5;
            }
        }
    }
}