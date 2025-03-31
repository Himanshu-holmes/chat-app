import React, { useState, useEffect } from 'react';
import './App.css';
import AuthComponent from './components/AuthComponent';
import ChatDashboard from './components/ChatDashboard';
import SocketService from './services/socketService';

function App() {
  const [user, setUser] = useState(null);
  const myToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoxLCJ1c2VybmFtZSI6ImpvaG4ifSwiaWF0IjoxNzQzNDE0ODUyLCJleHAiOjE3NDM0MTg0NTIsImF1ZCI6InlvdXJzaXRlLm5ldCIsImlzcyI6ImFjY291bnRzLmV4YW1wbGVzb2Z0LmNvbSJ9.wvZJM5I2sxDLecQAvG2mnJZivhVmBq5P97K_g8VsZ2k"

  useEffect(() => {
    // Check for existing user in local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      SocketService.connect(parsedUser.id,myToken);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Store user in local storage
    localStorage.setItem('user', JSON.stringify(userData));
    // Connect to socket
    SocketService.connect(userData.id,myToken);
  };

  const handleLogout = () => {
    // Disconnect socket
    SocketService.disconnect();
    // Remove user from local storage
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="app">
      {!user ? (
        <AuthComponent onLogin={handleLogin} />
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