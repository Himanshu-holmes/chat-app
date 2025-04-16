import { useEffect, useRef, useState } from "react";

import socketService from "../services/socketService";






// Create socket outside component to avoid recreation on re-renders


const CallPage = () => {
    const socket = socketService.getSocket();
    console.log("socket", socket)
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const [userId, setUserId] = useState("");
    const [color, setColor] = useState("bg-blue-500");
    const [isConnected, setIsConnected] = useState(false);
const roomId = "roomId"
    // Handle socket connection events
    useEffect(() => {
        const handleConnect = () => {
            const id = socket.id || "";
            setUserId(id);
            setIsConnected(true);
            socket.emit("join-room", { roomId, userId: id } );
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        // If already connected when component mounts
        if (socket.connected) {
            handleConnect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
        };
    }, [roomId]);

    // Handle WebRTC signaling
    useEffect(() => {
        const handleOffer = async ({ offer, sender }) => {
            if (!localStreamRef.current) {
                try {
                    // Get media stream if not already acquired
                    navigator.mediaDevices
                        .getUserMedia({ video: true, audio: true })
                        .then((stream) => {
                            localStreamRef.current = stream;
                            if (localVideoRef.current) {
                                localVideoRef.current.srcObject = stream;
                            }
                        })
                        .catch((error) =>
                            console.error("Error accessing media devices:", error)
                        );
                } catch (error) {
                    console.error("Error accessing media devices:", error);
                    return;
                }
            }

            if (localStreamRef.current) {
                await processOffer(offer, sender, localStreamRef.current);
            }
        };

        const handleAnswer = async ({ answer }) => {
            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(
                        new RTCSessionDescription(answer)
                    );
                    console.log("Answer set successfully");
                } catch (error) {
                    console.error("Error setting remote description:", error);
                }
            }
        };

        const handleIceCandidate = async({ candidate }) => {
            if (peerConnectionRef.current) {
                try {
                  await peerConnectionRef.current.addIceCandidate(
                        new RTCIceCandidate(candidate)
                    );
                    console.log("ICE candidate added successfully");
                } catch (error) {
                    console.error("Error adding ICE candidate:", error);
                }
            }
        };

        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", handleIceCandidate);

        return () => {
            socket.off("offer", handleOffer);
            socket.off("answer", handleAnswer);
            socket.off("ice-candidate", handleIceCandidate);
        };
    }, [roomId]);



    // Clean up resources when component unmounts
    useEffect(() => {
        return () => {
            // Close peer connection
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }

            // Stop all tracks in the local stream
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
            }
        };
    }, []);

    const createPeerConnection = (
        stream,
        target
    ) => {
        const configuration = {
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
            ],
        };

        const peerConnection = new RTCPeerConnection(configuration);

        stream
            .getTracks()
            .forEach((track) => peerConnection.addTrack(track, stream));

        peerConnection.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams && event.streams[0]) {
                console.log("Received remote stream:", event.streams[0]);
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && target) {
                socket.emit("ice-candidate", {
                    candidate: event.candidate,
                    target,
                    roomId,
                });
            }
        };

        return peerConnection;
    };

    const startCall = async (target) => {
        try {
            // Reuse existing stream or get a new one
            if (!localStreamRef.current) {
                localStreamRef.current = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }
            }

            // Close existing peer connection if any
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            peerConnectionRef.current = createPeerConnection(
                localStreamRef.current,
                target
            );
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socket.emit("offer", { offer, target, roomId });
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    const processOffer = async (
        offer,
        sender,
        stream
    )=> {
        try {
            // Close existing peer connection if any
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            peerConnectionRef.current = createPeerConnection(stream, sender);
            await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(offer)
            );
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socket.emit("answer", { answer, target: sender, roomId });
        } catch (error) {
            console.error("Error processing offer:", error);
        }
    };
console.log("remoteVideoRef", remoteVideoRef.current)
    return (
        <div className="flex   items-center space-y-4 gap-10 ">
            <div
                className={`w-50vw  w-full flex  justify-center items-center ${color}`}
            >
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted // Mute local video to prevent feedback
                    className="w-[80vw]  bg-gray-800 rounded"
                />
            </div>
            <div className={`h-40 w-full flex  justify-center items-center ${color}`}>
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className=" bg-gray-800 rounded"
                />
            </div>
            <div className="flex space-x-4">
                <button
                    onClick={() => startCall("targetUserId")} // This should be dynamic in a real app
                    disabled={!isConnected}
                    className={`px-4 py-2 text-white rounded ${isConnected ? "bg-green-500 hover:bg-green-600" : "bg-gray-400"
                        }`}
                >
                    Start Call
                </button>
            </div>
            {!isConnected && (
                <p className="text-red-500">
                    Disconnected from server. Trying to reconnect...
                </p>
            )}
        </div>
    );
};

export default CallPage;
