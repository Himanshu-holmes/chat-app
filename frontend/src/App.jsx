import React, { useState, useEffect } from 'react';
import './App.css';
import AuthComponent from './components/AuthComponent';
import ChatDashboard from './components/ChatDashboard';
import SocketService from './services/socketService';
import { useCookies } from "react-cookie"
import { setAuthToken } from './services/axiosService';
import PassModal from './components/passwordDialog';
import { cryptoService } from './services/cryptoService';
import { useDispatch, useSelector } from 'react-redux';
import { setPublicKeyJwk, setToken, setUser } from './store/features/userSlice';
import SearchUser from './components/SearchUser';

function App() {
  const user = useSelector((state)=> state.user.user);
  const password = useSelector((state)=>state.user.password)
  const token = useSelector((state)=>state.user.token)
  const dispatch = useDispatch();

  const [tCookie, setTCookie, removeTCookie] = useCookies(['token']);
  const [uCookie, setUCookie, removeUCookie] = useCookies(['user']);
  const [isOpen, setIsOpen] = useState(false)
  // console.log("cookies", tCookie.token)


  useEffect(() => {
    if (tCookie.token) {
      dispatch(setToken(tCookie.token))
      setAuthToken(tCookie.token)
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
      // console.log("extracted user", extractUser)
      const userData = {
        id: extractUser[1],
        username: extractUser[0]
      }
      dispatch(setUser(userData))
    }
  }, [])



  const handleLogout = () => {
    // Disconnect socket
    SocketService.disconnect();
    // Remove user from local storage
    removeTCookie(token)
    dispatch(setToken(''))
  };
  async function getExistingData() {
    const existingUserData = cryptoService.getUserData();
    // console.log("app: existingUserData", existingUserData)
    if (existingUserData) {
      const privateKey = await cryptoService.decryptPrivateKey(
        existingUserData.encryptedPrivateKey,
        password,
        existingUserData.salt
      );
      dispatch(setPublicKeyJwk(existingUserData.publicKeyJwk))
      // console.log("privateKey", privateKey)
    }
  }

  useEffect(() => {
    if (token && !password) {
      setIsOpen(true)
    }
    if (password && token) {
      getExistingData()
    }
  }, [token, password])



  return (
    <div className='relative'>
      <nav className="flex items-center justify-center  top-1 w-full bg-pink-100 border-pink-200 border-2 px-2 sm:px-4 py-2.5 rounded text-orange-500 font-bold text-lg">HISHUMA CHAT APP</nav>
      <SearchUser/>
    <div className="app">
      
        {!token ? (
          <AuthComponent setToken={setToken} />
        ) : !password ? <PassModal  handleUserData={getExistingData} isOpen={isOpen} setIsOpen={setIsOpen} /> : (
          <ChatDashboard
            onLogout={handleLogout}
          />
        )}
      
    </div>
    </div>
  );
}

export default App;