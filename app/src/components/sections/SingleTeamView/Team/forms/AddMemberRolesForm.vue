<template>
<!--Heading-->
  <section class="mb-5">
    <h1 class="font-bold text-2xl">Role Details</h1>
    <hr class="mt-4" />
  </section>

<!--Body-->
  <section v-if="roleCategories">
    <div 
      v-for="(role, index) of memberRoles" :key="index"
      class="p-4"
    >
      <label class="input input-bordered flex items-center gap-2 input-md">
        <select class="w-1/2 bg-white" v-model="role.role.roleCategoryId">
          <option value="0">-- Select Role Category --</option>
          <option 
            v-for="(roleCategory) of roleCategories?.roleCategories"
            :key="roleCategory.id"
            :value="roleCategory.id"
          >
            {{ roleCategory?.name }}
          </option>
        </select>
        <select class="w-1/2 bg-white" v-model="role.roleId">
          <option value="0">-- Select Role --</option>
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
  <section class="modal-action justify-center">
    <LoadingButton v-if="false" color="primary min-w-24" />
    <button class="btn btn-primary" @click="signContract">Add Roles</button>
    <button class="btn btn-active" >Cancel</button>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import LoadingButton from "@/components/ui/LoadingButton.vue"
import { useUserDataStore } from '@/stores/user'
import { useCustomFetch } from "@/composables/useCustomFetch";
import { deepClone } from "@/utils"
import type { RoleCategory, Role } from "@/types";

//#region state
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
//#endregion state

//#region helper functions
const createContract = () => {
  let contract
  for (const memberRole of memberRoles.value) {
    const roleCategory = roleCategories
      .value
      .roleCategories
      .find((category: RoleCategory) => 
        category.id === memberRole.role.roleCategoryId)

    const role = roleCategory
      .roles
      .find(
        (_role: Role) => 
          _role.id === memberRole.roleId
      )

    const entitlements = []

    for (const entitlement of role.entitlements) {
      if (
        entitlement.entitlementType.name === 'access' &&
        entitlement.value.split(':')[0] === 'expense-account'
      ) {
        entitlements.push(entitlement.value)
      }
    }

    if (entitlements.length > 0) {
      contract = {
        role: {
          name: role.name,
          entitlement: {
            name: "access",
            resource: entitlements[0].split(':')[0],
            accessLevel: entitlements[0].split(':')[1]
          }
        },
        assignedTo: props.memberAddress,
        assignedBy: useUserDataStore().address
      }
    }
  }

  return contract
}

const signContract = async () => {
  if (!createContract()) return
  const params = [
    useUserDataStore().address,
    {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" }
        ],
        Entitlement: [
          { name: "name", type: "string" },
          { name: "resource", type: "string" },
          { name: "accessLevel", type: "string" }
        ],
        Role: [
          { name: "name", type: "string" },
          { name: "entitlement", type: "Entitlement" }
        ],
        Contract: [
          { name: "assignedTo", type: "address" },
          { name: "assignedBy", type: "address" },
          { name: "role", type: "Role" }
        ]
      },
      primaryType: "Contract",
      domain: {
        "name": "CNC Contract",
        "version": "1"
      },
      message: createContract()
    }
  ]
  try {
    return await (window as any).ethereum.request({method: "eth_signTypedData_v4", params: params})
  } catch (error) {
    console.log(`error: `, error)
  }
}

const getRoles = (index: number) => {
  const id = memberRoles.value[index].role.roleCategoryId
  const roleCategory = roleCategories.value.roleCategories.find((category: RoleCategory) => category.id === id)
  return roleCategory? roleCategory.roles: []
}

const addRole = () => {
  let role = memberRoles.value.find(role => parseInt(`${role.role.roleCategoryId}`) === 0)
  if(!role)
    memberRoles.value.push(deepClone(initRole));
};

const removeRole = () => {
  if (memberRoles.value.length > 1) {
    memberRoles.value.pop();
  }
};
//#endregion helper functions

//#region api
const {
  execute: executeFetchRoleCategories,
  data: roleCategories
} = useCustomFetch('role-category', {
  immediate: false
})
  .get()
  .json()
//#endregion api

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
})
</script>