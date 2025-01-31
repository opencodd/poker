import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, serverTimestamp, getDoc } from 'firebase/firestore'

export const usePokerRoom = () => {
  const { $firestore } = useNuxtApp()

  const createRoom = async (name: string, ownerId: string) => {
    const roomsRef = collection($firestore, 'rooms')
    const room = await addDoc(roomsRef, {
      name,
      ownerId,
      createdAt: serverTimestamp(),
      revealed: false,
      currentVotes: {},
      participants: {}
    })
    return room
  }

  async function getRooms(userId: string) {
    try {
      const q = query(
        collection($firestore, 'rooms'),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const vote = async (roomId: string, userId: string, userName: string, value: number) => {
    const roomRef = doc($firestore, 'rooms', roomId)
    await updateDoc(roomRef, {
      [`currentVotes.${userId}`]: {
        value: value
      },
      [`participants.${userId}.name`]: userName
    })
  }

  const revealVotes = async (roomId: string) => {
    const roomRef = doc($firestore, 'rooms', roomId)
    await updateDoc(roomRef, {
      revealed: true
    })
  }

  const resetVotes = async (roomId: string) => {
    const roomRef = doc($firestore, 'rooms', roomId)
    await updateDoc(roomRef, {
      revealed: false,
      currentVotes: {}
    })
  }

  const calculateAverage = (votes: any) => {
    const fibonacci = [1, 2, 3, 5, 8, 13, 21, 34]
    
    // Filter out null/undefined votes and get only valid vote values
    const validVotes = Object.values(votes)
      .map((v: any) => v.value && v.value !== '☕' && v.value !== '?' ? v.value : null)
      .filter((v: number) => v != null && !isNaN(v))
    
    if (validVotes.length === 0) return 0
    
    // Calculate average only from valid votes
    const avg = validVotes.reduce((a: number, b: number) => a + b, 0) / validVotes.length
    
    // Find the next Fibonacci number that is greater than or equal to the average
    return fibonacci.find(f => f >= avg) || fibonacci[fibonacci.length - 1]
  }

  return {
    createRoom,
    getRooms,
    vote,
    revealVotes,
    resetVotes,
    calculateAverage
  }
}