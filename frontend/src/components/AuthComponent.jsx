import React, { useState } from 'react';
import { Tab, Tabs } from './Tab';
import axios from "axios"
import { cryptoService } from '../services/cryptoService';
import apiService from '../services/axiosService';
import { getAxiosErrorMessage } from '../utils/handleAxiosError';

const AuthComponent = ({ setToken, setUser, setPublicKeyJwk }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('')
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        setError("")
        e.preventDefault()
        try {
            const response = await apiService.post("/auth/login",{
                username,password
            },{withCredentials:true}) 
            console.log("response status",response.status)
             if(response.status != 200)return
             const data = response.data
             setToken(data.token)
             setUser(data.user)
            // Check if user exists in local storage
            const existingUserData = cryptoService.getUserData();
            console.log("login: existingUserData",existingUserData)
            if (existingUserData && existingUserData.username === username) {
                await cryptoService.decryptPrivateKey(
                    existingUserData.encryptedPrivateKey,
                    password,
                    existingUserData.salt
                );
                setPublicKeyJwk(existingUserData.publicKeyJwk)
            }
        } catch (error) {
            console.log(error.response)
           getAxiosErrorMessage(error,setError,setError)
        }
    };
    const handleRegister = async (e) => {
        setError("")
        e.preventDefault()
        if(!username||!password){
            setError("Username and Password is required")
            return
        }
        try {
            // New user - generate keys
            const { seed, salt } = await cryptoService.deriveKeysFromPassword(password,true);
            const publicKeyJwk = await cryptoService.generateDeterministicKeyPair(seed);
           console.log("seed and Salt",seed,salt,publicKeyJwk)
            const response = await apiService.post("/auth/register",{
                username,password,publicKeyJwk,salt
            },{withCredentials:true}) 
            console.log("response status", response.status)
             if(response.status != 201)return
            // Encrypt private key for storage
            const encryptedPrivateKey = await cryptoService.encryptPrivateKey(password);

            // Store user data locally
             cryptoService.storeUserData(username, encryptedPrivateKey, publicKeyJwk, salt);
            
        } catch (error) {
            console.log("error in register",error)
            getAxiosErrorMessage(error)
        }
    };

    return (
        <div className="auth-container">
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
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
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
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
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