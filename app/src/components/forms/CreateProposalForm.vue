<template>
  <div>
    <h2>Create Proposal</h2>
    <div class="flex flex-col gap-4 mt-2">
      <select class="select select-primary w-full" v-model="proposalType">
        <option disabled selected>Type of Proposal</option>
        <option value="election">Election</option>
        <option value="proposal">Directive</option>
      </select>
      <input type="text" placeholder="Title" class="input input-primary w-full" />

      <textarea class="textarea textarea-primary h-24" placeholder="Description"></textarea>
      <input
        v-if="proposalType === 'election'"
        type="text"
        placeholder="Candidate"
        class="input input-bordered"
      />
      <input type="datetime-local" placeholder="Start Date and Time" class="input input-primary" />
      <input type="datetime-local" placeholder="End Date and Time" class="input input-primary" />

      <div class="flex justify-center">
        <button class="btn btn-primary btn-md justify-center" @click="handleSubmit">
          Create Proposal
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const proposalType = ref<string | null>('election')

function handleSubmit() {}
</script>
