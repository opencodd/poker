import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  const firebaseConfig = config.public.firebaseConfig

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const firestore = getFirestore(app)

  // Set persistence to LOCAL
  await setPersistence(auth, browserLocalPersistence)

  // Handle auth state changes
  const user = useState('user', () => null)
  onAuthStateChanged(auth, (newUser) => {
    user.value = newUser
  })

  nuxtApp.vueApp.provide('auth', auth)
  nuxtApp.vueApp.provide('firestore', firestore)

  nuxtApp.provide('auth', auth)
  nuxtApp.provide('firestore', firestore)
})