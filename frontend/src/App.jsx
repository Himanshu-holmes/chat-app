import React, { useState, useEffect } from 'react';
import './App.css';
import AuthComponent from './components/AuthComponent';
import ChatDashboard from './components/ChatDashboard';
import SocketService from './services/socketService';
import {useCookies} from "react-cookie"

function App() {
  const [user, setUser] = useState(null);
  const [cookies, setCookie, removeCookie] = useCookies(['token']);
  const [token,setToken] = useState('')
  console.log("cookies",cookies.token)
 

  useEffect(() => {
   if(cookies.token){
    setToken(cookies.token)
   }
    // Check for existing user in local storage

     if(token){

       SocketService.connect(token);
     }
    
  }, [token]);

 

  const handleLogout = () => {
    // Disconnect socket
    SocketService.disconnect();
    // Remove user from local storage
   removeCookie(token)
   setToken('')
  };

  return (
    <div className="app">
      {!token ? (
        <AuthComponent  token={token} setToken={setToken}/>
      ) : (
        <ChatDashboard
          currentUser={user}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;