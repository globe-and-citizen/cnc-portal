<template>
<!--Heading-->
  <section class="mb-5">
    <h1 class="font-bold text-2xl">Role Details</h1>
    <hr class="mt-4" />
  </section>

<!--Body-->
  <section v-if="roleCategories">
    <div v-for="(role, index) of memberRoles" :key="index">
      <label class="input input-bordered flex items-center gap-2 input-md">
        <select class="w-24 bg-white" v-model="role.role.roleCategoryId">
          <option value="0">-- Role Category --</option>
          <option 
            v-for="(roleCategory) of roleCategories?.roleCategories"
            :key="roleCategory.id"
            :value="roleCategory.id"
          >
            {{ roleCategory?.name }}
          </option>
        </select>
        <select class="grow bg-white" v-model="role.roleId">
          <option value="0">-- Role --</option>
          <option
            v-for="(role, roleIndex) of getRoles(index)"
            :key="role?.id? role.id: roleIndex"
            :value="role?.id"
          >
            {{ role?.name }}
          </option>
        </select>
      </label>
    </div>
  </section>

<!--Add/Remove Buttons-->
  <section class="flex justify-end">
    <div
      class="w-6 h-6 cursor-pointer"
      @click="removeRole"
    >
      <MinusCircleIcon class="size-6" />
    </div>
    <div
      class="w-6 h-6 cursor-pointer"
      @click="addRole"
    >
      <PlusCircleIcon class="size-6" />
    </div>
  </section>

<!--Action Buttons-->
  <section>
    
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import { useCustomFetch } from "@/composables/useCustomFetch";
import { deepClone } from "@/utils"
import type { RoleCategory } from "@/types";

const props = defineProps<{
  memberAddress: string | undefined;
}>()

const initRole = {
  id: 0, 
  roleId: 0,
  role: { 
    roleCategoryId: 0
  }
}

const memberRoles = defineModel({
  default: [{
    id: 0, 
    roleId: 0,
    role: { 
      roleCategoryId: 0
    }
  }]
})

const getRoles = (index: number) => {
  const id = memberRoles.value[index].role.roleCategoryId
  const roleCategory = roleCategories.value.roleCategories.find((category: RoleCategory) => category.id === id)
  return roleCategory? roleCategory.roles: []
}

const addRole = () => {
  memberRoles.value.push(deepClone(initRole));
};

const removeRole = () => {
  if (memberRoles.value.length > 1) {
    memberRoles.value.pop();
  }
};

const {
  execute: executeFetchRoleCategories,
  data: roleCategories
} = useCustomFetch('role-category', {
  immediate: false
})
  .get()
  .json()

watch(
  memberRoles, (newVal) => {
    if (newVal.length === 0) {
      memberRoles.value.push(deepClone(initRole));
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await executeFetchRoleCategories()
  console.log('roleCategories: ', roleCategories.value.roleCategories)
})
</script>