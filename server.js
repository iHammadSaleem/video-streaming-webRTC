const express = require("express");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// Serve static files from the "public" folder
app.use(express.static("public"));

// WebSocket server setup
const wss = new WebSocket.Server({ noServer: true });

const clients = {};
const rooms = {};

// WebSocket connection handler
wss.on("connection", (ws, req) => {
    const userId = uuidv4();
    clients[userId] = ws;

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        const { type, roomId, target, payload } = data;

        if (type === "createRoom") {
            rooms[roomId] = { broadcaster: userId, viewers: [] };
            ws.send(JSON.stringify({ type: "roomCreated", roomId, userId }));
        }

        if (type === "joinRoom" && roomId && rooms[roomId]) {
            const room = rooms[roomId];
            room.viewers.push(userId);
            ws.send(JSON.stringify({ type: "roomJoined", roomId, broadcaster: room.broadcaster }));
            const broadcasterWs = clients[room.broadcaster];
            if (broadcasterWs) {
                broadcasterWs.send(JSON.stringify({ type: "viewerJoined", viewerId: userId }));
            }
        }

        if (type === "offer" || type === "answer" || type === "candidate") {
            const targetWs = clients[target];
            if (targetWs) {
                targetWs.send(JSON.stringify({ type, payload, from: userId }));
            }
        }
    });

    ws.on("close", () => {
        delete clients[userId];
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.broadcaster === userId) {
                delete rooms[roomId];
            } else {
                room.viewers = room.viewers.filter((viewerId) => viewerId !== userId);
            }
        }
    });
});

// Upgrade HTTP server to WebSocket
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Access Broadcaster: http://localhost:${PORT}/index.html`);
    console.log(`Access Viewer: http://localhost:${PORT}/viewer.html`);
});

server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    });
});
