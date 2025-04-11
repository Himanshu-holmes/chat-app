import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
      this.onPrivateMessageCallback = () => {};
      this.onUserStatusResponseCallback = ()=>{};
  }

  connect(myToken) {
    // Establish socket connection
    this.socket = io("http://localhost:5000", {
    
      extraHeaders: {
        authorization: `bearer ${myToken}`,
      },
    });
   
    // Authentication
    // this.socket.emit("authenticate", "");

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
    this.socket.on("user:status_res",(data)=>{
      console.log("user satus res",data)
      if (this.onUserStatusResponseCallback) {
        this.onUserStatusResponseCallback(data);
      }
    })
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
  onUserStatusResponse(callback){
    if (typeof callback === "function") {
      this.onUserStatusResponseCallback = callback;
    } else {
      console.error("onUserStatus expects a function");
    }
  }

  sendPrivateMessage(senderData, receiverData, message) {
    this.socket.emit("private_message", {
      sndData: senderData,
      rcvData:receiverData,
      message,
    });
  }
  sendSymmetricKey(selectedUsername,encryptedKey){
    this.socket.emit("symmetric_key_exchange", {
      to: selectedUsername,
      encryptedKey,
    });

  }
  getUserStatus(userId){
    this.socket.emit("user:status",userId);
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
