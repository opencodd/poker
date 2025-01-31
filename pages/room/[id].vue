<template>
  <div class="flex">
    <!-- Sidebar -->
    <div class="w-80 bg-gray-50 min-h-screen p-4 border-r">
      <!-- Voted Participants -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-500 mb-3">Voted Participants</h3>
        <div class="space-y-2">
          <div
            v-for="(participant, id) in votedParticipants"
            :key="id"
            :class="[
              'bg-white rounded-lg p-3 flex items-center justify-between',
              participant.isCurrentUser ? 'ring-1 ring-indigo-600' : ''
            ]"
          >
            <div>
              <p class="font-medium">
                {{ participant.name }}
                <span v-if="participant.isCurrentUser" class="text-indigo-600 text-xs">(You)</span>
              </p>
              <p class="text-sm text-gray-500">
                {{ room?.revealed ? participant.vote : '?' }}
              </p>
            </div>
            <button
              @click="removeParticipant(id)"
              class="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Not Voted Participants -->
      <div>
        <h3 class="text-sm font-semibold text-gray-500 mb-3">Waiting for Votes</h3>
        <div class="space-y-2">
          <div
            v-for="(participant, id) in notVotedParticipants"
            :key="id"
            :class="[
              'bg-white rounded-lg p-3 flex items-center justify-between',
              participant.isCurrentUser ? 'ring-1 ring-indigo-600' : ''
            ]"
          >
            <div>
              <p class="font-medium">
                {{ participant.name }}
                <span v-if="participant.isCurrentUser" class="text-indigo-600 text-xs">(You)</span>
              </p>
              <p class="text-sm text-gray-500">Not voted yet</p>
            </div>
            <button
              @click="removeParticipant(id)"
              class="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="mb-6">
          <h1 class="text-2xl font-bold">{{ room?.name }}</h1>
          <p class="text-gray-600">Share this link with your team:</p>
          <div class="mt-2 flex gap-2">
            <input
              type="text"
              :value="roomUrl"
              readonly
              class="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
            >
            <button
              @click="copyRoomUrl"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Copy
            </button>
          </div>
        </div>

        <div v-if="!hasJoined" class="mb-6">
          <h2 class="text-xl font-bold mb-4">Join Room</h2>
          <form @submit.prevent="joinRoom" class="flex gap-4">
            <input
              type="text"
              v-model="userName"
              placeholder="Enter your name"
              class="flex-1 px-3 py-2 border rounded-lg"
              required
            >
            <button
              type="submit"
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Join
            </button>
          </form>
        </div>

        <div v-else>
          <div class="mb-6">
            <h2 class="text-xl font-bold mb-4">Vote</h2>
            <div class="grid grid-cols-4 gap-4">
              <button
                v-for="value in [1, 2, 3, 5, 8, 13, 21, 34]"
                :key="value"
                @click="submitVote(value)"
                :class="[
                  'px-6 py-4 rounded-lg text-center text-xl font-bold hover:scale-105 transition-transform',
                  currentVote === value
                    ? 'bg-indigo-600 text-white'
                    : participants[userId]?.vote === value && room?.revealed
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                ]"
              >
                {{ value }}
              </button>
              <button
                v-for="value in ['?', '☕']"
                :key="value"
                @click="submitVote(value)"
                :class="[
                  'col-span-2 px-6 py-4 rounded-lg text-center text-xl font-bold hover:scale-105 transition-transform',
                  currentVote === value
                    ? 'bg-indigo-600 text-white'
                    : participants[userId]?.vote === value && room?.revealed
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                ]"
              >
                {{ value }}
              </button>
            </div>
          </div>

          <div class="flex gap-4 mb-3">
            <button
              @click="reveal"
              class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              :disabled="room?.revealed"
            >
              Reveal Votes
            </button>
            <button
              @click="reset"
              class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Reset
            </button>
          </div>

          <div v-if="room?.revealed" class="mt-6 mb-4">
            <h2 class="text-xl font-bold">Results</h2>
            <p class="text-2xl mt-2">
              Average (Fibonacci): {{ calculateAverage(room.currentVotes) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onSnapshot, doc, updateDoc, serverTimestamp, deleteField, type Firestore } from 'firebase/firestore'

const route = useRoute()
const { vote, revealVotes, resetVotes, calculateAverage } = usePokerRoom()
const { $firestore } = useNuxtApp()

interface RoomParticipant {
  name: string
  joinedAt: any
}

interface RoomVote {
  value: number
}

interface Room {
  id: string
  name: string
  ownerId: string
  participants: Record<string, RoomParticipant>
  currentVotes?: Record<string, RoomVote>
  revealed?: boolean
}

interface Participant {
  name: string
  hasVoted: boolean
  vote: number | null
  isCurrentUser: boolean
}

const room = ref<Room | null>(null)
const userName = ref('')
const hasJoined = ref(false)
const currentVote = ref<number | null>(null)

// Generate a random ID for anonymous users that persists during the session
const anonymousId = ref(Math.random().toString(36).substring(2, 15))
const userId = computed(() => `anonymous_${anonymousId.value}`)

const participants = computed(() => {
  if (!room.value?.participants) return {} as Record<string, Participant>
  
  return Object.entries(room.value.participants).reduce((acc: Record<string, Participant>, [id, data]: [string, RoomParticipant]) => {
    acc[id] = {
      name: data.name,
      hasVoted: room.value?.currentVotes?.[id]?.value != null,
      vote: room.value?.currentVotes?.[id]?.value ?? null,
      isCurrentUser: id === userId.value
    }
    return acc
  }, {} as Record<string, Participant>)
})

const roomUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return ''
})

