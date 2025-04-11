import React, { useState, useEffect } from 'react';
import SocketService from '../services/socketService';
import socketService from '../services/socketService';
import axios from 'axios';
import { cryptoService } from '../services/cryptoService';
import apiService from '../services/axiosService';
import PassModal from './passwordDialog';

const ChatDashboard = ({ currentUser, onLogout, token }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [searchUser, setSearchUser] = useState('');
    const [gotAfterSearch, setGotAfterSearch] = useState('')
    const [showNotification, setShowNotification] = useState([])
    const [status, setStatus] = useState([]);
    const [keyExchanges, setKeyExchanges] = useState({});


    console.log("messages", messages)
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

    const getUsers = async () => {
        try {
            const getUsr = await apiService.get("/message/getUsers", {
                withCredentials: true,
            })
            console.log("get users", getUsr.data)
            const usrs = getUsr?.data?.users
            setUsers(usrs)
        } catch (error) {
            console.log(error)
        }
    }
    const getMessages = async (userId) => {
        try {
            const getMsg = await apiService.get("/message/getMessages", {
                withCredentials: true,
                params: {
                    user: userId
                }
            })
            console.log("get msgs", getMsg.data)
            const msg = getMsg?.data?.data
            console.log("msg", msg)
            const firstMessage = msg[0].message;

            const senderData = {
                username:msg[0].senderUsername,
                id: msg[0].senderId
            }
            console.log("senderData", senderData)
            const decryptMessage = await cryptoService.decryptMessage(firstMessage, senderData)
            console.log("decryptedMessage",decryptMessage)

            const decryptedMessages = await Promise.all (msg.map(async(message) => {
                const decryptedMessageGot = await cryptoService.decryptMessage(message.message, senderData)
                console.log("decryptedMessageGot.....",decryptedMessageGot)
               return {
                ...message,
            message:decryptedMessageGot }}))
            console.log("decryptedMessages====>",decryptedMessages)
            setMessages(prevMessages => {
                const conversationKey = userId
                return {
                    ...prevMessages,
                    [conversationKey]: [...decryptedMessages
                    ]
                };
            });
        } catch (error) {
            console.log(error)
        }
    }
    useEffect(() => {
        setUsers((prev) => prev.filter(u => u.id !== currentUser.id));

        const handleNewMessage = async(messageData) => {
            console.log("handle message ", messageData)
            const { id, username } = messageData?.byUser
            const decryptMessage = await cryptoService.decryptMessage(messageData?.message,messageData?.byUser)
            console.log("decryptedMessage",decryptMessage)
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


    const handleSendMessage = async(e) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedUser) return;
        // Prepare message data
        const encryptMessage = await cryptoService.encryptMessage(newMessage,selectedUser)
        const messageData = {
            senderId: currentUser.id,
            receiverId: selectedUser.id,
            senderUsername: currentUser.username,
            message: newMessage,
            timestamp: Date.now()
        };
        console.log("selectedUser hsndMsg", selectedUser)
        console.log("currentUser hsndMsg", currentUser)
        // Send message via socket
        SocketService.sendPrivateMessage(
            currentUser,
            selectedUser,
            encryptMessage
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
            const srchRes = await apiService.get("/user/search", {
                params: {
                    user: searchUser
                }, withCredentials: true,
            })
            const data = srchRes?.data?.user
            console.log("got after search", data)
            setGotAfterSearch(data)
        } catch (error) {
            console.error(error)
        }
    }

    const handleCLickUser = async (user) => {
        try {
            setSelectedUser(user)
            // if we don't have a symmetric key for this user yet
            if (!cryptoService.symmetricKeys[user?.id]) {
                // let's if server have the encrypted symmetric keys
                const getSymKeyRes = await apiService.get("/message/sm-key",
                    {
                        withCredentials: true,
                        params: {
                            ownerId: currentUser?.id,
                            recipientId: user?.id
                        },
                    }
                )
                if (getSymKeyRes.status !== 200) {
                    console.log("got not 200 so returning :: res = ", getSymKeyRes.data)
                    return
                }
                //then deccrypt it and use it 

                // else generate new symmtric key encrypt it and send to server to store in db
            }


            socketService.getUserStatus(user.id)
            setShowNotification(prev => prev.filter(id => id != user.id))
            getMessages(user?.id)
        } catch (error) {
            // console.error(error)
            if (error?.response?.data?.message) {
                console.log("user onClick",user)
                console.log("message for sym generation", error?.response?.data?.message)
                if (error?.response?.data?.message.toLowerCase() ==="gen"){
  
                    const symmetricKey = await cryptoService.createSymmetricKey(user?.username);
                    const recipient = users.find(item => item?.id === user?.id)
                    if (!recipient) {
                        console.log(`user with this id ${user?.id} not found in the useState users`)
                    }
                    const recipientPublicKey = recipient?.pubk_jwk
                    const encryptedKey = await cryptoService.encryptSymmetricKey(symmetricKey,recipientPublicKey)
                    try {
                        console.log("encryptedKey",encryptedKey.encryptedKey)
                        const response = await apiService.post("/message/sm-key",{
                            recipient:user?.id,
                            smKey:encryptedKey
                        })
                        if (response.status !== 200){
                            console.log("something went wrong",response)
                        }

                    } catch (error) {
                        
                    }

                }


            } else {
                console.error(error)
            }
        }
    }
 console.log("currentUser",currentUser)
 console.log("messages",messages)
    return (
        <div className="chat-dashboard">
            <PassModal/>
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
                                    handleCLickUser(user)

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
                    <div onClick={() => {
                        setSelectedUser(gotAfterSearch)
                        setUsers((prev) => {
                            if (prev.some(user => user.id === gotAfterSearch.id)) {
                                return prev
                            }
                            return [...prev, gotAfterSearch]
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