import React, { useState, useEffect } from 'react';
import SocketService from '../services/socketService';

const UserList = ({ users, onUserSelect, currentUser }) => {
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        // Listen for user online/offline events
        SocketService.onUserOnline((userId) => {
            setOnlineUsers(prev =>
                prev.includes(userId) ? prev : [...prev, userId]
            );
        });

        SocketService.onUserOffline((userId) => {
            setOnlineUsers(prev =>
                prev.filter(id => id !== userId)
            );
        });
    }, []);

    return (
        <div className="user-list">
            <h2>Contacts</h2>
            {users.map(user => (
                <div
                    key={user.id}
                    className="user-item"
                    onClick={() => onUserSelect(user)}
                >
                    <span className="user-name">{user.username}</span>
                    <span
                        className={`online-indicator ${onlineUsers.includes(user.id) ? 'online' : 'offline'
                            }`}
                    >
                        {onlineUsers.includes(user.id) ? '●' : '○'}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default UserList;