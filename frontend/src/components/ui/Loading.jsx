import React from 'react'
import { Spinner } from './spinner'

function Loading({message}) {
  return (
      <div className=''>
        <div>

   <Spinner show={true} />
    <p className='text-center mt-4 text-white font-semibold'>{message}</p>
        </div>
    </div>
  )
}

export default Loading