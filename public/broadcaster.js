const roomId = "room123";
const ws = new WebSocket("ws://localhost:3000");
let peerConnections = {}; // Store peer connections for each viewer
let localStream;

ws.onopen = () => {
    console.log("WebSocket connected");

    // Create the room
    ws.send(JSON.stringify({ type: "createRoom", roomId }));
};

ws.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === "viewerJoined") {
        console.log("Viewer joined:", data.viewerId);

        // Create a new PeerConnection for the viewer
        const peerConnection = new RTCPeerConnection();
        peerConnections[data.viewerId] = peerConnection;
        console.log(localStream.getAudioTracks());
        // Add local tracks to the peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: "candidate",
                    target: data.viewerId,
                    payload: event.candidate,
                    roomId
                }));
            }
        };

        // Create an offer and send it to the viewer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        ws.send(JSON.stringify({
            type: "offer",
            target: data.viewerId,
            payload: offer,
            roomId
        }));
    }

    if (data.type === "answer") {
        console.log("Received answer from viewer:", data.from);
        const peerConnection = peerConnections[data.from];
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload));
        }
    }

    if (data.type === "candidate") {
        console.log("Received ICE candidate from viewer:", data.from);
        const peerConnection = peerConnections[data.from];
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.payload));
        }
    }
};

// Get local media
async function startBroadcast() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localVideo = document.getElementById("localVideo");
    localVideo.srcObject = localStream;
}

startBroadcast();