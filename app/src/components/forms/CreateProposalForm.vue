<template>
  <div>
    <h2>Create Proposal</h2>
    <div class="flex flex-col gap-4 mt-2">
      <select class="select select-primary w-full" v-model="newProposalInput.isElection">
        <option disabled selected>Type of Proposal</option>
        <option :value="true">Election</option>
        <option :value="false">Directive</option>
      </select>
      <input
        type="text"
        placeholder="Title"
        class="input input-primary w-full"
        v-model="newProposalInput.title"
      />

      <textarea
        class="textarea textarea-primary h-24"
        placeholder="Description"
        v-model="newProposalInput.description"
      ></textarea>
      <input
        v-if="newProposalInput.isElection"
        type="text"
        placeholder="Candidate"
        class="input input-bordered"
        v-model="newProposalInput.candidates"
      />

      <div class="flex justify-center">
        <button class="btn btn-primary btn-md justify-center" @click="emits('createProposal')">
          Create Proposal
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emits = defineEmits(['createProposal'])
const newProposalInput = defineModel({
  default: {
    title: '',
    description: '',
    candidates: [],
    isElection: false
  }
})
</script>