onMounted(() => {
  const roomId = route.params.id as string
  const unsubscribe = onSnapshot(
    doc($firestore as Firestore, 'rooms', roomId),
    (docSnapshot: { exists: () => boolean; id: string; data: () => any }) => {
      if (docSnapshot.exists()) {
        room.value = { id: docSnapshot.id, ...docSnapshot.data() } as Room
      }
    }
  )

  onUnmounted(() => unsubscribe())
})

async function joinRoom() {
  if (!userName.value || !room.value) return
  
  // Check if name is already taken
  const existingParticipant = Object.values(room.value.participants || {}).find(
    (p: any) => p.name.toLowerCase() === userName.value.toLowerCase()
  )
  
  if (existingParticipant) {
    alert('This name is already taken. Please choose another name.')
    return
  }
  
  try {
    const roomRef = doc($firestore as Firestore, 'rooms', room.value.id)
    await updateDoc(roomRef, {
      [`participants.${userId.value}`]: {
        name: userName.value,
        joinedAt: serverTimestamp()
      }
    })
    hasJoined.value = true
    
    // Check if user already had a vote
    if (room.value.currentVotes?.[userId.value]?.value) {
      currentVote.value = room.value.currentVotes[userId.value].value
    }
  } catch (error: any) {
    alert(error.message)
  }
}

async function submitVote(value: number) {
  if (!room.value || !hasJoined.value) return
  
  currentVote.value = value
  try {
    await vote(room.value.id, userId.value, userName.value, value)
  } catch (error: any) {
    alert(error.message)
  }
}

async function reveal() {
  if (!room.value) return
  
  try {
    await revealVotes(room.value.id)
  } catch (error: any) {
    alert(error.message)
  }
}

async function reset() {
  if (!room.value) return
  
  try {
    await resetVotes(room.value.id)
    currentVote.value = null
  } catch (error: any) {
    alert(error.message)
  }
}

watch(() => room.value?.revealed, (newValue: boolean, oldValue: boolean) => {
  // If votes are reset (revealed changes from true to false)
  if (oldValue === true && newValue === false) {
    currentVote.value = null
  }
})

function copyRoomUrl() {
  navigator.clipboard.writeText(roomUrl.value)
}

const votedParticipants = computed(() => {
  return Object.fromEntries(
    Object.entries(participants.value).filter(([_, p]) => p.hasVoted)
  ) as Record<string, Participant>
})

const notVotedParticipants = computed(() => {
  return Object.fromEntries(
    Object.entries(participants.value).filter(([_, p]) => !p.hasVoted)
  ) as Record<string, Participant>
})

async function removeParticipant(participantId: string) {
  if (!room.value) return
  
  try {
    const roomRef = doc($firestore as Firestore, 'rooms', room.value.id)
    const updates: Record<string, any> = {
      [`participants.${participantId}`]: deleteField(),
    }
    
    // Also remove their vote if they have one
    if (room.value.currentVotes?.[participantId]) {
      updates[`currentVotes.${participantId}`] = deleteField()
    }
    
    await updateDoc(roomRef, updates)
  } catch (error: any) {
    alert(error.message)
  }
}
</script>