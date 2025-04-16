import React, { useState } from 'react'
import { Button } from './ui/button';
import { useDispatch, useSelector } from 'react-redux';
import { addUsers, selectUser, setSelectedUser } from '../store/features/interactionSlice';
import apiService from '../services/axiosService';

function SearchUser({   }) {
    const [gotAfterSearch, setGotAfterSearch] = useState('')
    const dispatch = useDispatch();
    const [searchUser, setSearchUser] = useState('')
    const currentUser = useSelector((state) => state.user.user);
    const currentUserPbkJwk = useSelector((state) => state.user.publicKeyJwk);

    async function handleSearchUser() {
        try {
            const srchRes = await apiService.get("/user/search", {
                params: {
                    user: searchUser
                }, withCredentials: true,
            })
            const data = srchRes?.data?.user
            // console.log("got after search", data)
            setGotAfterSearch(data)
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className='absolute ml-5 right-0 mr-2 top-5 z-50'>

            <input className='p-2 bg-pink-50 rounded-md border-slate-800 outline outline-1' value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
            <Button onClick={handleSearchUser}>Search</Button>
            {gotAfterSearch && (
                <div className='text-slate-900 font-bold bg-pink-50 w-52 p-1 px-2 rounded-md ' onClick={() => {
                    console.log("got after search", gotAfterSearch)
                    dispatch(setSelectedUser(gotAfterSearch))
                    console.log("select user goin to dispatch")
                   dispatch(selectUser({user: gotAfterSearch,currentUser, currentUserPbkJwk}))
                   dispatch(addUsers(gotAfterSearch))
                    setGotAfterSearch("")
                }}>
                    {gotAfterSearch.username &&
                        <div className='flex justify-between' >
                            {gotAfterSearch.username}
                            <div className='flex  bg-red-200 p-1 px-2 rounded-md text-red-500'
                                onClick={() => setGotAfterSearch("")}>X</div>
                        </div>

                    }

                </div>
            )}
        </div>
    )
}

export default SearchUser