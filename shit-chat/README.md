# Antigravity Shit-Chat Mobile Monitor

A real-time mobile interface for monitoring and interacting with your Antigravity sessions from your phone.

## Features
- **Real-time Monitoring**: See your chat session on your mobile device.
- **Remote Messaging**: Send messages directly from your phone.
- **Premium UI**: Modern dark-mode interface with glassmorphism.
- **Minimal Latency**: Powered by WebSockets and CDP.

## Setup & Usage

### 1. Restart Antigravity with Debugging
You must restart the Antigravity application with the remote debugging port enabled. 
Close Antigravity and run it again from your terminal:

```bash
antigravity . --remote-debugging-port=9000
```

### 2. Start the Monitor Server
In another terminal window, go to the `shit-chat` folder and start the server:

```bash
cd shit-chat
npm start
```

### 3. Access from Mobile
Find your computer's local IP address (e.g., `192.168.1.XX`).
Open your phone's browser and navigate to:

```
http://<your-local-ip>:3000
```

## Troubleshooting
- **Cannot connect?** Ensure your phone and computer are on the same Wi-Fi network.
- **Offline status?** Check if Antigravity is actually running on port 9000.
- **Doesn't send?** Make sure the Antigravity window is active and the chat input is visible.

---
*Inspired by Shit-Chat Mobile Monitor*
