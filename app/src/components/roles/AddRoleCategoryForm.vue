<template>
  <div>
    <h1 class="font-bold text-2xl">{{ isNew ? 'Create' : 'Update' }} Role Category</h1>
    <hr class="mt-4" />
  </div>

  <div class="max-h-[70vh] overflow-auto">
    <!--General Inputs-->
    <section class="flex flex-col gap-2">
      <label class="input input-bordered flex items-center gap-2 input-md mt-4">
        <span class="w-24">Name</span>
        <input
          type="text"
          class="grow"
          placeholder="Enter a role category name"
          v-model="roleCategory.name"
        />
      </label>
      <label class="input input-bordered flex items-center gap-2 input-md">
        <span class="w-24">Description</span>
        <input
          type="text"
          class="grow"
          placeholder="Enter a short description"
          v-model="roleCategory.description"
        />
      </label>
    </section>

    <div v-if="props.isNew">
      <!--Roles-->
      <section class="mt-10">
        <div
          v-for="(input, index) in roleCategory.roles"
          :key="index"
          class="collapse collapse-plus bg-base-200 border mt-2"
        >
          <input type="radio" name="my-accordion-3" />
          <div class="collapse-title text-xl font-medium">
            Role - {{ input.name ? input.name : index + 1 }}
          </div>
          <div class="collapse-content">
            <AddRoleForm v-model="roleCategory.roles[index]" />
          </div>
        </div>
      </section>

      <!--Roles Add Remove Roles Buttons-->
      <div class="flex justify-end pt-3">
        <div
          class="w-6 h-6 cursor-pointer"
          @click="
            () => {
              if (roleCategory.roles.length > 1) {
                roleCategory.roles.pop()
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
              roleCategory.roles.push({
                name: '',
                description: '',
                entitlements: [
                  {
                    type: 0,
                    rule: ''
                  }
                ]
              })
            }
          "
        >
          <IconPlus />
        </div>
      </div>
    </div>

    <!--Role Category Entitlements-->
    <section class="join join-vertical w-full mt-10">
      <div
        v-for="(input, index) in roleCategory.entitlements"
        :key="index"
        class="collapse collapse-arrow join-item border-base-300 border"
      >
        <input type="radio" name="category-entitlement-accordion" />
        <div class="collapse-title text-l font-medium">
          Category Entitlement -
          {{ getEntitlementName(input.type as unknown as number) ?? index + 1 }}
        </div>
        <div class="collapse-content">
          <AddEntitlementForm
            v-model="roleCategory.entitlements[index]"
            :available-types="getAvailableTypes(index)"
          />
        </div>
      </div>
    </section>

    <!--Role Category Entitlements Add Remove Buttons-->
    <div class="flex justify-end pt-3">
      <div
        class="w-6 h-6 cursor-pointer"
        @click="
          () => {
            if (roleCategory.entitlements.length > 1) {
              roleCategory.entitlements.pop()
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
            roleCategory.entitlements.push({
              type: 0,
              rule: ''
            })
          }
        "
      >
        <IconPlus />
      </div>
    </div>
  </div>
  <!--Submit Button-->
  <div class="modal-action justify-center">
    <!-- if there is a button in form, it will close the modal -->
    <LoadingButton v-if="isLoading" color="primary min-w-24" />
    <button
      class="btn btn-primary"
      @click="
        () => {
          console.log('roleCategory: ', roleCategory)
        }
      "
      v-else
    >
      {{ isNew ? `Create` : `Update` }}
    </button>
    <button class="btn btn-active" @click="emits('closeModal')">Cancel</button>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconMinus from '@/components/icons/IconMinus.vue'
import LoadingButton from '../LoadingButton.vue'
import AddRoleForm from './AddRoleForm.vue'
import AddEntitlementForm from './AddEntitlementForm.vue'

const getAvailableTypes = (index: number) => {
  return computed(() => {
    const selectedTypes = roleCategory.value.entitlements.map((entitlement) => entitlement.type)
    return entTypes.value.filter(
      (type) =>
        type.id === -1 ||
        !selectedTypes.includes(type.id) ||
        roleCategory.value.entitlements[index].type === type.id
    )
  })
}

const roleCategory = defineModel({
  default: {
    name: '',
    description: '',
    roles: [
      {
        name: '',
        description: '',
        entitlements: [
          {
            type: 0,
            rule: ''
          }
        ] /*,
      isValid: false}*/
      }
    ],
    entitlements: [
      {
        type: 0,
        rule: ''
      }
    ]
  }
})

const entTypes = ref([
  { id: 1, name: 'salary' },
  { id: 2, name: 'dividend' },
  { id: 3, name: 'wage' },
  { id: 4, name: 'tokens' },
  { id: 5, name: 'access' },
  { id: 6, name: 'vote' },
  { id: -1, name: '-- Create New --' }
])

const getEntitlementName = (typeId: number) => {
  const entitlement = entTypes.value.find((ent) => ent.id === typeId)
  return entitlement ? entitlement.name : undefined
}
const emits = defineEmits(['addRole', 'searchUsers', 'closeModal'])
const props = defineProps<{
  //users: User[]
  isNew?: boolean
  isLoading: boolean
}>()
</script>
