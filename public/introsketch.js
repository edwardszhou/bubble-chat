function defIntroSketch(color) {
    return function(p) {
        let bubbles = [];
    
        p.setup = function () {
            p.opacity = 1;
            p.createCanvas(p.windowWidth, p.windowHeight);
            let initialBubbles =  Math.floor(p.random(2, 5))
            for(let i = 0; i < initialBubbles; i++) {
                bubbles.push(new Bubble(p.random(p.width * i / initialBubbles, p.width * (i + 1) / initialBubbles), p.random(p.height), p.random(300, 600), color + p.map(i, 0, initialBubbles - 1, -30, 30)));
            }
        }
        
        
        p.draw = function () {
            p.background('white');
            for(let bubble of bubbles) {
                if(bubble.initiated < bubble.size) {
                    bubble.initiate();
                }
                bubble.update();
                bubble.show();
            }
        }
        
        p.mousePressed = function () {
            bubbles.push(new Bubble(p.mouseX, p.mouseY, p.random(300, 500), color + p.random(-30, 30)));
        }

        p.windowResized = function() {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        }

        class Bubble {
            constructor(x, y, size, col) {
                this.x = x;
                this.y = y;
                this.size = size;
                this.col = col
                this.tx = p.random(10000);
                this.ty = this.tx + 1000
                
                this.initiated = 0;
            }
            update() {
                this.x += p.map(p.noise(this.tx), 0, 1, -2, 2);
                this.y += p.map(p.noise(this.ty), 0, 1, -2, 2);
                this.tx += 0.005;
                this.ty += 0.005;
            }
            show() {
                p.colorMode(p.HSL);
                p.noStroke();
                p.fill(this.col, 100, 97, p.opacity);
                p.circle(this.x, this.y, this.initiated);
            }
            initiate() {
                this.initiated += 5;
            }
        }
    }
}