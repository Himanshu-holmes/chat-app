import React, { useState } from 'react';
import { Tab, Tabs } from './Tab';
import axios from "axios"

const AuthComponent = ({ token,setToken }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('')
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        setError("")
        e.preventDefault()
        try {
            const response = await axios.post("http://localhost:5000/auth/login",{
                username,password
            },{withCredentials:true}) 
            console.log("response status",response.status)
             if(response.status != 200)return
             const data = response.data
             setToken(data.token) 
        } catch (error) {
            console.log(error.response)
            if(error?.response?.data?.message){

                setError(error?.response?.data?.message)
            }else{
                setError(error?.message)
            }
        }
    };
    const handleRegister = async (e) => {
        setError("")
        e.preventDefault()
        try {
            const response = await axios.post("http://localhost:5000/auth/register",{
                username,password
            },{withCredentials:true}) 
            console.log("response status", response.status)
             if(response.status != 201)return
            
        } catch (error) {
            console.log(error.response)
            if (error?.response?.data?.message) {

                setError(error?.response?.data?.message)
            } else {
                setError(error?.message)
            }
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