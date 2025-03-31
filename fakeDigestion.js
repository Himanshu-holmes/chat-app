const likesQueue = new Map();
const LIKE_DELAY = 60000; // 1 minute

// function addLike(photoId, userId) {
//   if (!likesQueue.has(photoId)) {
//     likesQueue.set(photoId, { users: new Set(), timer: null });

//     // Start a timer to process the likes after 1 minute
//     likesQueue.get(photoId).timer = setTimeout(
//       () => processLikes(photoId),
//       LIKE_DELAY
//     );
//   }

//   // Store userId to avoid duplicate likes from the same user within the time window
//   likesQueue.get(photoId).users.add(userId);
// }

// async function processLikes(photoId) {
//   const likeData = likesQueue.get(photoId);
//   if (!likeData) return;

//   const likeCount = likeData.users.size; // Unique likes count
//   console.log(`Updating database: ${photoId} received ${likeCount} likes.`);
  
//   // Update the database with the new like count (Replace with your DB logic)
//   await updateLikesInDatabase(photoId, likeCount);

//   // Remove the entry from the queue
//   likesQueue.delete(photoId);
// }

// async function updateLikesInDatabase(photoId, likeCount) {
//   // Simulating database update
//   console.log(`Photo ${photoId} updated with ${likeCount} new likes.`);
// }

// // Simulating users liking a photo
addLike(1, "user1");
addLike(1, "user2");
setTimeout(() => addLike(1, "user3"), 3000); // Another like within 30 sec
setTimeout(() => addLike(1, "user4"), 6100); // This will start a new batch


function addLike(photoId, userId) {
    if (!likesQueue.get(photoId)){
        likesQueue.set(photoId,{users:new Set(),timer:null})
    
    likesQueue.get(photoId).timer = setTimeout(()=>processLike(photoId),LIKE_DELAY)
    }
    likesQueue.get(photoId).users.add(userId)
}

async function processLike(photoId){
    const likeData = likesQueue.get(photoId)
    if(!likeData) return
    const likeCount = likeData.users.size
    // let update in db
    await updateDb(photoId,likeCount)
    likesQueue.delete(photoId)
}

function updateDb(photoId,likeCount){
    console.log(`db update with photoId: ${photoId} got $${likeCount} likes`)
}