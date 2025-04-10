import React, { useState, useEffect } from 'react';
import './App.css';
import AuthComponent from './components/AuthComponent';
import ChatDashboard from './components/ChatDashboard';
import SocketService from './services/socketService';
import { useCookies } from "react-cookie"
import { setAuthToken } from './services/axiosService';

function App() {
  const [user, setUser] = useState(null);
  const [tCookie, setTCookie, removeTCookie] = useCookies(['token']);
  const [uCookie, setUCookie, removeUCookie] = useCookies(['user']);
  const [token, setToken] = useState('')
  const [publicKeyJwk,setPublicKeyJwk] = useState(null)
  console.log("cookies", tCookie.token)


  useEffect(() => {
    if (tCookie.token) {
      setToken(tCookie.token)
      setAuthToken(token)
    }
    // Check for existing user in local storage

    if (token) {
      setAuthToken(token)
      SocketService.connect(token);
    }

  }, [token]);
  useEffect(() => {
    if (uCookie.user) {
      const extractUser = uCookie.user.split('-')
      const userData = {
        id: extractUser[1],
        username: extractUser[0]
      }
      setUser(userData)
    }
  }, [])



  const handleLogout = () => {
    // Disconnect socket
    SocketService.disconnect();
    // Remove user from local storage
    removeTCookie(token)
    setToken('')
  };

  return (
    <div className="app">
      {!token ? (
        <AuthComponent setUser={setUser} setToken={setToken} setPublicKeyJwk={setPublicKeyJwk}/>
      ) : (
        <ChatDashboard
          currentUser={user}
          onLogout={handleLogout}
          token={token}
          publicKeyJwk={publicKeyJwk}
        />
      )}
    </div>
  );
}

export default App;