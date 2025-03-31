import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
      this.onPrivateMessageCallback = () => {};
  }

  connect(userId,myToken) {
    // Establish socket connection
    this.socket = io("http://localhost:5000", {
      query: { userId },
      extraHeaders: {
        authorization: `bearer ${myToken}`,
      },
    });
    console.log(userId);
    // Authentication
    this.socket.emit("authenticate", userId);

    // Connection event listeners
    this.socket.on("connect", (socket) => {
      console.log(socket);
      console.log("Connected to socket server");
    });
    this.socket.on("private_message", (msg) => {
      console.log("Received private message:", msg);
      if (this.onPrivateMessageCallback) {
        this.onPrivateMessageCallback(msg);
      }
    });
    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    // Error handling
    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }
  onPrivateMessage(callback) {
      if (typeof callback === "function") {
        this.onPrivateMessageCallback = callback;
      } else {
        console.error("onPrivateMessage expects a function");
      }
  }

  sendPrivateMessage(senderId, receiverId, message) {
    this.socket.emit("private_message", {
      senderId,
      receiverId,
      message,
    });
  }
  searchUser(userId) {
    console.log("searched userId", userId);
    this.socket.emit("searchUser", userId);
  }
  onNewMessage(callback) {
    console.log("new msg", callback);
    this.socket.on("new_message", callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
