<template>
  <!--Heading-->
  <header v-if="props.isSingleView" class="mb-5">
    <h1 class="font-bold text-2xl">Role Details</h1>
    <hr class="mt-4" />
  </header>

  <!--Name, Description Inputs-->
  <div class="space-y-2">
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-24">Name</span>
      <input type="text" class="grow" placeholder="Role name" v-model="role.name" />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-24">Description</span>
      <input
        type="text"
        class="grow"
        placeholder="Enter a short description"
        v-model="role.description"
      />
    </label>
  </div>

  <!--Entitlements Section-->
  <div class="join join-vertical w-full mt-5 bg-white">
    <div
      v-for="(input, index) in role.entitlements"
      :key="index"
      class="collapse collapse-arrow join-item border-base-300 border"
    >
      <input type="radio" name="entitlement-accordion" />
      <div class="collapse-title text-l font-medium">
        Entitlement - {{ getEntitlementName(input.type as unknown as number) ?? index + 1 }}
      </div>
      <div class="collapse-content">
        <AddEntitlementForm
          v-model="role.entitlements[index]"
          :available-types="getAvailableTypes(index)"
        />
      </div>
    </div>
  </div>

  <!--Add, Remove Buttons-->
  <div class="flex justify-end pt-3">
    <div
      class="w-6 h-6 cursor-pointer"
      @click="
        () => {
          if (role.entitlements.length > 1) {
            role.entitlements.pop()
          }
        }
      "
    >
      <IconMinus />
    </div>
    <div
      class="w-6 h-6 cursor-pointer"
      @click="
        () => {
          role.entitlements.push({ type: 0, rule: '' })
        }
      "
    >
      <IconPlus />
    </div>
  </div>

  <!--Cancel Update Buttons-->
  <footer v-if="props.isSingleView" class="flex justify-center space-x-2 mt-4">
    <button class="btn btn-primary">Update</button>
    <button class="btn btn-active" @click="emits('closeModal')">Cancel</button>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconMinus from '@/components/icons/IconMinus.vue'
import AddEntitlementForm from './AddEntitlementForm.vue'

const getEntitlementName = (typeId: number) => {
  const entitlement = entTypes.value.find((ent) => ent.id === typeId)
  return entitlement ? entitlement.name : undefined
}

const getAvailableTypes = (index: number) => {
  return computed(() => {
    const selectedTypes = role.value.entitlements.map((entitlement) => entitlement.type)
    return entTypes.value.filter(
      (type) =>
        type.id === -1 ||
        !selectedTypes.includes(type.id) ||
        role.value.entitlements[index].type === type.id
    )
  })
}

const entTypes = ref([
  { id: 1, name: 'salary' },
  { id: 2, name: 'dividend' },
  { id: 3, name: 'wage' },
  { id: 4, name: 'tokens' },
  { id: 5, name: 'access' },
  { id: 6, name: 'vote' },
  { id: -1, name: '-- Create New --' }
])

const emits = defineEmits(['closeModal'])

const role = defineModel({
  default: {
    name: '',
    description: '',
    entitlements: [
      {
        type: 0,
        rule: ''
      }
    ]
  }
})

const props = defineProps<{ isSingleView?: boolean }>()
</script>
