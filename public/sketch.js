/**
 * Initializes p5 sketch with specified name and color of client
 * Sketch simulates physics world with each particle bounded by window
 * Particles possess internal repulsion force from other particles
 * Users can interact with world by connecting particles with springs or dragging particles using a mouse spring
 * 
 * @param {String} name name of the user
 * @param {Number} color color of user
 * @return instance of p5
 */
function defCallSketch(name, color) {

  // p wraps a p5 instance with access to name and color, with certain variables interacting with external HTML DOM elements
  // p.controlling indicates if user is interacting with primary sketch or drawing on secondary sketch
  // p.brushSize controls size of user's brush in secondary sketch
  // p.brushCol controls color of user's brush in secondary sketch

  return function(p) {
    // "Importing" classes needed from toxiclibs
    var { Rect } = toxi.geom;
    var { VerletPhysics2D, VerletParticle2D, VerletSpring2D } = toxi.physics2d;
    var { AttractionBehavior } = toxi.physics2d.behaviors;

    var physics;
    var whiteboard; // external p5 canvas behind particles


    // dictionary of particles, key: particle id, value: {particle: [particle obj], behavior: [particle attraction behavior], sid: [particle client socket id], mouse: [clint mouse particle], mouseSpring: [client mouse spring]}
    var particles = {};

    // set of active springs between mouse and particles
    var mouseSprings = new Set();

    let userParticle;
    let mouseParticle;

    let roboto;
    let radius = 200; // default user particle radius

    /**
     * Receives list of particles, connections, and whiteboard for sketch to load from server
     * @param {Object} data.users dictionary of users of the form key: socketid, value: {particle: [particle-object], id: [particle-object.id], muted: [isMuted]}
     * @param {Array.<Object>} data.connections array of objects representing connections {p1id: Number, p2id: Number}
     * @param {Array.<Object>} data.whiteboard array of objects representing whiteboard strokes {x1: [x1], y1: [y1], x2: [x2], y2: [y2], col: [hsb-color-hue] shade: [hsb-color-brightness], weight: [line-weight]}
     */
    socket.on('load-particles', (data) => {
      console.log("loading", data);
      
      // initializes all particles
      for (let id in data.users) {

        // "casts" object as particle in sketch, creates attraction behavior
        let particle = data.users[id].particle; 
        let newParticle = new Particle(particle.x, particle.y, particle.radius, particle.col, particle.id, particle.name);
        let newBehavior = new AttractionBehavior(newParticle, newParticle.radius,-3);

        // creates new mouse particle and spring representing other client's mouse
        let newMouse = new Particle(0, 0, 0, particle.col, particle.id + '-mouse');
        newMouse.lock();
        let newMouseSpring = new Spring(newMouse, newParticle, 15, 0);

        // adds to particle array
        particles[newParticle.id] = {particle: newParticle, behavior: newBehavior, sid: id, mouse: newMouse, mouseSpring: newMouseSpring};

        physics.addBehavior(newBehavior);
      }

      // initializes all particle connections
      for (let connection of data.connections) {

        // if particles do not exist in this room, ignore
        if(!particles[connection.p1id] || !particles[connection.p2id]) continue;

        let p1 = particles[connection.p1id].particle;
        let p2 = particles[connection.p2id].particle;

        p1.addNeighbor(p2, p2.radius * 2, 0.001 / radius * 100); // adds connection with spring value proportionate to radius
        p2.levelUp(); // increases size of particles according to number of connections
        p1.levelUp(); 
      }

      // initializes whiteboard
      whiteboard.colorMode(p.HSL);
      for(let stroke of data.whiteboard) {
        whiteboard.strokeWeight(stroke.weight);
        whiteboard.stroke(stroke.col, 100, stroke.shade);
        whiteboard.line(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
      }
    });

    /**
     * Receiving request for entire whiteboard of room
     * @param {Array.<Object>} data array of strokes on whiteboard
     */
    socket.on('request-whiteboard', (data) => {
      whiteboard.colorMode(p.HSL);
      for(let stroke of data) {
        whiteboard.strokeWeight(stroke.weight);
        whiteboard.stroke(stroke.col, 100, stroke.shade);
        whiteboard.line(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
      }
    })

    /**
     * Two particles in the room connect
     * @param {Object} data stores ids of connecting particles
     */
    socket.on('particle-connection', (data) => {
      let p1 = particles[data.p1id].particle;
      let p2 = particles[data.p2id].particle;

      p1.addNeighbor(p2, p2.radius * 2, 0.001 / radius * 100); // adds connection with spring value proportionate to radius
      p2.levelUp(); // increases size of particles according to number of connections
      p1.levelUp();
    });

    /**
     * Particle joins the room, adds to sketch
     * @param {Object} data data of client, particle and socket id
     */
    socket.on('add-particle', (data) => {

      // "casts" object as particle in sketch, creates attraction behavior
      let particle = data.particle;
      let newParticle = new Particle(particle.x, particle.y, particle.radius, particle.col, particle.id, particle.name);
      let newBehavior = new AttractionBehavior(newParticle, newParticle.radius,-3)

       // creates new mouse particle and spring representing other client's mouse
      let newMouse = new Particle(0, 0, 0, particle.col, particle.id + '-mouse');
      newMouse.lock();
      let newMouseSpring = new Spring(newMouse, newParticle, 15, 0)

      physics.addBehavior(newBehavior);

      // adds to particle array
      particles[newParticle.id] = {particle: newParticle, behavior: newBehavior, sid: data.sid, mouse: newMouse, mouseSpring: newMouseSpring};

    });

    /**
     * Particle leaves the room, removes from sketch
     * @param {Number} data particle id of client 
     */
    socket.on('remove-particle', (data) => {
 
      // removes from physics and particles
      particles[data].particle.remove();
      physics.removeBehavior(particles[data].behavior);

      delete particles[data];

    });

    /**
     * Receives mouse down signal (particle dragging initated)
     * @param {Number} data id of client particle
     */
    socket.on('mouse-on', (data) => {
      particles[data].mouseSpring.setStrength(0.0003);
      mouseSprings.add(particles[data].mouseSpring); // adds to set of active springs
    });

    /**
     * Receives mouse up signal (particle dragging terminated)
     * @param {Number} data id of client particle
     */
    socket.on('mouse-off', (data) => {
      particles[data].mouseSpring.setStrength(0);
      mouseSprings.delete(particles[data].mouseSpring); // removes from set of active springs
    });

    /**
     * Receives mouse movement signal (particle dragging)
     * @param {Object} data id of client particle and position of client mouse
     */
    socket.on('mouse-move', (data) => {
      particles[data.id].mouse.x = data.x;
      particles[data.id].mouse.y = data.y;
      particles[data.id].mouseSpring.show();
    });

    /**
     * Receives whiteboard drawing stroke
     * @param {Object} data {x1: [x1], y1: [y1], x2: [x2], y2: [y2], col: [hsb-color-hue] shade: [hsb-color-brightness], weight: [line-weight]}
     */
    socket.on('whiteboard-stroke', (data) => {
      whiteboard.colorMode(p.HSL);
      whiteboard.strokeWeight(data.weight);
      whiteboard.stroke(data.col, 100, data.shade);
      whiteboard.line(data.x1, data.y1, data.x2, data.y2);
    });

    /**
     * Loads font for names
     */
    p.preload = function() {
      roboto = p.loadFont('fonts/Roboto-Light.ttf');
    }

    /**
     * Sets up sketch on client side
     */
    p.setup = function() {

      // creates canvases based on window size
      p.createCanvas(p.windowWidth, p.windowHeight);
      whiteboard = p.createGraphics(p.windowWidth, p.windowHeight);
      p.textFont(roboto);
      p.textAlign(p.CENTER);
      physics = new VerletPhysics2D();

      // creates mouse particle, locks its location
      mouseParticle = new Particle(p.width / 2, p.height / 2, 0, color, 0);
      mouseParticle.lock();

      // creates user particle in random location with id of time since epoch, creates user attraction force
      userParticle = new Particle(p.random(p.width), p.random(p.height), radius, color, Date.now(), name);
      let userBehavior = new AttractionBehavior(userParticle, userParticle.radius,-3);
      physics.addBehavior(userBehavior);

      // adds particle to particles
      particles[userParticle.id] = {particle: userParticle, behavior: userBehavior, sid: 0, mouse: mouseParticle};

      // emits particle to server
      socket.emit('add-particle', userParticle);

      // creates spring between mouse and particle
      mouseSpring = new Spring(mouseParticle, userParticle, 15, 0)

      // Add a boundary
      let boundary = new Rect(100, 100, p.width-200, p.height-200);
      physics.setWorldBounds(boundary);
    }

    /**
     * controls connections and mouse spring
     */
    p.mousePressed = function() {
      // if user is drawing, do not trigger
      if(!p.controlling) return;

      // switches on mouse spring, emits to server
      mouseSpring.setStrength(0.0003);
      socket.emit('mouse-on', userParticle.id);

      // detect if click is within the radius of another particle
      for (let pid in particles) {

        let particle = particles[pid].particle;

        if (particle.detectClick(p.mouseX, p.mouseY)) {

          // pin particle if user performs shift-click, connects to other particle otherwise
          if(p.keyIsDown(p.SHIFT)) {
            particle.pin();
          } else {

            if (particle == userParticle || userParticle.neighbors.includes(particle)) // ignores existing neighbors and self
              continue;

            particle.addNeighbor(userParticle, userParticle.radius * 2, 0.001 / radius * 100);
            userParticle.levelUp(); // increases size of particles according to number of connections
            particle.levelUp();

            // emits connection to server
            socket.emit('particle-connection', {p1id: particle.id, p2id: userParticle.id})
          }
        }
      }
    }

    /**
     * controls connections and mouse spring
     */
    p.mouseReleased = function() {
      // if user is drawing, do not trigger
      if(!p.controlling) return;

      // switches off mouse spring, emits to server
      mouseSpring.setStrength(0);
      socket.emit('mouse-off', userParticle.id);
    }

    /**
     * Keyboard interaction for clearing whiteboard
     */
    p.keyPressed = function() {

      // clears whiteboard if user presses backspace
      if(p.keyCode == p.BACKSPACE) {
        whiteboard.background(255);
      }
    }

    /**
     * draws on canvas
     */
    p.draw = function() {

      // draws sketch background and whiteboard
      p.background(255);

      whiteboard.fill(0);
      p.image(whiteboard, 0, 0);
      
      // Step the simulation forward
      physics.update();


      if (p.mouseIsPressed && p.controlling) { // if mouse is held down and user is interacting with particle
        // moves mouse and emits to server
        socket.emit('mouse-move', {id: userParticle.id, x: p.mouseX, y: p.mouseY});
        mouseParticle.x = p.mouseX;
        mouseParticle.y = p.mouseY;
        mouseSpring.show();

      } else if(p.mouseIsPressed) { // if mouse is held down and user is drawing on whiteboard

        // draws based on brushSize and brushCol, emits to server
        whiteboard.colorMode(p.HSL);
        whiteboard.strokeWeight(p.brushSize);
        whiteboard.stroke(userParticle.col, 100, p.brushCol);
        whiteboard.line(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);
        socket.emit('whiteboard-stroke', {x1: p.mouseX, y1: p.mouseY, x2: p.pmouseX, y2: p.pmouseY, col: userParticle.col, shade: p.brushCol, weight: p.brushSize})
      }

      // shows active springs
      for (let spring of mouseSprings) {
        spring.show();
      }

      // shows particles
      for (let pid in particles) {
        let particle = particles[pid].particle;
        
        particle.show();

        let canvas;
        
        // gets HTML DOM element associated with the video of the particle
        // moves canvas to match the position of the particle
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

    /**
     * Resizes canvases when user resizes window, requests for new whiteboard and resets world boundary
     */
    p.windowResized = function() {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      whiteboard.resizeCanvas(p.windowWidth, p.windowHeight);
      socket.emit('request-whiteboard');
      let boundary = new Rect(100, 100, p.width-200, p.height-200);
      physics.setWorldBounds(boundary);
    }
    
    /**
     * Particle class adding onto class from toxiclibs
     * Represents individual users in app with unique colors and properties
     */
    class Particle extends VerletParticle2D {

      /**
       * Creates new particle object
       * 
       * @param {Number} x x position
       * @param {Number} y y position
       * @param {Number} radius radius
       * @param {Number} col hue in HSB
       * @param {Number} id id of particle (time of creation)
       * @param {String} name name of particle
       */
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

        // delay before particle is "loaded" to sync with video
        setTimeout(()=> {
          this.ready = true;
        }, 1980);
      }
      
      /**
       * Draws particle on canvas
       */
      show() {
        p.colorMode(p.HSL);
        if(!this.ready) { // does not draw if not loaded
          return;
        } 
        
        for(let spring of this.springs) { // shows connected springs
          spring.show();
        }
        
        // draws circle with name below
        p.fill(this.col, 100, 85);
        p.strokeWeight(20);
        p.stroke(this.col, 100, 85);
        p.circle(this.x, this.y, this.radius);

        p.fill(this.col, 100, 40);
        p.noStroke();
        p.textSize(this.radius / 10);
        p.text(this.name, this.x, this.y + this.radius * 0.65);
      } 
        
      /**
       * DEBUG FEATURE
       * draws particle without its springs
       */
      showSpringless() {
        p.colorMode(p.HSL);
        p.fill(this.col, 100, 85);
        p.stroke(this.col, 100, 85);
        p.circle(this.x, this.y, this.radius);
      }
      
      /**
       * Adds connection (as neighbor) between this particle and another particle
       * 
       * @param {Object} particle particle to connect to
       * @param {Number} length length of spring connection
       * @param {Number} k strength of spring connection (k)
       */
      addNeighbor(particle, length, k) {
        this.neighbors.push(particle); // stores as neighbor
        particle.neighbors.push(this);

        // creates spring between particles
        let spring = new Spring(this, particle, length, k) 
        this.springs.push(spring);
        particle.springs.push(spring);
      }
      
      /**
       * Detects if specified position is within the radius of the particle
       * 
       * @param {Number} x x position, expected as mouseX
       * @param {Number} y y position, expected as mouseY
       * @returns 
       */
      detectClick(x, y) {
        // distance formula
        if(p.sqrt( p.pow(this.x - x, 2) + p.pow(this.y - y, 2) ) < this.radius / 2) {
          return true;
        }
        return false;
      }
      
      /**
       * Increases size of particle
       */
      levelUp() {
        this.radius += 35;
      }

      /**
       * Toggles pinning of particle
       */
      pin() {
        this.pinned = !this.pinned;
        if(this.pinned) {
          this.lock();
        } else {
          this.unlock();
        }
      }

      /**
       * Removes particle and its associated components from sketch
       */
      remove() {
        // removes springs from physics
        for(let spring of this.springs) {
          physics.removeSpring(spring);
        }

        // removes itself and its springs from neighbors' data
        for(let neighbor of this.neighbors) {
          neighbor.neighbors.splice(neighbor.neighbors.indexOf(this), 1);
          for(let spring of neighbor.springs) {
            if(spring.a == this || spring.b == this) {
              physics.removeSpring(spring);
              neighbor.springs.splice(neighbor.springs.indexOf(spring), 1);
            }
          }
        }

        // removes itself from physics
        physics.removeParticle(this);
      }
    }

    /**
     * Spring class adding onto class from toxiclibs
     * Represents connections between particles (users) and also between particles and users (mouse)
     */
    class Spring extends VerletSpring2D {

      /**
       * Creates Spring object between two particles
       * 
       * @param {Object} a first particle to connect to
       * @param {Object} b second particle to connect to
       * @param {Number} len length of spring
       * @param {Number} strength spring constant, strength of spring
       */
      constructor(a, b, len, strength) {
        super(a, b, len, strength);
        physics.addSpring(this);
      }

      /**
       * Draws spring on canvas
       */
      show() {
        p.colorMode(p.HSL);
        p.strokeWeight(5);

        // Color of spring determined by color of its two particles, mixes them
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
