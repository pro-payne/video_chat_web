(function () {
  "use strict";

  let code;

  const MESSAGE_TYPE = {
    SDP: "SDP",
    CANDIDATE: "CANDIDATE",
  };

  document.addEventListener("keyup", async (event) => {
    if (event.target.id === "chat-id") {
      const { value } = event.target;
      if (value.length > 8) {
        document.getElementById("start-button").disabled = false;
        code = value;
      } else {
        document.getElementById("start-button").disabled = true;
        code = null;
      }
    }
  });

  document.addEventListener("click", async (event) => {
    if (event.target.id === "start-button" && code) {
      startChat();
    }
  });

  // Create random chat ID
  

  /**
   * Removed await from the function navigator.mediaDevices, and used the then operation..
   */
  const startChat = async () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video:true,
        // { facingMode: "user" },
      })
      .then((stream) => {
        showChatRoom();

        const signaling = new WebSocket("wss://3c04e9e58902.ngrok.io");
        signaling.onopen = (event) => {
          createPeerConnection(stream, signaling);
        };
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const createPeerConnection = (stream, signaling) => {

    /**
     * Added free turn servers 
     */
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"],
        },
        {
          url: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
        {
          url: "turn:relay.backups.cz",
          credential: "webrtc",
          username: "webrtc",
        },
        {
          url: "turn:relay.backups.cz?transport=tcp",
          credential: "webrtc",
          username: "webrtc",
        },
      ],
    });

    peerConnection.onicecandidate = (iceEvent) => {
      console.log(iceEvent.candidate);
      if (iceEvent && iceEvent.candidate) {
        sendMessage(signaling, {
          message_type: MESSAGE_TYPE.CANDIDATE,
          content: iceEvent.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const video = document.getElementById("remote-view");
      if (!video.srcObject) {
        video.srcObject = event.streams[0];
      }
    };

    addMessageHandler(signaling, peerConnection);

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream));
    console.log(stream);
    document.getElementById("self-view").srcObject = stream;

    peerConnection
      .createOffer()
      .then((sdp) => {
        return peerConnection.setLocalDescription(sdp);
      })
      .then(() => {
        // Send SDP to remote media
        const sdp = peerConnection.localDescription;
        sendMessage(signaling, {
          message_type: MESSAGE_TYPE.SDP,
          content: sdp,
        });
      });

    return peerConnection;
  };

  const addMessageHandler = (signaling, peerConnection) => {
    signaling.onmessage = async (message) => {
      const data = JSON.parse(message.data);

      if (!data) {
        return;
      }

      /**
       * Replace peerConnection.addIceCandidate(content) with peerConnection.addIceCandidate(new RTCIceCandidate(content)) 
       * Also peerConnection.setRemoteDescription(content) with peerConnection.setRemoteDescription(new RTCSessionDescription(content))
       */
      const { message_type, content } = data;
      try {
        if (message_type === MESSAGE_TYPE.CANDIDATE && content) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(content));
        } else if (message_type === MESSAGE_TYPE.SDP) {
          if (content.type === "answer") {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(content)
            );
          } else {
            console.log("Unsupported SDP type.");
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
  };

  const sendMessage = (signaling, message) => {
    if (code) {
      signaling.send(
        JSON.stringify({
          ...message,
          code,
        })
      );
    }
  };

  const showChatRoom = () => {
    document.getElementById("start").style.display = "none";
    document.getElementById("chat-room").style.display = "block";
  };
})();
