import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const VideoCallPage: React.FC = () => {
  const { roomId }   = useParams<{ roomId: string }>();
 
  const { user: authUser } = useAuth();
  const navigate     = useNavigate();

  // Refs
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef      = useRef<Socket | null>(null);
  const peerRef        = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // State
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connected, setConnected]       = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [joining, setJoining]           = useState(true);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    startCall();
    return () => cleanup();
  }, []);

  const startCall = async () => {
    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Connect socket
      socketRef.current = io(SOCKET_URL, { withCredentials: true });

      socketRef.current.on('connect', () => {
        socketRef.current?.emit('join-room', {
          roomId,
          userId:   authUser?._id,
          userName: authUser?.name,
        });
        setJoining(false);
        toast.success('Joined room!');
      });

      // Existing users in room
      socketRef.current.on('existing-users', async (users: any[]) => {
        if (users.length > 0) {
          setParticipants(users.map(u => u.userName));
          await createOffer(users[0].socketId);
        }
      });

      // New user joined
      socketRef.current.on('user-joined', ({ socketId, userName }: any) => {
        setParticipants(prev => [...prev, userName]);
        toast.success(`${userName} joined the call`);
      });

      // Receive offer
      socketRef.current.on('offer', async ({ from, offer }: any) => {
        await createAnswer(from, offer);
      });

      // Receive answer
      socketRef.current.on('answer', async ({ answer }: any) => {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        setConnected(true);
      });

      // ICE candidates
      socketRef.current.on('ice-candidate', async ({ candidate }: any) => {
        try {
          await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      });

      // User left
      socketRef.current.on('user-left', ({ socketId }: any) => {
        setConnected(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        toast.error('Other participant left the call');
      });

      // Remote media toggle
      socketRef.current.on('user-toggle-media', ({ type, enabled }: any) => {
        toast(`Remote ${type} ${enabled ? 'enabled' : 'disabled'}`);
      });

    } catch (err) {
      toast.error('Could not access camera/microphone');
      navigate(-1);
    }
  };

  const createPeer = (targetSocketId: string) => {
    const peer = new RTCPeerConnection(iceServers);
    peerRef.current = peer;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      peer.addTrack(track, localStreamRef.current!);
    });

    // Remote stream
    peer.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      setConnected(true);
    };

    // ICE
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('ice-candidate', {
          to: targetSocketId,
          candidate: e.candidate,
        });
      }
    };

    return peer;
  };

  const createOffer = async (targetSocketId: string) => {
    const peer  = createPeer(targetSocketId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketRef.current?.emit('offer', { to: targetSocketId, offer });
  };

  const createAnswer = async (targetSocketId: string, offer: RTCSessionDescriptionInit) => {
    const peer = createPeer(targetSocketId);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socketRef.current?.emit('answer', { to: targetSocketId, answer });
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
      socketRef.current?.emit('toggle-media', { roomId, type: 'audio', enabled: track.enabled });
    }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
      socketRef.current?.emit('toggle-media', { roomId, type: 'video', enabled: track.enabled });
    }
  };

  const endCall = () => {
    socketRef.current?.emit('leave-room', { roomId });
    cleanup();
    navigate(-1);
    toast.success('Call ended');
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();
    socketRef.current?.disconnect();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-white font-medium">Video Call — Room: {roomId?.slice(0, 8)}...</h1>
        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <Users size={16} />
          <span>{participants.length + 1} participant(s)</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 flex items-center justify-center p-6">
        {joining ? (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white mx-auto mb-4"></div>
            <p>Joining room...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
            {/* Local video */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                You ({authUser?.name})
              </div>
              {!videoEnabled && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                  <VideoOff size={40} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Remote video */}
            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!connected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Users size={40} className="mx-auto mb-2" />
                    <p className="text-sm">Waiting for participant...</p>
                  </div>
                </div>
              )}
              {connected && (
                <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {participants[0] || 'Participant'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-5">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-colors ${
              audioEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {audioEnabled ? <Mic size={20} className="text-white" /> : <MicOff size={20} className="text-white" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              videoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {videoEnabled ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
          </button>

          <button
            onClick={endCall}
            className="p-4 bg-red-600 hover:bg-red-500 rounded-full transition-colors"
          >
            <PhoneOff size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};