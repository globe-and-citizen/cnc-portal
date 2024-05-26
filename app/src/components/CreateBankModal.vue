<template>
  <dialog id="my_modal_4" class="modal modal-bottom sm:modal-middle modal-open">
    <div class="modal-box">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="$emit('closeModal')"
      >
        ✕
      </button>

      <h1 class="font-bold text-2xl">Create Team Bank Contract</h1>
      <h3 class="pt-8">
        By clicking "Deploy Bank Contract" you agree to deploy the team bank contract and this may
        take some time and pay for gas fee.
      </h3>

      <div class="modal-action justify-center">
        <button class="btn btn-primary" @click="$emit('createBank')">Deploy Bank Contract</button>
        <button class="btn btn-error" @click="$emit('closeModal')">Cancel</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
defineEmits(['closeModal', 'createBank'])
</script>
