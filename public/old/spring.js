
class Spring extends VerletSpring2D {
    constructor(a, b, len, strength) {
      super(a, b, len, strength);
      physics.addSpring(this);
    }
    show() {
      stroke(this.a.col, 255, 150)
      line(this.a.x, this.a.y, this.b.x, this.b.y);
    }
  }