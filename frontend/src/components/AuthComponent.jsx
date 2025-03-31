import React, { useState } from 'react';

const AuthComponent = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!username.trim()) {
            setError('Username is required');
            return;
        }

        // Simple user creation/login
        const userData = {
            id: Date.now().toString(), // Generate unique ID
            username: username.trim()
        };

        onLogin(userData);
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Join Chat</h2>
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
                <button type="submit">Join</button>
            </form>
        </div>
    );
};

export default AuthComponent;