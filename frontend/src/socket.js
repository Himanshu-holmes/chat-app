import { io } from 'socket.io-client';
const URL = `https://localhost:3001`;
export const socket = io(URL);