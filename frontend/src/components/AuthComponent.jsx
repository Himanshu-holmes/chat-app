import React, { useState } from 'react';
import { Tab, Tabs } from './Tab';
import axios from "axios"
import { cryptoService } from '../services/cryptoService';
import apiService from '../services/axiosService';
import { getAxiosErrorMessage } from '../utils/handleAxiosError';
import Loading from './ui/Loading';
import { useDispatch, useSelector } from 'react-redux';
import { setPassword, setUser, setToken, setPublicKeyJwk } from '../store/features/userSlice';

const AuthComponent = ({     }) => {
    const password = useSelector((state)=>state.user.password)
    const dispatch = useDispatch();
    
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');

    const handleLogin = async (e) => {
        setError("")
        setIsLoading(true)
        e.preventDefault()
        try {
            dispatch(setPassword(password))
            const response = await apiService.post("/auth/login", {
                username, password:currentPassword
            }, { withCredentials: true })
            // console.log("response status", response.status)
            if (response.status != 200) return
            const data = response.data
            dispatch(setToken(data.token))
            const userData = {
                id: data.user.id,
                username: data.user.username,
                publicKeyJwk: data.user?.pubk_jwk,

            }
            dispatch(setUser(userData))
            setLoadingMessage("Please Wait keys are being processed")
            // Check if user exists in local storage
            const existingUserData = cryptoService.getUserData();
            // console.log("login: existingUserData", existingUserData)
            if (existingUserData && existingUserData.username === username) {
                await cryptoService.decryptPrivateKey(
                    existingUserData.encryptedPrivateKey,
                    currentPassword,
                    existingUserData.salt
                );
                dispatch(setPublicKeyJwk(existingUserData.publicKeyJwk))
            } else {
                // console.log("user does not exist in local storage", "generating keys")
                // get salt
                const gotSalt = data.user?.salt
                // console.log("gotSalt", gotSalt)
                // console.log("userData", data.user)
                if (!gotSalt) return
                await cryptoService.setSalt(gotSalt.data)
                // if now user exists in local storage
                const { seed, salt } = await cryptoService.deriveKeysFromPassword({ password:currentPassword, isRegistering: true, });
                const publicKeyJwk = await cryptoService.generateDeterministicKeyPair(seed);
                // Encrypt private key for storage
                const encryptedPrivateKey = await cryptoService.encryptPrivateKey(currentPassword);

                // Store user data locally
                cryptoService.storeUserData(username, encryptedPrivateKey, publicKeyJwk, salt);
            }
            setLoadingMessage("")
            setIsLoading(false)
        } catch (error) {
            setIsLoading(false)
            setLoadingMessage("")
            console.log(error.response)
            getAxiosErrorMessage(error, setError, setError)
        }
    };
    const handleRegister = async (e) => {
        setIsLoading(true)
        setError("")
        e.preventDefault()
        // console.log("registering user", username, currentPassword)
        if (!username || !currentPassword) {
            setError("Username and Password is required")
            return
        }
        dispatch(setPassword(currentPassword))
        setLoadingMessage("Please Wait keys are being Generated")
        try {
            // New user - generate keys
            const { seed, salt } = await cryptoService.deriveKeysFromPassword({ password:currentPassword, isRegistering: true });
            const publicKeyJwk = await cryptoService.generateDeterministicKeyPair(seed);
            // console.log("seed and Salt", seed, salt, publicKeyJwk)
            const response = await apiService.post("/auth/register", {
                username, password:currentPassword, publicKeyJwk, salt
            }, { withCredentials: true })
            // console.log("response status", response.status)
            if (response.status != 201) return
            // Encrypt private key for storage
            const encryptedPrivateKey = await cryptoService.encryptPrivateKey(currentPassword);

            // Store user data locally
            cryptoService.storeUserData(username, encryptedPrivateKey, publicKeyJwk, salt);
            setIsLoading(false)
            setLoadingMessage("")
        } catch (error) {
            setIsLoading(false)
            setLoadingMessage("")
            console.log("error in register", error)
            getAxiosErrorMessage(error)
        }
    };

    // console.log("username", username)
    // console.log("password", currentPassword)

    return (
        <div className="auth-container">
            {isLoading &&
            <div className='fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center'>
               <Loading message={"Please Wait Your Key is being Processed"} />
            </div>
            }
            <Tabs>
                <Tab label={"Login"}>
                    <form onSubmit={handleLogin} className="auth-form">
                        <h2>Login</h2>
                        {error && <p className="error-message">{error}</p>}
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setError('');
                            }}
                            placeholder="Enter your username"
                        />
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="Enter your Password"
                        />
                        <button type="submit">Login</button>
                    </form>
                </Tab>
                <Tab label={"Register"}>
                    <form onSubmit={handleRegister} className="auth-form">
                        <h2>Register</h2>
                        {error && <p className="error-message">{error}</p>}
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setError('');
                            }}
                            placeholder="Enter your username"
                        />
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="Enter your Password"
                        />
                        <button type="submit">Register</button>
                    </form>
                </Tab>
            </Tabs>
        </div>
    );
};

export default AuthComponent;