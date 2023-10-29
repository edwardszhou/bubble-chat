class Particle extends VerletParticle2D {
    constructor(x, y, radius, col, id) {
      super(x, y);
      this.col = col;
      this.springs = [];
      this.neighbors = [];
      this.radius = radius;
      this.id = id;
      physics.addParticle(this);
  
    }
    
    show() {
      colorMode(HSB);
      
      for(let spring of this.springs) {
        spring.show();
      }
      
      fill(this.col, 255, 150);
      stroke(this.col, 255, 50);
      circle(this.x, this.y, this.radius);
    }

    showSprings() {
      colorMode(HSB);
      for(let spring of this.springs) {
        spring.show();
      }
    }
    
    showSpringless() {
      colorMode(HSB);
      fill(this.col, 255, 150);
      stroke(this.col, 255, 50);
      circle(this.x, this.y, this.radius);
    }
    
    
    addNeighbor(particle, length, k) {
      this.neighbors.push(particle);
      particle.neighbors.push(this);
      let spring = new Spring(this, particle, length, k)
      this.springs.push(spring);
      particle.springs.push(spring);
    }
    
    detectClick(x, y) {
      if(sqrt( pow(this.x - x, 2) + pow(this.y - y, 2) ) < this.radius / 2) {
        return true;
      }
      return false;
    }
    
    levelUp() {
      this.radius += 35;
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