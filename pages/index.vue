<template>
  <div class="max-w-4xl mx-auto">
    <div class="w-full mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">Agile Poker</h1>
      <button
        @click="showCreateRoom = true"
        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
      >
        Create Room
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Loading rooms...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="rooms.length === 0" class="text-center py-8">
      <p class="text-gray-600">No rooms available. Create one to get started!</p>
    </div>

    <!-- Rooms Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div
        v-for="room in rooms"
        :key="room.id"
        @click="router.push(`/room/${room.id}`)"
        class="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow"
      >
        <h3 class="font-semibold text-lg mb-2">{{ room.name }}</h3>
        <p class="text-sm text-gray-600">Created {{ formatDate(room.createdAt) }}</p>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateRoom" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-bold mb-4">Create New Room</h2>
        <form @submit.prevent="createNewRoom">
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Room Name</label>
            <input
              type="text"
              v-model="newRoomName"
              class="w-full px-3 py-2 border rounded-lg"
              required
            >
          </div>
          <div class="flex justify-end gap-4">
            <button
              type="button"
              @click="showCreateRoom = false"
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { usePokerRoom } from '../composables/usePokerRoom'
import { useRouter } from 'vue-router'
import { format } from 'timeago.js'

const { createRoom, getRooms } = usePokerRoom()
const router = useRouter()

const showCreateRoom = ref(false)
const newRoomName = ref('')
const rooms = ref<any[]>([])
const loading = ref(true)
const error = ref('')

// Generate a random ID for anonymous users that persists during the session
const anonymousId = ref(Math.random().toString(36).substring(2, 15))

// Format the date using timeago
const formatDate = (date: any) => {
  if (!date) return ''
  return format(date.toDate())
}

onMounted(async () => {
  try {
    loading.value = true
    error.value = ''
    const fetchedRooms = await getRooms(`anonymous_${anonymousId.value}`)
    rooms.value = fetchedRooms
  } catch (error: any) {
    error.value = error.message || 'Failed to fetch rooms'
  } finally {
    loading.value = false
  }
})

async function createNewRoom() {
  try {
    const room = await createRoom(newRoomName.value, `anonymous_${anonymousId.value}`)
    showCreateRoom.value = false
    newRoomName.value = ''
    // Refresh rooms after creating a new one
    const updatedRooms = await getRooms(`anonymous_${anonymousId.value}`)
    rooms.value = updatedRooms
    router.push(`/room/${room.id}`)
  } catch (error: any) {
    console.error('Error creating room:', error.message)
  }
}
</script>