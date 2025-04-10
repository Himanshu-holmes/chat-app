// Enhanced CryptoService.js with password-derived keys
export class CryptoService {
  constructor() {
    this.keyPair = null;
    this.publicKeyJwk = null;
    this.privateKeyJwk = null;
    this.symmetricKeys = {}; // Store symmetric keys for each conversation
    this.salt = null; // Salt for PBKDF2
  }

  // Generate a random salt
  async generateSalt() {
    this.salt = window.crypto.getRandomValues(new Uint8Array(16));
    return this.salt;
  }

  // Import an existing salt
  setSalt(salt) {
    this.salt = new Uint8Array(salt);
  }

  // Derive keys from password
  async deriveKeysFromPassword(password) {
    // If no salt exists, generate one
    if (!this.salt) {
      await this.generateSalt();
    }

    // Convert password to buffer
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Use PBKDF2 to derive a key from the password
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    // Derive key for RSA key pair generation
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: this.salt,
        iterations: 100000, // High iteration count for security
        hash: "SHA-256"
      },
      keyMaterial,
      256 // 256 bits of derived key material
    );

    // Use the derived bits as a seed for key generation
    const seed = new Uint8Array(derivedBits);
    
    // Store the derived seed securely
    return {
      seed,
      salt: Array.from(this.salt) // Convert to array for storage
    };
  }

  // Generate deterministic RSA key pair from seed
  async generateDeterministicKeyPair(seed) {
    // This is a simplified implementation - in production you would use a more robust approach
    // We're using the seed to initialize a deterministic random number generator
    
    // For demonstration, we'll generate a key pair using Web Crypto API
    // In real implementation, you would use a deterministic algorithm
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

  // Encrypt private key with a password for storage
  async encryptPrivateKey(password) {
    // Derive a key from password for encrypting the private key
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    const encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: this.salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    
    // Convert private key JWK to string
    const privateKeyString = JSON.stringify(this.privateKeyJwk);
    const privateKeyBuffer = encoder.encode(privateKeyString);
    
    // Encrypt the private key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedPrivateKey = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      encryptionKey,
      privateKeyBuffer
    );
    
    // Return encrypted key with IV for storage
    return {
      encryptedKey: Array.from(new Uint8Array(encryptedPrivateKey)),
      iv: Array.from(iv)
    };
  }
  
  // Decrypt stored private key
  async decryptPrivateKey(encryptedData, password, salt) {
    // Set the salt
    this.setSalt(salt);
    
    // Derive the same key used for encryption
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    const decryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: this.salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    
    // Decrypt the private key
    const iv = new Uint8Array(encryptedData.iv);
    const encryptedKey = new Uint8Array(encryptedData.encryptedKey);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      decryptionKey,
      encryptedKey
    );
    
    // Convert buffer back to JWK
    const decoder = new TextDecoder();
    const privateKeyString = decoder.decode(decryptedBuffer);
    this.privateKeyJwk = JSON.parse(privateKeyString);
    
    // Import the private key for use
    const privateKey = await window.crypto.subtle.importKey(
      "jwk",
      this.privateKeyJwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["decrypt"]
    );
    
    // Reconstruct the key pair (public key can be derived from private key or fetched from server)
    this.keyPair = {
      privateKey
    };
    
    return this.privateKeyJwk;
  }

  // Store user credentials in localStorage
  storeUserData(username, encryptedPrivateKey, publicKeyJwk, salt) {
    const userData = {
      username,
      encryptedPrivateKey,
      publicKeyJwk,
      salt
    };
    
    localStorage.setItem('chatUserData', JSON.stringify(userData));
  }
  
  // Retrieve user data from localStorage
  getUserData() {
    const userData = localStorage.getItem('chatUserData');
    return userData ? JSON.parse(userData) : null;
  }

  // The rest of the methods remain the same as in the original implementation
  async createSymmetricKey(recipient) {
    const symmetricKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );

    this.symmetricKeys[recipient] = symmetricKey;
    
    const exportedKey = await window.crypto.subtle.exportKey(
      "raw",
      symmetricKey
    );
    
    return exportedKey;
  }

  async encryptSymmetricKey(symmetricKey, recipientPublicKeyJwk) {
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
    // Import our private key
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
    
    this.symmetricKeys[sender] = symmetricKey;
  }
  
  async encryptMessage(message, recipient) {
    let symmetricKey = this.symmetricKeys[recipient];
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);
    
    const encryptedMessage = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      symmetricKey,
      messageData
    );
    
    const result = {
      iv: Array.from(new Uint8Array(iv)),
      data: Array.from(new Uint8Array(encryptedMessage))
    };
    
    return result;
  }
  
  async decryptMessage(encryptedObj, sender) {
    const symmetricKey = this.symmetricKeys[sender];
    
    const iv = new Uint8Array(encryptedObj.iv);
    const encryptedData = new Uint8Array(encryptedObj.data);
    
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      symmetricKey,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }
}

