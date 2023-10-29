// "Importing" classes we need
var { Vec2D, Rect } = toxi.geom;
var { VerletPhysics2D, VerletParticle2D, VerletSpring2D } = toxi.physics2d;
var { GravityBehavior, AttractionBehavior } = toxi.physics2d.behaviors;

let physics;
// let particles = [];
// let particleIds = [];
// let behaviors = [];

let particles = {};

let userParticle;
let mouseParticle;

let particleNum;
let radius = 200;
let k = 0.002;
let col;

socket.on('load-particles', (data) => {
  console.log("loading");

  // let newParticles = [];
  // let newParticleIds = [];

  for (let id in data.users) {

    let particle = data.users[id].particle;

    let newParticle = new Particle(particle.x, particle.y, particle.radius, particle.col, particle.id);
    // particles.push(newParticle);
    let newBehavior = new AttractionBehavior(newParticle, newParticle.radius,-3);

    particles[newParticle.id] = {particle: newParticle, behavior: newBehavior};

    physics.addBehavior(newBehavior);
    // behaviors.push(newBehavior)
    // newParticles.push(newParticle);
    // newParticleIds.push(particle.id);
    // particleIds.push(particle.id);
  }

  for (let connection of data.connections) {
    // let index1 = newParticleIds.indexOf(connection[0]);
    // let index2 = newParticleIds.indexOf(connection[1]);
    // newParticles[index1].addNeighbor(newParticles[index2], newParticles[index2].radius * 2, 0.001 / radius * 100);
    // newParticles[index2].levelUp();
    let p1 = particles[connection.p1id].particle;
    let p2 = particles[connection.p2id].particle;

    p1.addNeighbor(p2, p2.radius * 2, 0.001 / radius * 100);
    p2.levelUp();
  }

  // for(let id of newParticleIds) {
  //   let img = document.createElement('img');
  //   img.id = id;
  //   img.className = "user-video";
  //   document.body.appendChild(img);
  // }

});

socket.on('particle-connection', (data) => {
  let p1 = particles[data.p1id].particle;
  let p2 = particles[data.p2id].particle;

  p1.addNeighbor(p2, p2.radius * 2, 0.001 / radius * 100);
  p2.levelUp();
});

socket.on('add-particle', (data) => {
  let newParticle = new Particle(data.x, data.y, data.radius, data.col, data.id);
  // particles.push(newParticle);
  let newBehavior = new AttractionBehavior(newParticle, newParticle.radius,-3)
  physics.addBehavior(newBehavior);
  // behaviors.push(newBehavior);
  // particleIds.push(data.id);
  particles[newParticle.id] = {particle: newParticle, behavior: newBehavior};


  // let img = document.createElement('img');
  // img.id = data.id;
  // img.className = "user-video";
  // document.body.appendChild(img);
});

socket.on('remove-particle', (data) => {

    particles[data].particle.remove();
    physics.removeBehavior(particles[data].behavior);

    delete particles[data];

    // document.getElementById(data).remove();

});

// socket.on('video', (data)=> {
//   let image = document.getElementById(data.id);
//   image.src = data.imgsrc;

//   let particle;
//   for(let i = 0; i < particleIds.length; i++) {
//     if(particleIds[i] == data.id) {
//       particle = particles[i];
//       break;
//     }
//   }
//   image.style.top = (particle.y - particle.radius/2) + "px";
//   image.style.left = (particle.x - 2 * particle.radius/3) + "px";
//   image.height = particle.radius;

// }) 

function setup() {
  createCanvas(windowWidth, windowHeight);
  physics = new VerletPhysics2D();

  particleNum = floor(5);
  col = floor(random(0, 255));

  mouseParticle = new Particle(width / 2, height / 2, 0, 0, 0);
  mouseParticle.lock();

  userParticle = new Particle(random(width), random(height), radius, col, Date.now())
  // particles.unshift(userParticle);
  // particleIds.unshift(userParticle.id);

  let userBehavior = new AttractionBehavior(userParticle, userParticle.radius,-3)
  physics.addBehavior(userBehavior);
  // behaviors.unshift(userBehavior);

  particles[userParticle.id] = {particle: userParticle, behavior: userBehavior};

  socket.emit('add-particle', userParticle);

  // let img = document.createElement('img');
  // img.id = userParticle.id;
  // img.className = "user-video";
  // document.body.appendChild(img);

  mouseSpring = new Spring(mouseParticle, userParticle, 15, 0)

  // make the world

  // Add a boundary
  let boundary = new Rect(0, 0, width, height);
  physics.setWorldBounds(boundary);

}

function mousePressed() {
  mouseSpring.setStrength(0.0003);
  for (let pid in particles) {

    let particle = particles[pid].particle;
    if (particle == userParticle) continue;
    
    if (userParticle.neighbors.includes(particle))
      continue;
    if (particle.detectClick(mouseX, mouseY)) {
      particle.addNeighbor(userParticle, userParticle.radius * 2, 0.001 / radius * 100);
      userParticle.levelUp();
      socket.emit('particle-connection', {p1id: particle.id, p2id: userParticle.id})
    }
  }
}

function mouseReleased() {
  mouseSpring.setStrength(0);
}

function draw() {
  background(255);

  // Step the simulation forward
  physics.update();

  if (mouseIsPressed) {
    mouseParticle.x = mouseX;
    mouseParticle.y = mouseY;
    mouseSpring.show();
  }

  for (let pid in particles) {
    particles[pid].particle.show();
  }

}
