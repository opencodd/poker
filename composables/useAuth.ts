import type { User } from 'firebase/auth'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

export const useAuth = () => {
  const { $auth, $firestore } = useNuxtApp()
  const auth = $auth as Auth
  const firestore = $firestore as Firestore
  
  const user = useState<User | null>('user', () => null)
  const loading = useState<boolean>('loading', () => true)
  const trialEndsAt = useState<Date | null>('trialEndsAt', () => null)

  async function register(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)

      await setDoc(doc(firestore, 'users', userCredential.user.uid), {
        email,
        createdAt: Timestamp.now(),
        trialEndsAt: Timestamp.fromDate(trialEnd)
      })

      user.value = userCredential.user
      await checkTrialStatus(userCredential.user.uid)
      return userCredential.user
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  async function login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      user.value = userCredential.user
      await checkTrialStatus(userCredential.user.uid)
      return userCredential.user
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  async function logout() {
    try {
      await signOut(auth)
      user.value = null
      trialEndsAt.value = null
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  async function checkTrialStatus(userId: string) {
    const userDoc = await getDoc(doc(firestore, 'users', userId))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      trialEndsAt.value = userData.trialEndsAt.toDate()
      return userData.trialEndsAt.toDate() > new Date()
    }
    return false
  }

  return {
    user,
    loading,
    trialEndsAt,
    register,
    login,
    logout,
    checkTrialStatus
  }
}