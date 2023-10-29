let simplepeers = {};
let mystream;
var socket;

window.onload = () => {

    let button = document.getElementById('login-btn');
    let container = document.getElementById('login-content');

    let introSketch, callSketch;

    // opening animation delays
    setTimeout(loginFade, 250);
    setTimeout(loginFade2, 1000);

    // determines random color on load
    var color = Math.floor(Math.random() * 360);

    let video = document.getElementById('myvideo');
    let constraints = { audio: true, video: true };

    initializeControls();

    /**
     * Adds permanent event listeners to buttons and other elements
     */
    function initializeControls() {

      // event listener for joining room
      button.addEventListener('click', function() {
        let textField = document.getElementById('login-name');
        let roomField = document.getElementById('login-room');

        let name = textField.value;
        let room = roomField.value;

        // alerts if no name or room has been entered
        if(!name || !room) {
            alert('Please enter a name and room');
        } else {
            let introSketchElement = document.getElementsByClassName('p5Canvas')[0]

            // zooms in and out of intro screen, fades out of intro sketch
            container.style.animation = "expand 1.5s ease forwards";
            introSketchElement.style.zIndex = -1;
            introSketchElement.style.animation = "fade 1.5s ease forwards";

            // removes intro elements
            setTimeout(()=> {
                introSketch.remove();
                delete introSketch;
                roomField.value = '';
            }, 1500);

            // initializes WebRTC stuff and colors
            initializeCall(name, color, room);
            initializeControlColors(color, room);
        }

      });

      let toolBtn = document.getElementById('tool-btn');
      let muteBtn = document.getElementById('mute-btn');
      let leaveBtn = document.getElementById('leave-btn');

      let brushControls = document.getElementById('brush-controls');

      // toggle mute
      muteBtn.addEventListener('click', ()=> {
        muteBtn.firstChild.classList.toggle('fa-microphone');
        muteBtn.firstChild.classList.toggle('fa-microphone-slash');
        
        if(muteBtn.firstChild.classList.contains('fa-microphone')) {
          socket.emit('user-mute', false); // unmute
        } else {
          socket.emit('user-mute', true); // mute
        }
      }) 

      // toggle different tools
      toolBtn.addEventListener('click', ()=> {
        toolBtn.firstChild.classList.toggle('fa-hand-pointer');
        toolBtn.firstChild.classList.toggle('fa-pencil');
        
        if(toolBtn.firstChild.classList.contains('fa-hand-pointer')) {
          callSketch.controlling = true; // controlling mode
          brushControls.style.animation = 'shrink 0.6s ease forwards'; // disappear brush controls
          
        } else {
          callSketch.controlling = false; // draw mode
          brushControls.style.animation = 'popout 0.6s ease forwards'; // appear brush controls
        }
      }) 

      // leave call event listener
      leaveBtn.addEventListener('click', ()=> {
        document.body.style.animation = "fade 1s ease forwards"; // fades out of body screen
        setTimeout(leaveCall, 1000);
        setTimeout(loginFade, 1250);
        setTimeout(loginFade2, 1500);
      })

      let brushSizeSlider = document.getElementById('brush-size');
      let brushColSlider = document.getElementById('brush-col');

      // updates brush size upon user input, changes slider knob
      brushSizeSlider.addEventListener('input', ()=> {
        brushSizeSlider.style.setProperty('--sliderSize', brushSizeSlider.value + "px")
        callSketch.brushSize = brushSizeSlider.value;
      })

      // updates brush color upon user input, changes slider knob
      brushColSlider.addEventListener('input', ()=> {
        brushColSlider.style.setProperty('--thumbColor', "hsl(" + color + "deg, 100%, " + (100-brushColSlider.value) + "%)")
        callSketch.brushCol = (100-brushColSlider.value);
      })

      let infoBtn = document.getElementById('controls-info');
      let infoIcon = document.getElementById('info-icon');
      let infoParagraph = document.getElementById('info-paragraph');

      infoIcon.style.opacity = 1;
      infoParagraph.style.opacity = 0;

      // info popup interaction
      infoBtn.addEventListener('mouseenter', ()=> {
        infoBtn.style.width = '30vh';
        infoBtn.style.height = '40vh';

        infoIcon.style.opacity = 0;
        infoParagraph.style.opacity = 1;
      })
      infoBtn.addEventListener('mouseleave', ()=> {
        infoBtn.style.width = '6vh';
        infoBtn.style.height = '6vh';

        infoIcon.style.opacity = 1;
        infoParagraph.style.opacity = 0;
      })
    }

    /**
     * Initializes colors of UI based on random color, shows controls
     * 
     * @param {Number} color Hue value of HSB color
     * @param {String} room room key
     */
    function initializeControlColors(color, room) {

      // updates brush control colors
      document.getElementById('brush-controls').style.backgroundColor = "hsl(" + color + "deg, 100%, 70%)"
      for(let slider of document.getElementsByClassName('slider')) {
        slider.style.setProperty('--thumbColor', "hsl(" + color + "deg, 100%, 20%)")
        slider.style.setProperty('--thumbOutline', "hsl(" + color + "deg, 100%, 20%)")
      }

      document.getElementById('controls').style.display = 'flex'; // shows call controls

      // updates call control colors
      for(let btn of document.getElementsByClassName('control-btn')) {
        btn.style.animation = 'popout 0.8s ease 1s forwards';
        btn.style.backgroundColor = "hsl(" + color + "deg, 100%, 90%)";
        btn.style.color = "hsl(" + color + "deg, 100%, 20%)";

        btn.addEventListener('mouseenter', () => {
          btn.style.backgroundColor = "hsl(" + color + "deg, 100%, 20%)";
          btn.style.color = "hsl(" + color + "deg, 100%, 90%)";
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.backgroundColor = "hsl(" + color + "deg, 100%, 90%)";
          btn.style.color = "hsl(" + color + "deg, 100%, 20%)";
        });
      }

      let infoContainer = document.getElementById('info-panel');
      let infoBtn = document.getElementById('controls-info');
      let roomKeyDisp = document.getElementById('room-key-display');

      // updates info container colors and shows
      infoContainer.style.animation = 'fade 0.8s ease 1.5s reverse forwards';
      infoBtn.style.backgroundColor = "hsl(" + color + "deg, 100%, 20%)";
      infoBtn.style.color = "hsl(" + color + "deg, 100%, 90%)";
      roomKeyDisp.style.color = "hsl(" + color + "deg, 100%, 20%)"
      roomKeyDisp.textContent = "Room: " + room;

    }

    /**
     * Initializes colors of intro UI elements and shows
     */
    function loginFade() {
      let title = document.getElementById("title");
      let prompt = document.getElementById("prompt");
      
      title.style.color = "hsl(" + color + "deg, 100%, 40%)";
      button.style.backgroundColor = "hsl(" + color + "deg, 100%, 70%)";
      button.style.color = "hsl(" + color + "deg, 100%, 20%)";
      prompt.style.color = "hsl(" + color + "deg, 100%, 20%)";
      container.style.backgroundColor = "hsl(" + color + "deg, 100%, 90%)";

      // submit button
      button.addEventListener('mouseenter', ()=> {
          button.style.backgroundColor = "hsl(" + color + "deg, 100%, 20%)";
          button.style.color = "hsl(" + color + "deg, 100%, 95%)";
      })
      button.addEventListener('mouseleave', ()=> {
          button.style.backgroundColor = "hsl(" + color + "deg, 100%, 70%)";
          button.style.color = "hsl(" + color + "deg, 100%, 20%)";
      })

      container.style.animation = "popout 0.6s ease";
      container.style.transform = "scale(1)";
    }

    /**
     * Initializes colors of intro UI elements and shows, creates intro sketch
     */
    function loginFade2() {
      let nontitleContainer = document.getElementById('non-title-content');
      let opacity = 0;
      // fades in interactive elements
      let infoFadeIn = setInterval(()=> {
          if(opacity >= 1) {
              clearInterval(infoFadeIn);
          }
          nontitleContainer.style.opacity = opacity;
          opacity += 0.01;
      }, 10);
      introSketch = new p5(defIntroSketch(color));
      
    }

    /**
     * User leaves call, resets UI animations and displays
     */
    function leaveCall() {
      socket.disconnect(); // disconnects from socket
      socket = null;

      // removes peers
      for(let sid in simplepeers) {
        simplepeers[sid].simplepeer.destroy();
        delete simplepeers[sid];
      }

      // resets call UI elements
      document.body.style.animation = 'none';
      document.getElementById('controls').style.display = 'none';
      document.getElementById('usercanvas').style.display = 'none';
      for(let btn of document.getElementsByClassName('control-btn')) {
        btn.style.animation = 'none';
      }

      // resets call UI properties
      if(!callSketch.controlling) {
        callSketch.controlling = true;
        document.getElementById('brush-controls').style.animation = 'none';
        document.getElementById('tool-btn').firstChild.classList.toggle('fa-hand-pointer');
        document.getElementById('tool-btn').firstChild.classList.toggle('fa-pencil');
      }

      let infoContainer = document.getElementById('info-panel');
      infoContainer.style.opacity = 0;
      infoContainer.style.animation = 'none';

      container.style.animation = "none";
      container.style.transform = "scale(0)";
      document.getElementById('non-title-content').style.opacity = 0;

      // removes call sketch
      callSketch.remove();
      callSketch = null;

      // resets color
      color = Math.floor(Math.random() * 360);
    }

    /**
     * Initializes simplepeers, socketio, and call sketch, sets up user media
     * 
     * @param {String} name User name
     * @param {Number} color Hue of HSB color
     * @param {String} room room key
     */
    function initializeCall(name, color, room) {
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
          
            // sets up socket
            setupSocket(room);

            // Creates new call sketch, sets default values
            callSketch = new p5(defCallSketch(name, color));
            callSketch.controlling = true;
            callSketch.brushSize = 20;
            callSketch.brushCol = 20;

            let canvas = document.getElementById('usercanvas');
            canvas.style.display = 'block';
            canvas.style.animation = 'popout 0.8s ease 1.5s forwards';
        
          }).catch(function (err) {
            /* Handle the error */
            alert(err);
          });
    }

    /**
     * Draws circle overlay over user video
     */
    function draw() {
        let canvas = document.getElementById('usercanvas');
        let context = canvas.getContext("2d");
        context.globalCompositeOperation='source-over'; // draws base image
        context.drawImage(video,0,0);
        context.globalCompositeOperation='destination-in'; // draws mask
        
        context.beginPath();
        context.arc(canvas.width/2,canvas.height/2,canvas.height/2,0,Math.PI*2);
        context.closePath();
        context.fill();
      
        setTimeout(draw, 33);
    }

}

