import React, { useState, useEffect } from 'react';
import SocketService from '../services/socketService';
import socketService from '../services/socketService';
import axios from 'axios';

const ChatDashboard = ({ currentUser, onLogout,token }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [searchUser, setSearchUser] = useState('');
    const [gotAfterSearch,setGotAfterSearch] = useState('')
    const [showNotification, setShowNotification] = useState([])
    const [status, setStatus] = useState([]);

console.log("messages",messages)
    useEffect(() => {
       getUsers()

        async function handleUserStatus(data) {
            console.log("data", data)
            if (!data?.isOnline) {
                console.log("user is offline", data)
                return
            }
            setStatus(prev => {
                if (prev.some(user => user.id === data.id)) {
                    return prev
                }
                return [...prev, data.id]
            })
        }
        socketService.onUserStatusResponse(handleUserStatus)
        return () => {
            SocketService.socket?.off("user:status_res", handleUserStatus);
        };
    }, [])

   const getUsers = async()=>{
        try {
            const getUsr = await axios.get("http://localhost:5000/message/getUsers",{withCredentials:true,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            console.log("get users",getUsr.data)
            const usrs = getUsr?.data?.users
            setUsers(usrs)
        } catch (error) {
            console.log(error)
        }
    }
    const getMessages = async(userId)=>{
        try {
            const getMsg = await axios.get("http://localhost:5000/message/getMessages", {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params:{
                    user:userId
                }
            })
            console.log("get msgs", getMsg.data)
            const msg = getMsg?.data?.data
            setMessages(prevMessages => {
                const conversationKey = userId
                return {
                    ...prevMessages,
                    [conversationKey]: [ ...msg
                    ]
                };
            });
        } catch (error) {
            console.log(error)
        }
    }
    useEffect(() => {
        setUsers((prev) => prev.filter(u => u.id !== currentUser.id));

        const handleNewMessage = (messageData) => {
            console.log("handle message ",messageData)
            const {id,username} = messageData.byUser
            setUsers(prev => {
                if (prev.some(user => user.id === id)) {
                    return prev; // Avoid duplicate users
                }
                return [...prev, { id, username }];
            });

            setShowNotification(prev => [...prev, id])
            console.log("handle message called", messageData)
            setMessages(prevMessages => {
                const conversationKey = id;
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
        console.log("selectedUser hsndMsg",selectedUser)
        console.log("currentUser hsndMsg",currentUser)
        // Send message via socket
        SocketService.sendPrivateMessage(
            currentUser,
            selectedUser,
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

   async function handleSearchUser() {
        try {
            const srchRes = await axios.get("http://localhost:5000/user/search",{params:{
                user:searchUser
            },withCredentials:true,headers:{
                Authorization: `Bearer ${token}`
            }})
            const data = srchRes?.data?.user
            console.log("got after search",data)
            setGotAfterSearch(data)
        } catch (error) {
            console.error(error)
        }
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
                            onClick={
                                () => {
                                    setSelectedUser(user)
                                    socketService.getUserStatus(user.id)
                                    setShowNotification(prev => prev.filter(id => id != user.id))
                                    getMessages(user?.id)
                                }
                            }
                        >
                            <div>

                                {user.username}
                            </div>

                            <div className={`p-1 rounded-full text-white ${showNotification.includes(user?.id) && (selectedUser?.id || !selectedUser) !== user.id ? "bg-red-500" : ""}`}>
                                {showNotification.includes(user?.id) &&
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
            <div className='relative'>

                <input value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
                <button onClick={handleSearchUser}>Search</button>
                {gotAfterSearch && (
                    <div onClick={()=>{
                        setSelectedUser(gotAfterSearch)
                        setUsers((prev) => {
                            if (prev.some(user => user.id === gotAfterSearch.id)) {
                                return prev
                            }
                            return [...prev,gotAfterSearch]
                        });
                        setGotAfterSearch("")
                    }}>
                        {gotAfterSearch.username}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatDashboard;