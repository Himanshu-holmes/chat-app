import React, { useState, useEffect, useRef } from 'react';
import SocketService from '../services/socketService';

const ChatWindow = ({ currentUser, selectedUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Clear messages when switching users
        setMessages([]);

        // Listen for new messages
        const handleNewMessage = (message) => {
            // Only add message if it's from the current conversation
            if (
                (message.senderId === currentUser.id && message.receiverId === selectedUser.id) ||
                (message.senderId === selectedUser.id && message.receiverId === currentUser.id)
            ) {
                setMessages(prev => [...prev, message]);
            }
        };

        SocketService.onNewMessage(handleNewMessage);

        // Cleanup listener
        return () => {
            // Remove specific listener if possible
        };
    }, [currentUser, selectedUser]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Send message via socket
        SocketService.sendPrivateMessage(
            currentUser.id,
            selectedUser.id,
            newMessage
        );

        // Optimistically add message to UI
        setMessages(prev => [...prev, {
            id: Date.now(),
            senderId: currentUser.id,
            message: newMessage
        }]);

        // Clear input
        setNewMessage('');
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <h2>{selectedUser.username}</h2>
            </div>
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div
                        key={msg.id || index}
                        className={`message ${msg.senderId === currentUser.id ? 'sent' : 'received'
                            }`}
                    >
                        {msg.message}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="message-input">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default ChatWindow;