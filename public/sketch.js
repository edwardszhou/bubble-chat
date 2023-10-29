// "Importing" classes we need
function defCallSketch(name, color) {
  return function(p) {
    var { Rect } = toxi.geom;
    var { VerletPhysics2D, VerletParticle2D, VerletSpring2D } = toxi.physics2d;
    var { AttractionBehavior } = toxi.physics2d.behaviors;

    var physics;
    var whiteboard;
    var particles = {};
    var mouseSprings = new Set();

    let userParticle;
    let mouseParticle;

    let roboto;
    let radius = 200;

    socket.on('load-particles', (data) => {
      console.log("loading", data);
      
      for (let id in data.users) {
        let particle = data.users[id].particle;

        let newParticle = new Particle(particle.x, particle.y, particle.radius, particle.col, particle.id, particle.name);
        let newBehavior = new AttractionBehavior(newParticle, newParticle.radius,-3);

        let newMouse = new Particle(0, 0, 0, particle.col, particle.id + '-mouse');
        let newMouseSpring = new Spring(newMouse, newParticle, 15, 0);

        particles[newParticle.id] = {particle: newParticle, behavior: newBehavior, sid: id, mouse: newMouse, mouseSpring: newMouseSpring};

        physics.addBehavior(newBehavior);

      }

      for (let connection of data.connections) {

        if(!particles[connection.p1id] || !particles[connection.p2id]) continue;

        let p1 = particles[connection.p1id].particle;
        let p2 = particles[connection.p2id].particle;


        p1.addNeighbor(p2, p2.radius * 2, 0.001 / radius * 100);
        p2.levelUp();
      }

      whiteboard.colorMode(p.HSL);
      for(let stroke of data.whiteboard) {
        whiteboard.strokeWeight(stroke.weight);
        whiteboard.stroke(stroke.col, 100, stroke.shade);
        whiteboard.line(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
      }
    });

    socket.on('request-whiteboard', (data) => {
      whiteboard.colorMode(p.HSL);
      for(let stroke of data) {
        whiteboard.strokeWeight(stroke.weight);
        whiteboard.stroke(stroke.col, 100, stroke.shade);
        whiteboard.line(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
      }
    })

    socket.on('particle-connection', (data) => {
      let p1 = particles[data.p1id].particle;
      let p2 = particles[data.p2id].particle;

      p1.addNeighbor(p2, p2.radius * 2, 0.001 / radius * 100);
      p2.levelUp();
    });

    socket.on('add-particle', (data) => {

      console.log('adding particle' + data);

      let particle = data.particle;
      let newParticle = new Particle(particle.x, particle.y, particle.radius, particle.col, particle.id, particle.name);
      let newBehavior = new AttractionBehavior(newParticle, newParticle.radius,-3)

      let newMouse = new Particle(0, 0, 0, particle.col, particle.id + '-mouse');
      let newMouseSpring = new Spring(newMouse, newParticle, 15, 0)

      physics.addBehavior(newBehavior);

      particles[newParticle.id] = {particle: newParticle, behavior: newBehavior, sid: data.sid, mouse: newMouse, mouseSpring: newMouseSpring};

    });

    socket.on('remove-particle', (data) => {

      particles[data].particle.remove();
      physics.removeBehavior(particles[data].behavior);

      delete particles[data];

    });

    socket.on('mouse-on', (data) => {
      particles[data].mouseSpring.setStrength(0.0003);
      mouseSprings.add(particles[data].mouseSpring);
    });
    socket.on('mouse-off', (data) => {
      particles[data].mouseSpring.setStrength(0);
      mouseSprings.delete(particles[data].mouseSpring);
    });
    socket.on('mouse-move', (data) => {
      particles[data.id].mouse.x = data.x;
      particles[data.id].mouse.y = data.y;
      particles[data.id].mouseSpring.show();
    });
    socket.on('whiteboard-stroke', (data) => {
      whiteboard.colorMode(p.HSL);
      whiteboard.strokeWeight(data.weight);
      whiteboard.stroke(data.col, 100, data.shade);
      whiteboard.line(data.x1, data.y1, data.x2, data.y2);
    });

    p.preload = function() {
      roboto = p.loadFont('fonts/Roboto-Light.ttf');
    }

    p.setup = function() {
      p.createCanvas(p.windowWidth, p.windowHeight);
      whiteboard = p.createGraphics(p.windowWidth, p.windowHeight);
      p.textFont(roboto);
      p.textAlign(p.CENTER);
      physics = new VerletPhysics2D();

      mouseParticle = new Particle(p.width / 2, p.height / 2, 0, color, 0);
      mouseParticle.lock();

      userParticle = new Particle(p.random(p.width), p.random(p.height), radius, color, Date.now(), name);

      let userBehavior = new AttractionBehavior(userParticle, userParticle.radius,-3);
      physics.addBehavior(userBehavior);

      particles[userParticle.id] = {particle: userParticle, behavior: userBehavior, sid: 0, mouse: mouseParticle};

      console.log('emitting user particle');
      socket.emit('add-particle', userParticle);

      mouseSpring = new Spring(mouseParticle, userParticle, 15, 0)

      // make the world

      // Add a boundary
      let boundary = new Rect(100, 100, p.width-200, p.height-200);
      physics.setWorldBounds(boundary);
    }

    p.mousePressed = function() {
      if(!p.controlling) return;

      mouseSpring.setStrength(0.0003);
      socket.emit('mouse-on', userParticle.id);

      for (let pid in particles) {

        let particle = particles[pid].particle;

        if (particle.detectClick(p.mouseX, p.mouseY)) {

          if(p.keyIsDown(p.SHIFT)) {
            console.log('lol');
            particle.pin();
          } else {

            if (particle == userParticle || userParticle.neighbors.includes(particle))
              continue;

            particle.addNeighbor(userParticle, userParticle.radius * 2, 0.001 / radius * 100);
            userParticle.levelUp();
            socket.emit('particle-connection', {p1id: particle.id, p2id: userParticle.id})
          }
        }
      }
    }

    p.mouseReleased = function() {
      if(!p.controlling) return;

      mouseSpring.setStrength(0);
      socket.emit('mouse-off', userParticle.id);
    }

    p.keyPressed = function() {
      if(p.keyCode == p.BACKSPACE) {
        whiteboard.background(255);
      }
    }
    p.draw = function() {
      p.background(255);

      whiteboard.fill(0);
      
      p.image(whiteboard, 0, 0);
      
      // Step the simulation forward
      physics.update();

      if (p.mouseIsPressed && p.controlling) {
        socket.emit('mouse-move', {id: userParticle.id, x: p.mouseX, y: p.mouseY});
        mouseParticle.x = p.mouseX;
        mouseParticle.y = p.mouseY;
        mouseSpring.show();
      } else if(p.mouseIsPressed) {
        whiteboard.colorMode(p.HSL);
        whiteboard.strokeWeight(p.brushSize);
        whiteboard.stroke(userParticle.col, 100, p.brushCol);
        whiteboard.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
        socket.emit('whiteboard-stroke', {x1: p.mouseX, y1: p.mouseY, x2: p.pmouseX, y2: p.pmouseY, col: userParticle.col, shade: p.brushCol, weight: p.brushSize})
      }

      for (let spring of mouseSprings) {
        spring.show();
      }

      for (let pid in particles) {
        let particle = particles[pid].particle;
        
        particle.show();

        let canvas;
        if(particles[pid].sid == 0) {
          canvas = document.getElementById('usercanvas');
        } else {
          canvas = document.getElementById(particles[pid].sid + '-canvas');
        }
        if(canvas) {
          canvas.style.top = (particle.y - particle.radius/2) + "px";
          canvas.style.left = (particle.x - 2*particle.radius/3) + "px";
          canvas.style.height = particle.radius + "px";
        }
      }


    }
    p.windowResized = function() {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      whiteboard.resizeCanvas(p.windowWidth, p.windowHeight);
      socket.emit('request-whiteboard');
      let boundary = new Rect(100, 100, p.width-200, p.height-200);
      physics.setWorldBounds(boundary);
    }
    

    class Particle extends VerletParticle2D {
      constructor(x, y, radius, col, id, name) {
        super(x, y);

        this.col = col;
        this.springs = [];
        this.neighbors = [];
        this.radius = radius;
        this.id = id;
        this.name = name;
        this.pinned = false;
        this.ready = false;
        physics.addParticle(this);

        setTimeout(()=> {
          this.ready = true;
        }, 1980);
      }
      
      show() {
        p.colorMode(p.HSL);
        if(!this.ready) {
          return;
        } 
        
        for(let spring of this.springs) {
          spring.show();
        }
        
        p.fill(this.col, 100, 85);
        p.strokeWeight(20);
        p.stroke(this.col, 100, 85);
        p.circle(this.x, this.y, this.radius);

        p.fill(this.col, 100, 40);
        p.noStroke();
        p.textSize(this.radius / 10);
        p.text(this.name, this.x, this.y + this.radius * 0.65);
      } 
        
      
      showSpringless() {
        p.colorMode(p.HSL);
        p.fill(this.col, 100, 85);
        p.stroke(this.col, 100, 85);
        p.circle(this.x, this.y, this.radius);
      }
      
      
      addNeighbor(particle, length, k) {
        this.neighbors.push(particle);
        particle.neighbors.push(this);
        let spring = new Spring(this, particle, length, k)
        this.springs.push(spring);
        particle.springs.push(spring);
      }
      
      detectClick(x, y) {
        if(p.sqrt( p.pow(this.x - x, 2) + p.pow(this.y - y, 2) ) < this.radius / 2) {
          return true;
        }
        return false;
      }
      
      levelUp() {
        this.radius += 35;
      }

      pin() {
        this.pinned = !this.pinned;
        if(this.pinned) {
          this.lock();
        } else {
          this.unlock();
        }
      }

      remove() {
        for(let spring of this.springs) {
          physics.removeSpring(spring);
        }
        for(let neighbor of this.neighbors) {
          neighbor.neighbors.splice(neighbor.neighbors.indexOf(this), 1);
          for(let spring of neighbor.springs) {
            if(spring.a == this || spring.b == this) {
              physics.removeSpring(spring);
              neighbor.springs.splice(neighbor.springs.indexOf(spring), 1);
            }
          }
        }
        physics.removeParticle(this);
      }
    }


    class Spring extends VerletSpring2D {
      constructor(a, b, len, strength) {
        super(a, b, len, strength);
        physics.addSpring(this);
      }
      show() {
        p.colorMode(p.HSL);
        p.strokeWeight(5);

        const color1 = p.color(this.a.col, 100, 85);
        const color2 = p.color(this.b.col, 100, 85);
        p.colorMode(p.RGB);
        p.stroke(p.lerpColor(color1, color2, 0.5));

        p.colorMode(p.HSL);
        p.line(this.a.x, this.a.y, this.b.x, this.b.y);
      }
    }
  };
}
