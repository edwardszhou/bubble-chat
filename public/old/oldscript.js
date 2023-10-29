let simplepeers = {};
let mystream;
var socket;

window.onload = () => {

  let video = document.getElementById('myvideo');
  let constraints = { audio: true, video: true };

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    /* Use the stream */

    // Attach to our video object
    video.srcObject = stream;
    mystream = stream;

    // Wait for the stream to load enough to play
    video.onloadedmetadata = function (e) {
      video.play();
      draw();
    };
  
    setupSocket();
    let p5sketch = new p5(sketch);

  }).catch(function (err) {
    /* Handle the error */
    alert(err);
  });

  

}

function draw() {
  let canvas = document.getElementById('usercanvas');
  let context = canvas.getContext("2d");
  context.globalCompositeOperation='source-over';
  context.drawImage(video,0,0);
  context.globalCompositeOperation='destination-in';
  
  context.beginPath();
  context.arc(canvas.width/2,canvas.height/2,canvas.height/2,0,Math.PI*2);
  context.closePath();
  context.fill();

  setTimeout(draw, 33);
}

function setupSocket() {

  socket = io.connect();

  socket.on('connect', function () {
    console.log("Connected As", socket.id);
    socket.emit('list');
  });  

  socket.on('peer-disconnect', function(data) {
    console.log("simplepeer has disconnected " + data);
    for (let sid in simplepeers) {
      if (simplepeers[sid].socket_id == data) {
        console.log("Removing simplepeer: " + sid);
        delete simplepeers[sid];
        // Should also remove video from page
        document.getElementById(data).remove();
        document.getElementById(data + "-canvas").remove();
      } 
    }			
  });	


  socket.on('listresults', (data) => {
    for (let sid of data) {
      if (sid != socket.id) {
        let simplepeer = new SimplePeerWrapper(true, sid, socket, mystream);
        simplepeers[sid] = simplepeer;
      }
    }
  });



  socket.on('signal', (to, from, data) => {
    console.log("Got a signal from the server: ", to, from, data);
    if (to != socket.id) {
      console.log("Socket IDs don't match");
    }

    if (simplepeers[from]) {
      console.log('found simple peer object');
      simplepeers[from].inputsignal(data);
    } else {
      console.log("Never found right simplepeer object");
      let simplepeer = new SimplePeerWrapper(false, from, socket, mystream);
      simplepeers[from] = simplepeer;
      simplepeer.inputsignal(data);
    }

  });
}

// A wrapper for simplepeer as we need a bit more than it provides
class SimplePeerWrapper {

  constructor(initiator, socket_id, socket, stream) {
    this.simplepeer = new SimplePeer({
      initiator: initiator,
      trickle: false,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    // Their socket id, our unique id for them
    this.socket_id = socket_id;

    // Socket.io Socket
    this.socket = socket;

    // Our video stream - need getters and setters for this
    this.stream = stream;

    // simplepeer generates signals which need to be sent across socket
    this.simplepeer.on('signal', data => {
      this.socket.emit('signal', this.socket_id, this.socket.id, data);
    });

    // When we have a connection, send our stream
    this.simplepeer.on('connect', () => {
      console.log(this.simplepeer);
      console.log('CONNECTED');
      this.simplepeer.addStream(stream);
      console.log("Send our stream");
    });

    // Stream coming in to us
    this.simplepeer.on('stream', stream => {
      console.log('Incoming Stream');

      // This should really be a callback
      // Create a video object
      let ovideo = document.createElement("VIDEO");
      if(this.simplepeer.initiator == true) {
        ovideo.id = this.socket_id;
      } else {
        ovideo.id = this.socket_id;
      }
      ovideo.srcObject = stream;
      ovideo.muted = true;
      ovideo.hidden = true;
      ovideo.onloadedmetadata = function (e) {
        ovideo.play();
        let canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        canvas.id = ovideo.id + "-canvas";
        canvas.className = 'user-video';

        draw(canvas.id, ovideo);
      };

      function draw(canvasid, video) {
        let canvas = document.getElementById(canvasid);
        let context = canvas.getContext("2d");
        canvas.width = 640;
        canvas.height = 480;

        context.globalCompositeOperation = 'source-over';
        context.scale(640 / video.videoWidth, 480 / video.videoHeight);
        context.drawImage(video, 0, 0);
        context.globalCompositeOperation = 'destination-in';

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2, canvas.height / 2, 0, Math.PI * 2);
        context.closePath();
        context.fill();

        setTimeout(()=> {
          draw(canvasid, video)}
          , 33);
      }


      document.body.appendChild(ovideo);
      console.log(ovideo);
    });

    this.simplepeer.on('close', () => {
      console.log('Got close event');
      // Should probably remove from the array of simplepeers
      delete simplepeers[this.socket_id]
    });

    this.simplepeer.on('error', (err) => {
      console.log(err);
    });
  }

  inputsignal(sig) {
    this.simplepeer.signal(sig);
  }

}			