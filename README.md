# Bubble Chat

Interactive Video Conferencing for Creatives  

Live at https://esz7923.imany.io/

Edward Zhou 10/2023

---

**Description:**  
Bubble Chat is an interactive and creative play on common video conferencing apps such as Zoom, Google Meet, FaceTime, etc. The app assigns a random, unique color to each user upon launch that serves as the visual palette.
The app allows users to join separate rooms with user-specified room keys. Within the rooms, users exist as bubbles with their video that can be moved around via mouse drag, which simulates a spring pulling on the user's video. 
Users can also connect with others in the room by clicking on their video, which adds a spring between the user's video and the other and allows the two users to hear each other's audio. Users and their connections form a fun, 
interactive physics world of particles interacting with each other via springs, which can be modified client-side by shift-clicking on videos to pin them in place. Users and their connections can also visualize social networks 
with exclusive interaction between connected users.

Each room also includes a collaborative whiteboard that each user can contribute to globally or clear locally. Users can modify the size of their brush and the lightness, but cannot modify their identifying color without
rejoining as a different client. The whiteboard of the room is the background of the physics world.


https://github.com/edwardszhou/bubble-chat/assets/123663456/9e603d98-0d70-443b-92d2-080ba4aa36db

---
**Motivation:**  
The motivation behind this project is simply to reimagine interactive virtual spaces in video calls and make it playful, contrasting with many of the more professional apps that already exist. I wanted to embrace the fun and
creativity possible between people while also providing full functionality in video call such that the interaction doesn't necessarily prevent communication. I thought spring physics was an interactive and exciting medium to
explore as well.
 
**Process:**  
Bubble Chat is a web application based on a Node.js server running on Express. The primary visual medium for the application is p5.js, which uses the toxiclibs.js library for soft body physics. Movement around the canvas is determined
in the p5 toxiclibs physics world, which connects to external HTML elements to make the video call functionality. Video-to-video call is implemented using SimplePeers and socket.io. Socket.io also controls all of the server-side
information storage and distribution such as users, user connections, user interactions, whiteboards, etc. The whiteboard is also created in p5.js using a separate p5 canvas.

Upon joining, the client requests a list of other particles, connections, and the whiteboard in the room. Particles representing each user are created and connected client-side in p5, and the whiteboard is also drawn. The client also connects
via simplepeers to other clients in the room to get their video, which is visually mapped to the particle in the p5 sketch. Actions such as drawing on the board, dragging your particle, connecting with others, etc. are communicated to
the server and to other clients in the room real-time via socket.io. Although all interactions besides video pinning and whiteboard clearing is communicated to every client in the room, physics worlds are still run client-side in
their p5 sketch, so users will see slightly different screens (also due to different window sizes).

**Next Steps:**  
The most obvious missing functionality is the ability to disconnect from people. I would also like to have a more dynamic whiteboard, potentially making it an SVG whiteboard or a dynamically cleared whiteboard (strokes clear when
no more clients are rendering it / everyone has client-side cleared the stroke or left the room). 