// Enhanced Login/Registration component
import React, { useState, useEffect } from 'react';
import { CryptoService } from './CryptoService';

const cryptoService = new CryptoService();

function LoginRegister({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Check if user data exists in localStorage
    const userData = cryptoService.getUserData();
    if (userData) {
      setUsername(userData.username);
    }
  }, []);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    
    try {
      const userData = cryptoService.getUserData();
      
      if (!userData || userData.username !== username) {
        setError('User not found. Please register first.');
        return;
      }
      
      // Decrypt the private key using the password
      await cryptoService.decryptPrivateKey(
        userData.encryptedPrivateKey, 
        password,
        userData.salt
      );
      
      // Login successful
      onLogin(username, userData.publicKeyJwk);
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid username or password');
    }
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    
    try {
      // Check if user already exists
      const existingData = cryptoService.getUserData();
      if (existingData && existingData.username === username) {
        setError('Username already exists. Please login instead.');
        return;
      }
      
      // Derive keys from password
      const { seed, salt } = await cryptoService.deriveKeysFromPassword(password);
      
      // Generate deterministic key pair from seed
      const publicKeyJwk = await cryptoService.generateDeterministicKeyPair(seed);
      
      // Encrypt private key for storage
      const encryptedPrivateKey = await cryptoService.encryptPrivateKey(password);
      
      // Store user data
      cryptoService.storeUserData(username, encryptedPrivateKey, publicKeyJwk, salt);
      
      // Registration successful
      onLogin(username, publicKeyJwk);
      
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    }
  };
  
  return (
    <div className="auth-container">
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={isRegistering ? handleRegister : handleLogin}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </div>
        
        <div className="form-group">
          <label>Password or Passphrase</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>
        
        <button type="submit">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>
      
      <p className="toggle-auth">
        {isRegistering ? 'Already have an account?' : 'Don\'t have an account?'}
        <button 
          className="link-button"
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering ? 'Login' : 'Register'}
        </button>
      </p>
    </div>
  );
}

// Enhanced ChatApp.js that incorporates the login component
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { CryptoService } from './CryptoService';
import LoginRegister from './LoginRegister';

const socket = io.connect('http://localhost:3001');
const cryptoService = new CryptoService();

function ChatApp() {
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [keyExchanges, setKeyExchanges] = useState({});
  
  useEffect(() => {
    if (isLoggedIn) {
      // Register with the server
      socket.emit('register', { username, publicKey });
      
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
  }, [username, isLoggedIn, publicKey]);
  
  const handleLogin = (username, publicKeyJwk) => {
    setUsername(username);
    setPublicKey(publicKeyJwk);
    setIsLoggedIn(true);
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
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPublicKey(null);
    setSelectedUser(null);
    setMessages([]);
    setKeyExchanges({});
    // The socket will handle the disconnect
  };
  
  return (
    <div className="chat-app">
      {!isLoggedIn ? (
        <LoginRegister onLogin={handleLogin} />
      ) : (
        <div className="chat-container">
          <div className="header">
            <h2>Encrypted Chat</h2>
            <div className="user-info">
              Logged in as: <strong>{username}</strong>
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>
          </div>
          
          <div className="content">
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
        </div>
      )}
    </div>
  );
}

export default ChatApp;

// CSS for styling (add to your CSS file)
.auth-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.error-message {
  color: #d32f2f;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #ffebee;
  border-radius: 4px;
}

.toggle-auth {
  margin-top: 20px;
  text-align: center;
}

.link-button {
  background: none;
  border: none;
  color: #2196F3;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 5px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.user-info {
  display: flex;
  align-items: center;
}

.logout-button {
  margin-left: 15px;
  padding: 5px 10px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.content {
  display: flex;
  height: calc(80vh - 60px);
}