/**
 * Helper function to connect to socket and wrap socket functions
 * @param {String} room room key
 */
function setupSocket(room) {
  
    // connects to socket and immediately joins room
    socket = io.connect();
    socket.emit('join-room', room);

    /**
     * Confirms connection
     */
    socket.on('connect', function () {
      console.log("Connected As", socket.id);
      console.log('joining room ' + room);
    });  
  
    /**
     * Removes simplepeer upon peer disconnect
     */
    socket.on('peer-disconnect', function(data) {

      // finds simplepeer
      for (let sid in simplepeers) {
        if (simplepeers[sid].socket_id == data) {
          delete simplepeers[sid];
          // Removes video and canvas elements form page
          document.getElementById(data).remove();
          document.getElementById(data + "-canvas").remove();
        } 
      }			
    });	
  
    /**
     * Gets list of socket ids from server to connect to via SimplePeers
     */
    socket.on('listresults', (data) => {
      for (let sid of data) {
        if (sid != socket.id) {
          let simplepeer = new SimplePeerWrapper(true, sid, socket, mystream);
          simplepeers[sid] = simplepeer;
        }
      }
    });
  
    /**
     * Mutes/unmutes video based on specified socket id and value
     */
    socket.on('user-mute', (data) => {
      let video = document.getElementById(data.sid);
      video.muted = data.val;
    })
  
    /**
     * Communicates with peers using server as medium
     */
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
// Mostly written by Shawn Van Every
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

        ovideo.id = this.socket_id;
        ovideo.srcObject = stream;
        ovideo.muted = true;
        ovideo.hidden = true;
        ovideo.onloadedmetadata = function (e) {
          ovideo.play();
          let canvas = document.createElement('canvas');
          document.body.appendChild(canvas);
          canvas.id = ovideo.id + "-canvas";
          canvas.className = 'user-video';
          canvas.style.animation = 'popout 0.8s ease 1.5s forwards';
  
          draw(canvas.id, ovideo);
        };
  
        /**
         * Draws circle overlay over video
         * 
         * @param {String} canvasid id of HTML canvas object
         * @param {Object} video HTML video object
         * @returns 
         */
        function draw(canvasid, video) {
          let canvas = document.getElementById(canvasid);
          if(!canvas) return;

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
      });
  
      this.simplepeer.on('close', () => {
        console.log('Got close event');
        // Remove from the array of simplepeers
        let video = document.getElementById(this.socket_id);
        let canvas = document.getElementById(this.socket_id + "-canvas");

        // removes video and canvas from page
        if(video) 
          video.remove();
        if(canvas)
          canvas.remove();

        delete simplepeers[this.socket_id]
      });
  
      this.simplepeer.on('error', (err) => {
        console.log(err);

        let video = document.getElementById(this.socket_id);
        let canvas = document.getElementById(this.socket_id + "-canvas");

        if(video) 
          video.remove();
        if(canvas)
          canvas.remove();
      });
    }
  
    inputsignal(sig) {
      this.simplepeer.signal(sig);
    }
  
}			