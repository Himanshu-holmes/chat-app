
import React from 'react'
import { socket } from '../socket';

function Home() {
    socket.timeout(5000).emit('request', { foo: 'bar' }, 'baz', (err, response) => {
        if (err) {
            // the server did not acknowledge the event in the given delay
        } else {
            console.log(response.status); // 'ok'
        }
    });
  return (
    <div>Home</div>
  )
}

export default Home