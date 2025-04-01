import React, { useState, useEffect } from 'react';
import SocketService from '../services/socketService';
import socketService from '../services/socketService';

const ChatDashboard = ({ currentUser, onLogout }) => {
    const [users, setUsers] = useState([{ id: '1', username: 'Alice' },
    { id: '2', username: 'Bob' },
    { id: '3', username: 'Charlie' }]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [searchUser, setSearchUser] = useState('');
    const [showNotification, setShowNotification] = useState([])
    const [status,setStatus] = useState([])
   
    useEffect(()=>{
        // get all users that you messaged sorted by latest message

        async function handleUserStatus(data){
          
            if ( !data?.isOnline){
                console.log("user is offline",data)
                return
            }
          setStatus(prev=>{
            if(prev.some(user=>user.id === id)){
                return prev
            }
            return [...prev,id]
          })
        }
        socketService.onUserStatusResponse(handleUserStatus)
        return () => {
            SocketService.socket?.off("user:status_res", handleUserStatus);
        };
    },[])


    useEffect(() => {
        setUsers((prev) => prev.filter(u => u.id !== currentUser.id));

        const handleNewMessage = (messageData) => {
            setUsers(prev => {
                if (prev.some(user => user.id === messageData.senderId)) {
                    return prev; // Avoid duplicate users
                }
                return [...prev, { id: messageData.senderId, username: messageData.senderId }];
            });

            setShowNotification(prev => [...prev, messageData.senderId])
            console.log("handle message called", messageData)
            setMessages(prevMessages => {
                const conversationKey = messageData.senderId;
                return {
                    ...prevMessages,
                    [conversationKey]: [
                        ...(prevMessages[conversationKey] || []),
                        messageData
                    ]
                };
            });
        };

        // Set up the callback for private messages
        SocketService.onPrivateMessage(handleNewMessage);

        return () => {
            SocketService.socket?.off("private_message", handleNewMessage);
        };

    }, [currentUser]);


    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedUser) return;

        // Prepare message data
        const messageData = {
            senderId: currentUser.id,
            receiverId: selectedUser.id,
            senderUsername: currentUser.username,
            message: newMessage,
            timestamp: Date.now()
        };

        // Send message via socket
        SocketService.sendPrivateMessage(
            currentUser.id,
            selectedUser.id,
            newMessage
        );

        // Update local messages state
        setMessages(prevMessages => {
            const conversationKey = selectedUser.id;
            return {
                ...prevMessages,
                [conversationKey]: [
                    ...(prevMessages[conversationKey] || []),
                    messageData
                ]
            };
        });

        // Clear input
        setNewMessage('');
    };

    function handleSearchUser() {
        console.log("searched chatDashboard", searchUser)
        socketService.searchUser(searchUser)
    }

    return (
        <div className="chat-dashboard">
            <div className="sidebar">
                <div className="user-info">
                    <span>Logged in as: {currentUser.username}</span>
                    <button onClick={onLogout}>Logout</button>
                </div>
                <div className="user-list">
                    <h3>Users</h3>
                    {users.map(user => (
                        <div
                            key={user.id}
                            className={`user-item ${selectedUser?.id === user.id ? 'selected' : ''} flex justify-between`}
                            onClick={() => {
                                setSelectedUser(user)
                                socketService.getUserStatus(user.id)
                            }
                            }
                        >
                            <div>

                            {user.username} 
                            </div>
                            {console.log("userid error",user.id,selectedUser)}
                        <div className={`p-1 rounded-full text-white ${ showNotification.includes(user?.id) && selectedUser.id !== user.id?"bg-red-500":""}`}>
                            {showNotification.includes(user?.id)&&
                            <>1</>
                            }
                        </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="chat-window">
                {selectedUser ? (
                    <>
                        <div className="chat-header">
                            <h2>Chat with {selectedUser.username}</h2>
                        </div>
                        <div className="messages-container">
                            {messages[selectedUser.id]?.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`message ${msg.senderId === currentUser.id ? 'sent' : 'received'
                                        }`}
                                >
                                    {msg.message}
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleSendMessage} className="message-input">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                disabled={!selectedUser}
                            />
                            <button type="submit" disabled={!selectedUser}>
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        Select a user to start chatting
                    </div>
                )}
            </div>
            <div>

                <input value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
                <button onClick={handleSearchUser}>Search</button>
            </div>
        </div>
    );
};

export default ChatDashboard;