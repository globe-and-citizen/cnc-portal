<template>
  <div class="card w-80 bg-white ml-5 mt-5">
    <!-- <figure>
      <img :src="CompanyImage" alt="Company" />
    </figure> -->
    <div class="card-body">
      <h1 class="card-title">{{ CompanyName }}</h1>
      <p class="text-sm">{{ CompanyDescription }}</p>
      <div class="card-actions justify-between">
        <!-- <button class="btn btn-error">Delete</button>

        <button class="btn btn-primary">Edit</button> -->
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps(['CompanyName', 'CompanyDescription'])
</script>
