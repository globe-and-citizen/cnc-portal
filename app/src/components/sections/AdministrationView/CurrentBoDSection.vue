<template>
  <CardComponent title="Current Board of Directors">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-4"
    >
      <UserComponentCol
        v-for="member in boardOfDirectors"
        :key="member.address"
        :user="member"
        :isCollapsed="true"
      />
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import CardComponent from '@/components/CardComponent.vue'
import UserComponentCol from '@/components/UserComponentCol.vue'

const boardOfDirectors = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Alice Johnson' /*,
		imageUrl: 'https://example.com/images/alice.jpg'*/
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'Bob Smith' /*,
		imageUrl: 'https://example.com/images/bob.jpg'*/
  },
  {
    address: '0x7890abcdef1234567890abcdef12345678901234',
    name: 'Charlie Brown' /*,
		imageUrl: 'https://example.com/images/charlie.jpg'*/
  },
  {
    address: '0x4567890abcdef1234567890abcdef1234567890',
    name: 'Diana Prince' /*,
		imageUrl: 'https://example.com/images/diana.jpg'*/
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef56',
    name: 'Ethan Hunt' /*,
		imageUrl: 'https://example.com/images/ethan.jpg'*/
  }
]
</script>
