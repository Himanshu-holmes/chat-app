// SERVER-SIDE (Node.js with Socket.IO)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store user public keys (in-memory for simplicity)
const userPublicKeys = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // User registers with their public key
  socket.on('register', ({ username, publicKey }) => {
    console.log(`${username} registered with public key`);
    userPublicKeys[username] = publicKey;
    socket.username = username;
    
    // Notify everyone about online users and their public keys
    io.emit('users_update', userPublicKeys);
  });
  
  // Handle encrypted message - server just passes it along
  socket.on('send_message', ({ to, encryptedMessage, from }) => {
    console.log(`Encrypted message from ${from} to ${to}`);
    // Server can't read the content - just routes the encrypted message
    io.emit('receive_message', {
      to,
      encryptedMessage,
      from
    });
  });
  
  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(`${socket.username} disconnected`);
      delete userPublicKeys[socket.username];
      io.emit('users_update', userPublicKeys);
    }
  });
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});

// CLIENT-SIDE (React with Socket.IO client)
// CryptoService.js - Handles encryption/decryption
export class CryptoService {
  constructor() {
    this.keyPair = null;
    this.publicKeyJwk = null;
    this.privateKeyJwk = null;
    this.symmetricKeys = {}; // Store symmetric keys for each conversation
  }

  async init() {
    // Generate our key pair
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    // Export keys in JWK format
    this.publicKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.publicKey
    );
    
    this.privateKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.privateKey
    );
    
    return this.publicKeyJwk;
  }

  async createSymmetricKey(recipient) {
    // Generate a one-time symmetric key for this conversation
    const symmetricKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );

    // Store the key for this recipient
    this.symmetricKeys[recipient] = symmetricKey;
    
    // Export the symmetric key
    const exportedKey = await window.crypto.subtle.exportKey(
      "raw",
      symmetricKey
    );
    
    return exportedKey;
  }

  async encryptSymmetricKey(symmetricKey, recipientPublicKeyJwk) {
    // Import recipient's public key
    const recipientPublicKey = await window.crypto.subtle.importKey(
      "jwk",
      recipientPublicKeyJwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );
    
    // Encrypt the symmetric key with recipient's public key
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      recipientPublicKey,
      symmetricKey
    );
    
    return encryptedKey;
  }
  
  async decryptSymmetricKey(encryptedSymmetricKey) {
    // Import our private key if needed
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      this.privateKeyJwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["decrypt"]
    );
    
    // Decrypt the symmetric key
    const symmetricKey = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encryptedSymmetricKey
    );
    
    return symmetricKey;
  }
  
  async importSymmetricKey(keyData, sender) {
    // Import the symmetric key for use
    const symmetricKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );
    
    // Store it for this conversation
    this.symmetricKeys[sender] = symmetricKey;
  }
  
  async encryptMessage(message, recipient) {
    let symmetricKey = this.symmetricKeys[recipient];
    
    // Generate IV (initialization vector)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Convert message to ArrayBuffer
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);
    
    // Encrypt the message with the symmetric key
    const encryptedMessage = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      symmetricKey,
      messageData
    );
    
    // Combine IV and encrypted message
    const result = {
      iv: Array.from(new Uint8Array(iv)),
      data: Array.from(new Uint8Array(encryptedMessage))
    };
    
    return result;
  }
  
  async decryptMessage(encryptedObj, sender) {
    const symmetricKey = this.symmetricKeys[sender];
    
    // Convert back to ArrayBuffer
    const iv = new Uint8Array(encryptedObj.iv);
    const encryptedData = new Uint8Array(encryptedObj.data);
    
    // Decrypt the message
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      symmetricKey,
      encryptedData
    );
    
    // Convert decrypted data back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }
}

// ChatApp.js - Main React component
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { CryptoService } from './CryptoService';

const socket = io.connect('http://localhost:3001');
const cryptoService = new CryptoService();

