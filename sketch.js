let flock = [];
let bubbles = []; 
let handDetector;
let lastMoveTime = 0;
let targets = []; 

// --- AUDIO VARIABLES ---
let choir = [];       
let filter;           
let reverb;
let audioStarted = false;

// ETHEREAL SCALES (Frequencies in Hertz)
// Low Bass Notes (C2, D2, E2, G2, A2)
let bassScale = [65.41, 73.42, 82.41, 98.00, 110.00];
// High Soprano Notes (C4, D4, E4, G4, A4, C5)
let sopranoScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);

  // --- 1. SETUP HAND DETECTOR ---
  let video = createCapture(VIDEO);
  video.size(640, 480); 
  video.hide();
  
  handDetector = new HandDetector(video);

  // --- 2. SETUP CHOIR AUDIO ---
  reverb = new p5.Reverb();
  filter = new p5.LowPass();
  
  filter.freq(600); 
  filter.res(5);    
  
  reverb.process(filter, 6, 2); 

  // Create 5 voices (Triangle wave = soft, flute-like)
  for (let i = 0; i < 5; i++) {
    let osc = new p5.Oscillator('triangle');
    osc.disconnect();    
    osc.connect(filter); 
    choir.push(osc);
  }

  // --- 3. CALCULATE FISH COUNT ---
  let screenArea = width * height;
  let fishCount = floor(screenArea / 800); 
  fishCount = constrain(fishCount, 300, 700);

  for (let i = 0; i < fishCount; i++) {
    flock.push(new Boid());
  }
  
  let bubbleCount = constrain(floor(screenArea / 15000), 30, 80);
  for (let i = 0; i < bubbleCount; i++) {
    bubbles.push(new Bubble());
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // --- 4. VISUAL BACKGROUND ---
  drawWater();
  drawSunRays();

  // --- 5. GET HAND POSITIONS ---
  let detectedPoints = handDetector.getHandPositions();
  
  targets = [];
  if (detectedPoints.length > 0) {
    for (let pt of detectedPoints) {
      targets.push(createVector(pt.x, pt.y));
    }
    lastMoveTime = millis(); 
  }

  let isIdle = (millis() - lastMoveTime > 3000);

  // --- 6. UPDATE AUDIO ---
  if (audioStarted) {
    updateQuantizedChoir(targets, isIdle);
  } else {
    drawStartOverlay();
  }

  // --- 7. UPDATE VISUALS ---
  for (let b of bubbles) {
    b.update();
    b.show();
  }

  if (!isIdle) {
    noStroke();
    for (let i = 0; i < targets.length; i++) {
        let t = targets[i];
        
        fill(0, 0, 100, 0.2); 
        circle(t.x, t.y, 70); 
        
        fill(0, 0, 100); 
        textAlign(CENTER);
        textSize(14);
        
        if (i === 0) text("BASS VOICES", t.x, t.y - 45);
        if (i === 1) text("SOPRANO VOICES", t.x, t.y - 45);
        
        circle(t.x, t.y, 20); 
    }
  }

  for (let boid of flock) {
    boid.edges();
    boid.flock(flock, targets, isIdle);
    boid.update();
    boid.show();
  }
}

function mousePressed() {
  if (!audioStarted) {
    userStartAudio(); 
    for (let osc of choir) {
        osc.start();
        osc.amp(0, 1.0); 
    }
    audioStarted = true;
  }
}

function drawStartOverlay() {
  push();
  textAlign(CENTER, CENTER);
  textSize(windowWidth * 0.03); 
  fill(0, 0, 100);
  noStroke();
  text("CLICK TO START CHOIR", width / 2, height / 2);
  pop();
}

// --- QUANTIZED CHOIR LOGIC ---
function updateQuantizedChoir(hands, isIdle) {
  let bassFreq = 65.41; 
  let sopFreq = 261.63; 
  
  let volBass = 0;
  let volSop = 0;

  if (isIdle) {
    bassFreq = bassScale[0];
    volBass = 0.1; 
    volSop = 0;
  } else {
    // --- HAND 1: BASS VOICES ---
    if (hands.length > 0) {
        let index = floor(map(hands[0].y, height, 0, 0, bassScale.length));
        index = constrain(index, 0, bassScale.length - 1);
        bassFreq = bassScale[index];
        volBass = 0.4; 
    }

    // --- HAND 2: SOPRANO VOICES ---
    if (hands.length > 1) {
        let index = floor(map(hands[1].y, height, 0, 0, sopranoScale.length));
        index = constrain(index, 0, sopranoScale.length - 1);
        sopFreq = sopranoScale[index];
        
        // CHANGED: Reduced volume to 0.15 (Was 0.3)
        volSop = 0.15; 
    }
  }

  // --- APPLY TO OSCILLATORS ---
  
  // GROUP A: BASS (Voices 0, 1, 2)
  choir[0].freq(bassFreq, 0.1);
  choir[0].amp(volBass, 0.2);
  
  choir[1].freq(bassFreq * 1.5, 0.1); 
  choir[1].amp(volBass * 0.8, 0.2);
  
  choir[2].freq(bassFreq * 2.0, 0.1); 
  choir[2].amp(volBass * 0.6, 0.2);

  // GROUP B: SOPRANO (Voices 3, 4)
  choir[3].freq(sopFreq, 0.1);
  choir[3].amp(volSop, 0.2);
  
  // CHANGED: Harmony is even quieter (volSop * 0.6)
  choir[4].freq(sopFreq * 1.25, 0.1); 
  choir[4].amp(volSop * 0.6, 0.2);
}

