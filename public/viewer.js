const roomId = "room123";
const ws = new WebSocket("ws://localhost:3000");
let peerConnection;

ws.onopen = () => {
    console.log("WebSocket connected");

    // Join the room
    ws.send(JSON.stringify({ type: "joinRoom", roomId }));
};

ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "roomJoined") {
        console.log("Joined room:", data.roomId);
        console.log("Broadcaster ID:", data.broadcaster);
        // Create a PeerConnection and set up event handlers
        peerConnection = new RTCPeerConnection();

        const playButton = document.getElementById("playButton");
        const remoteVideo = document.getElementById("remoteVideo");

        playButton.addEventListener("click", () => {
            // Enable audio and start playback after user interaction
            remoteVideo.muted = false;
            remoteVideo.play().catch((error) => {
                console.error("Error playing video:", error);
            });
        });
        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            console.log("Received track:", event);
            if (event.streams.length > 0) {
                remoteVideo.srcObject = event.streams[0];
                remoteVideo.muted = true; // Initially muted to comply with autoplay restrictions
                remoteVideo.play().catch((error) => {
                    console.error("Error playing remote video:", error);
                });
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: "candidate",
                    target: data.broadcaster,
                    payload: event.candidate,
                    roomId
                }));
            }
        };
    }

    if (data.type === "offer") {
        console.log("Received offer from broadcaster:", data.from);

        // Set remote description and create an answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send the answer to the broadcaster
        ws.send(JSON.stringify({
            type: "answer",
            target: data.from,
            payload: answer,
            roomId
        }));
    }

    if (data.type === "candidate") {
        console.log("Received ICE candidate from broadcaster:", data.from);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.payload));
    }
};