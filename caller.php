<head>
    <meta charset="UTF-8">
    <title>VideoChatApp</title>
    <link rel="stylesheet" href="./style.css">
    <script src="./caller.js"></script>
</head>

<body>
    <div id="chat-room" style="display: none;">
        <div id="videos">
            <video id="self-view" autoplay></video>
            <video id="remote-view" autoplay></video>
        </div>
    </div>
    <h1>Hey, wanna make a Video Call?</h1>
    <div id="start">
        <input id="online-id" placeholder="Enter Chat ID" />
        <button id="start-button" disabled>Start Video Chat</button>
    </div>
</body>

</html>