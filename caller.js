(function () {
  "use strict";

  let code;

  const MESSAGE_TYPE = {
    SDP: "SDP",
    CANDIDATE: "CANDIDATE",
  };

  document.addEventListener("keyup", async (event) => {
    if (event.target.id === "online-id") {
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
      goOnline();
    }
  });
  function randomChatId() {
    const id =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const inputElement = document.getElementById("chat-id");
    inputElement.value = id;
    code = id;
    document.getElementById("start-button").disabled = false;
  }

  const interval = setInterval(() => {
    const inputElement = document.getElementById("chat-id");
    if (inputElement !== null) {
      clearInterval(interval);
      randomChatId();
    }
  }, 500);

  const goOnline = async () => {
    const stream = await navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
        //{ facingMode: "user" },
      })
      .then((stream) => {
        showChatRoom();

        const signaling = new WebSocket("wss://3c04e9e58902.ngrok.io");

        signaling.onopen = (event) => {
          const peerConnection = createPeerConnection(signaling);
          sendMessage(signaling, {
            message_type: "registration",
            content: "register",
          });
          addMessageHandler(signaling, peerConnection);
          stream
            .getTracks()
            .forEach((track) => peerConnection.addTrack(track, stream));
          document.getElementById("self-view").srcObject = stream;
        };
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const createPeerConnection = (signaling) => {
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
    return peerConnection;
  };

  const addMessageHandler = (signaling, peerConnection) => {
    signaling.onmessage = async (message) => {
      const data = JSON.parse(message.data);

      if (!data) {
        return;
      }

      const { message_type, content } = data;
      try {
        if (message_type === MESSAGE_TYPE.CANDIDATE && content) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(content));
        } else if (message_type === MESSAGE_TYPE.SDP) {
          if (content.type === "offer") {
            peerConnection
              .setRemoteDescription(new RTCSessionDescription(content))
              .then(() => {
                return peerConnection.createAnswer();
              })
              .then((answer) => {
                return peerConnection.setLocalDescription(answer);
              })
              .then(() => {
                sendMessage(signaling, {
                  message_type: MESSAGE_TYPE.SDP,
                  content: peerConnection.localDescription,
                });
              });
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
