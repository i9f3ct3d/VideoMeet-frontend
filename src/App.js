import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import SimplePeer from "simple-peer";
import { CopyToClipboard } from "react-copy-to-clipboard"
import "./App.css";
const socket = io.connect(process.env.REACT_APP_SOCKET_API);

function App() {
  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const connectionRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [caller, setCaller] = useState(null);
  const [name, setName] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [idToCall, setIdToCall] = useState("")

  const [isReceivingCall, setIsReceivingCall] = useState(false);
  // const [isCallAccepted, setIsCallAccepted] = useState(false);
  // const [isCallEnded, setIsCallEnded] = useState(false);
  const [isCallOnGoing, setIsCallOnGoing] = useState(false)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        myVideo.current.srcObject = stream
        setStream(stream);
      });

    socket.on("socketId", (id) => {
      setSocketId(id);
    });

    socket.on("callUser", (data) => {
      console.log('call coming');
      setIsReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  // useEffect(() => {
  //   if(stream){
      
  //   }
  // },[stream])

  const callUser = (id) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: socketId,
        name: name,
      });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    socket.on("callAccepted", (signal) => {
      // setIsCallAccepted(true);
      setIsCallOnGoing(true)
      peer.signal(signal);
    });
    
    connectionRef.current = peer;
  };


  const answerCall = () => {
    // setIsCallAccepted(true);
    setIsReceivingCall(false)
    setIsCallOnGoing(true)
    // setIsCallEnded(false)
    
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", {
        to: caller,
        signal: data,
      });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    socket.emit('callEnd', {
      coCaller : caller
    })
    setIsCallOnGoing(false)
    // setIsCallAccepted(false)
    // setIsCallEnded(true);
    connectionRef.current.destroy();
    connectionRef.current = null;
  };

  useEffect(() => {
    socket.on('call End',() => {
      setIsCallOnGoing(false)
    })
  },[])

  return (
    <div className="App">
      <h1>VideoMeet</h1>
      <div className="video__div">
        <video style = {{width : '300px'}} playsInline muted ref={myVideo} autoPlay />
      </div>
      {isCallOnGoing && (
        <video style = {{width : '300px'}} ref={userVideo} playsInline autoPlay />
      )}
      <input
        value={name}
				onChange={(e) => setName(e.target.value)}
				style={{ marginBottom: "20px" }}
      />
      {/* <CopyToClipboard text={socketId} style={{ marginBottom: "2rem" }}> */}
					<button onClick={() => {
            navigator.clipboard.writeText(socketId)
          }}  variant="contained">
						Copy ID
					</button>
				{/* </CopyToClipboard> */}
        <input
          placeholder="id to call"
          value={idToCall}
					onChange={(e) => setIdToCall(e.target.value)}
        />
        <div className="call-button">
					{isCallOnGoing ? (
						<button variant="contained" color="secondary" onClick={leaveCall}>
							End Call
						</button>
					) : (
						<button color="primary" aria-label="call" onClick={() => callUser(idToCall)}>
							call
						</button>
					)}
					{idToCall}
				</div>
        {isReceivingCall ? (
						<div className="caller">
						<h1 >{name} is calling...</h1>
						<button variant="contained" color="primary" onClick={answerCall}>
							Answer
						</button>
					</div>
				) : null}
        <button onClick={() => {
          console.log(connectionRef.current.destroyed)
        }}>IS PEER DESTROYED</button>
    </div>
  );
}

export default App;
