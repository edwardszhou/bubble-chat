var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {

});


const https = require('https');
const fs = require('fs'); // Using the filesystem module

const credentials = {
  key: fs.readFileSync('/etc/letsencrypt/live/esz7923.imany.io/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/esz7923.imany.io/fullchain.pem')
};

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(443, () => {
        console.log('server has started on port 443')
    });

var io = require('socket.io')(httpsServer);

// array of objects {p1id: [particle_1_id], p2id: [particle_2_id]} storing connections between particles
let connections = [];

// dictionary of arrays of line drawing objects{x1: [x1], y1: [y1], x2: [x2], y2: [y2], col: [hsb-color-hue] shade: [hsb-color-brightness], weight: [line-weight]}
// dictionary key: room code, value: array of lines
let whiteboardStrokes = {};

// dictionary of user objects {particle: [particle-object], id: [particle-object.id], muted: [isMuted]}
// dictionary key: user socket.id, value: user object
let users = {};

// dictionary key: user socket.id, value: room code (str)
let rooms = {};

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection', 
	// We are given a websocket object in our function
	function (socket) {
		console.log("We have a new client: " + socket.id);

        // Client immediately calls join-room upon connection
        socket.on('join-room', function(data) {
            // data: (str) room code, client joins room and stores in rooms
            rooms[socket.id] = data; 
            socket.join(data);

            // initializes whiteboard for client room if doesn't exist
            if(!whiteboardStrokes[rooms[socket.id]]) {
                whiteboardStrokes[rooms[socket.id]] = [];
            }

            let roomUsers = {}; // get users in client room
            let roomSids = []; // get socket ids of users in client room

            for(let sid in users) {
                if(rooms[sid] == rooms[socket.id] && sid != socket.id) { // gets every user in same room as client, not including self
                    roomSids.push(sid);
                    roomUsers[sid] = users[sid];
                }
            }

            // emits list of socket ids for client to connect to via simplepeers
            socket.emit('listresults', roomSids); 

            // emits list of particles, connections, and whiteboard for client's sketch
            socket.emit('load-particles', {users: roomUsers, connections: connections, whiteboard: whiteboardStrokes[rooms[socket.id]]});

        });

        socket.on('add-particle', function(data) {
            users[socket.id] = {particle: data, id: data.id, muted: false};
            console.log('adding particle to: ' + rooms[socket.id]);
            socket.to(rooms[socket.id]).emit('add-particle', {particle: data, sid: socket.id});
            
        });

        socket.on('mouse-on', function(data) {
            socket.to(rooms[socket.id]).emit('mouse-on', data);
        })
        socket.on('mouse-off', function(data) {
            socket.to(rooms[socket.id]).emit('mouse-off', data);
        })
        socket.on('mouse-move', function(data) {
            socket.to(rooms[socket.id]).emit('mouse-move', data);
        })
        

        socket.on('signal', (to, from, data) => {
            console.log("SIGNAL");
            if (users[to]) {
                console.log("Found Peer, sending signal");
                io.to(to).emit('signal', to, from, data);

            } else {
                console.log("never found peer");
            }
        });

        socket.on('particle-connection', function(data) {
            console.log('connecting');
            connections.push(data);

            let pid = users[socket.id].particle.id;
            for(let connection of connections) {
                if(connection.p1id == pid) {
                    for(let sid in users) {
                        if(users[sid].particle.id == connection.p2id) {
                            io.to(socket.id).emit('user-mute', {sid: sid, val: users[sid].muted});
                            io.to(sid).emit('user-mute', {sid: socket.id, val: users[socket.id].muted});
                            break;
                        }
                    }
                } else if(connection.p2id == pid ) {
                    for(let sid in users) {
                        if(users[sid].particle.id == connection.p1id) {
                            io.to(socket.id).emit('user-mute', {sid: sid, val: users[sid].muted});
                            io.to(sid).emit('user-mute', {sid: socket.id, val: users[socket.id].muted});
                            break;
                        }
                    }
                }
            }
            socket.to(rooms[socket.id]).emit('particle-connection', data);
        })

        socket.on('user-mute', function(data) {
            users[socket.id].muted = data;

            let pid = users[socket.id].particle.id;
            for(let connection of connections) {
                if(connection.p1id == pid) {
                    for(let sid in users) {
                        if(users[sid].particle.id == connection.p2id) {
                            io.to(sid).emit('user-mute', {sid: socket.id, val: data});
                            break;
                        }
                    }
                } else if(connection.p2id == pid ) {
                    for(let sid in users) {
                        if(users[sid].particle.id == connection.p1id) {
                            io.to(sid).emit('user-mute', {sid: socket.id, val: data});
                            break;
                        }
                    }
                }
            }
        })

        socket.on('whiteboard-stroke', function(data) {
            whiteboardStrokes[rooms[socket.id]].push(data);
            socket.to(rooms[socket.id]).emit('whiteboard-stroke', data);
        })

        socket.on('request-whiteboard', function() {
            console.log('requested whiteboard ');
            socket.emit('request-whiteboard', whiteboardStrokes[rooms[socket.id]]);
        })

		socket.on('disconnect', function() {
			console.log("Client has disconnected " + socket.id);

            let particleId;
            if(users[socket.id]) {
                particleId = users[socket.id].id;
                delete users[socket.id];
            }

            for(let i = connections.length-1; i >= 0; i--) {
                let connection = connections[i];
                if(particleId == connection.p1id || particleId == connection.p2id) {
                    connections.splice(i,1);
                }
            }

            socket.to(rooms[socket.id]).emit('remove-particle', particleId);
            socket.to(rooms[socket.id]).emit('peer-disconnect', socket.id);

            delete rooms[socket.id];
		});
	}
);