function ChatApp() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [keyExchanges, setKeyExchanges] = useState({});
  
  useEffect(() => {
    if (isRegistered) {
      // Listen for incoming messages
      socket.on('receive_message', async (data) => {
        // Only process messages intended for this user
        if (data.to === username) {
          try {
            // Check if this is a key exchange message
            if (data.encryptedMessage.type === 'KEY_EXCHANGE') {
              // Decrypt the symmetric key
              const decryptedKeyData = await cryptoService.decryptSymmetricKey(
                new Uint8Array(data.encryptedMessage.encryptedKey)
              );
              
              // Import the symmetric key
              await cryptoService.importSymmetricKey(decryptedKeyData, data.from);
              
              // Mark key exchange as complete
              setKeyExchanges(prev => ({
                ...prev,
                [data.from]: true
              }));
              
              return;
            }
            
            // Regular message - decrypt it
            const decryptedMessage = await cryptoService.decryptMessage(
              data.encryptedMessage,
              data.from
            );
            
            setMessages(prevMessages => [
              ...prevMessages,
              { text: decryptedMessage, from: data.from, to: data.to }
            ]);
          } catch (error) {
            console.error('Error decrypting message:', error);
          }
        }
      });
      
      // Listen for user updates
      socket.on('users_update', (updatedUsers) => {
        setUsers(updatedUsers);
      });
    }
    
    return () => {
      socket.off('receive_message');
      socket.off('users_update');
    };
  }, [username, isRegistered]);
  
  const registerUser = async () => {
    if (username.trim() === '') return;
    
    try {
      // Initialize crypto service and get public key
      const publicKey = await cryptoService.init();
      
      // Register with the server
      socket.emit('register', { username, publicKey });
      setIsRegistered(true);
    } catch (error) {
      console.error('Error during registration:', error);
    }
  };
  
  const initiateKeyExchange = async (recipient) => {
    try {
      // Create a new symmetric key for this conversation
      const symmetricKey = await cryptoService.createSymmetricKey(recipient);
      
      // Encrypt the symmetric key with recipient's public key
      const encryptedKey = await cryptoService.encryptSymmetricKey(
        symmetricKey,
        users[recipient]
      );
      
      // Send the encrypted key to the recipient
      socket.emit('send_message', {
        to: recipient,
        encryptedMessage: {
          type: 'KEY_EXCHANGE',
          encryptedKey: Array.from(new Uint8Array(encryptedKey))
        },
        from: username
      });
      
      // Mark key exchange as initiated
      setKeyExchanges(prev => ({
        ...prev,
        [recipient]: true
      }));
    } catch (error) {
      console.error('Error during key exchange:', error);
    }
  };
  
  const sendMessage = async () => {
    if (message.trim() === '' || !selectedUser) return;
    
    try {
      // Check if we have exchanged keys with this user
      if (!keyExchanges[selectedUser]) {
        await initiateKeyExchange(selectedUser);
      }
      
      // Encrypt the message
      const encryptedMessage = await cryptoService.encryptMessage(message, selectedUser);
      
      // Send the encrypted message
      socket.emit('send_message', {
        to: selectedUser,
        encryptedMessage,
        from: username
      });
      
      // Add message to local state
      setMessages(prevMessages => [
        ...prevMessages,
        { text: message, from: username, to: selectedUser }
      ]);
      
      // Clear input
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const selectUser = (user) => {
    setSelectedUser(user);
    
    // Initiate key exchange if not already done
    if (user !== username && !keyExchanges[user]) {
      initiateKeyExchange(user);
    }
  };
  
  return (
    <div className="chat-app">
      {!isRegistered ? (
        <div className="register-form">
          <h2>Register to Chat</h2>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={registerUser}>Register</button>
        </div>
      ) : (
        <div className="chat-container">
          <div className="users-list">
            <h3>Online Users</h3>
            <ul>
              {Object.keys(users)
                .filter(user => user !== username)
                .map(user => (
                  <li 
                    key={user} 
                    className={selectedUser === user ? 'selected' : ''}
                    onClick={() => selectUser(user)}
                  >
                    {user}
                  </li>
                ))}
            </ul>
          </div>
          
          <div className="messages-container">
            <div className="messages">
              {messages
                .filter(msg => 
                  (msg.from === username && msg.to === selectedUser) || 
                  (msg.from === selectedUser && msg.to === username)
                )
                .map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message ${msg.from === username ? 'sent' : 'received'}`}
                  >
                    <span>{msg.text}</span>
                  </div>
                ))}
            </div>
            
            <div className="message-input">
              <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={!selectedUser}
              />
              <button onClick={sendMessage} disabled={!selectedUser}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatApp;

// CSS for styling (ChatApp.css)
.chat-app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.register-form {
  text-align: center;
  margin-top: 100px;
}

.register-form input {
  padding: 10px;
  width: 300px;
  margin-right: 10px;
}

.register-form button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
}

.chat-container {
  display: flex;
  height: 80vh;
  border: 1px solid #ddd;
  border-radius: 5px;
  overflow: hidden;
}

.users-list {
  width: 30%;
  background-color: #f5f5f5;
  padding: 15px;
  overflow-y: auto;
  border-right: 1px solid #ddd;
}

.users-list h3 {
  margin-top: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.users-list ul {
  list-style: none;
  padding: 0;
}

.users-list li {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.users-list li:hover {
  background-color: #e9e9e9;
}

.users-list li.selected {
  background-color: #e1f5fe;
}

.messages-container {
  width: 70%;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
}

.message {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 5px;
  max-width: 70%;
}

.message.sent {
  background-color: #e1f5fe;
  margin-left: auto;
}

.message.received {
  background-color: #f5f5f5;
}

.message-input {
  display: flex;
  padding: 15px;
  border-top: 1px solid #ddd;
}

.message-input input {
  flex: 1;
  padding: 10px;
  margin-right: 10px;
}

.message-input button {
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  cursor: pointer;
}

.message-input button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}