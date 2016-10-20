# networked-physics
Demonstration of networked physics engine

There is a client and server component to this project. The server uses socket IO to run a headless webGL physics engine and returns its calculation of the two independant inputs and object positions to the client. The clients run their own simulation of physics/inputs. The final implementation will support entity interpolation based on the valve paper on [Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking). Based on the work of [underscorediscovery](https://github.com/underscorediscovery/realtime-multiplayer-in-html5)

## Development
To develop, install deps
``` npm i ```
and run
``` npm run start ```
this will launch the node server with webgl shims etc. as well as the http server for clients. To test multiplay, open up two browser window pages and move the figures around with W, A, S, D, the changes for each player should translate onto the other player's screen

## TODO
- Entity interpolation
- Install scripts
- Deploy socket.io server, static server
- Optimizations