// --- VISUAL FUNCTIONS ---
function drawWater() {
  let waterHue = map(sin(frameCount * 0.005), -1, 1, 180, 240);
  noStroke();
  fill(waterHue, 40, 60, 0.2); 
  rect(0, 0, width, height);

  for (let i = 0; i < 3; i++) {
    fill(waterHue, 60, 90, 0.1); 
    beginShape(); 
    vertex(0, height); 
    for (let x = 0; x <= width; x += 40) { 
      let y = map(noise(frameCount * 0.005 + x * 0.01 + i), 0, 1, height/2 + (i*50), height);
      vertex(x, y);
    }
    vertex(width, height); 
    endShape(CLOSE);
  }
}

function drawSunRays() {
  push();
  translate(width / 2, -50);
  for (let i = 0; i < 3; i++) {
    let angle = map(noise(frameCount * 0.003 + i * 10), 0, 1, PI/2 - 0.6, PI/2 + 0.6);
    rotate(angle - PI/2); 
    strokeWeight(40 + i * 5); 
    stroke(0, 0, 100, 0.08); 
    line(0, 0, 0, height * 1.8); 
    rotate(-(angle - PI/2)); 
  }
  pop();
}

// --- CLASSES ---
class Bubble {
  constructor() {
    this.x = random(width);
    this.y = random(height, height + 200); 
    this.size = random(4, 10); 
    this.speed = random(0.5, 1.5);
    this.wobble = random(0, 1000); 
  }
  update() {
    this.y -= this.speed; 
    this.x += sin(frameCount * 0.03 + this.wobble) * 0.5;
    if (this.y < -10) {
      this.y = height + random(10, 100);
      this.x = random(width);
    }
  }
  show() {
    stroke(0, 0, 100, 0.6); 
    strokeWeight(1);        
    fill(0, 0, 100, 0.1);   
    circle(this.x, this.y, this.size);
    noStroke();
    fill(0, 0, 100, 0.8); 
    ellipse(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.3);
  }
}

class HandDetector {
  constructor(videoElement) {
    this.video = videoElement;
    this.detectedHands = []; 

    this.hands = new Hands({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    this.hands.setOptions({
      maxNumHands: 2, 
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(this.onResults.bind(this));

    const camera = new Camera(this.video.elt, {
      onFrame: async () => {
        await this.hands.send({image: this.video.elt});
      },
      width: 640,
      height: 480
    });
    camera.start();
  }

  onResults(results) {
    this.detectedHands = [];
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        const palmCenter = landmarks[9]; 
        let x = (1 - palmCenter.x) * width;
        let y = palmCenter.y * height;
        this.detectedHands.push({ x: x, y: y });
      }
    }
  }

  getHandPositions() {
    return this.detectedHands;
  }
}

// --- BOID CLASS ---
class Boid {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(4, 6)); 
    this.acceleration = createVector();
    this.maxForce = 0.2; 
    this.maxSpeed = 6;   
    this.r = 4;           
  }

  flock(boids, targets, isIdle) {
    let separation = this.separate(boids);
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let attraction = createVector(0, 0); 

    if (!isIdle && targets.length > 0) {
      let closestTarget = targets[0];
      let closestDist = p5.Vector.dist(this.position, closestTarget);

      for (let i = 1; i < targets.length; i++) {
        let d = p5.Vector.dist(this.position, targets[i]);
        if (d < closestDist) {
            closestDist = d;
            closestTarget = targets[i];
        }
      }

      attraction = this.seek(closestTarget);
      attraction.mult(1.5); 
    }

    separation.mult(2.0); 
    alignment.mult(1.0);  
    cohesion.mult(1.0);   
    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);
    this.applyForce(attraction);
  }

  applyForce(force) {
    this.acceleration.add(force);
  }
  update() {
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.acceleration.mult(0); 
  }
  show() {
    let hue = (frameCount * 0.5 + this.position.x / 2) % 360;
    let theta = this.velocity.heading(); 
    fill(hue, 80, 100); 
    noStroke();
    push(); 
    translate(this.position.x, this.position.y); 
    rotate(theta); 
    ellipse(0, 0, this.r * 4, this.r * 2);
    beginShape();
    vertex(-this.r * 2, 0);          
    vertex(-this.r * 3.5, -this.r);  
    vertex(-this.r * 3.5, this.r);   
    endShape(CLOSE);
    fill(0, 0, 100); 
    ellipse(this.r, -this.r * 0.5, 2, 2); 
    pop(); 
  }
  edges() {
    let buffer = 20; 
    if (this.position.x > width + buffer) this.position.x = -buffer;
    else if (this.position.x < -buffer) this.position.x = width + buffer;
    if (this.position.y > height + buffer) this.position.y = -buffer;
    else if (this.position.y < -buffer) this.position.y = height + buffer;
  }
  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }
  separate(boids) {
    let desiredSeparation = 25.0;
    let steer = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if ((d > 0) && (d < desiredSeparation)) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steer.div(count);
    }
    if (steer.mag() > 0) {
      steer.setMag(this.maxSpeed);
      steer.sub(this.velocity);
      steer.limit(this.maxForce);
    }
    return steer;
  }
  align(boids) {
    let neighborDist = 50;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if ((d > 0) && (d < neighborDist)) {
        sum.add(other.velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      sum.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce);
      return steer;
    } else {
      return createVector(0, 0);
    }
  }
  cohesion(boids) {
    let neighborDist = 50;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if ((d > 0) && (d < neighborDist)) {
        sum.add(other.position);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    } else {
      return createVector(0, 0);
    }
  }
}