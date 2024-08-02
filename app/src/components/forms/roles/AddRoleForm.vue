<template>
  <!--Heading-->
  <header v-if="props.isSingleView" class="mb-5">
    <h1 class="font-bold text-2xl">Role Details</h1>
    <hr class="mt-4" />
  </header>

  <!--Name, Description Inputs-->
  <div class="space-y-2">
    <label
      class="input input-bordered flex items-center gap-2 input-md mt-4"
      :class="{ 'input-error': $v.role.$errors.length }"
    >
      <span class="w-24">Name</span>
      <input
        type="text"
        class="grow"
        placeholder="Role name"
        v-model="role.name"
        @input="
          async () => {
            await $v.$validate()
          }
        "
      />
    </label>
    <FormErrorMessage v-if="$v.role.$errors.length">
      <div v-for="error of $v.role.$errors" :key="error.$uid">{{ error.$message }}</div>
    </FormErrorMessage>
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
        Entitlement -
        {{ getEntitlementName(input.entitlementTypeId as unknown as number) ?? index + 1 }}
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
      <!--<IconMinus />-->
      <MinusCircleIcon class="size-6" />
    </div>
    <div
      class="w-6 h-6 cursor-pointer"
      @click="
        () => {
          role?.entitlements?.push({ entitlementTypeId: 0, value: '' })
        }
      "
    >
      <!--<IconPlus />-->
      <PlusCircleIcon class="size-6" />
    </div>
  </div>

  <!--Cancel Update Buttons-->
  <footer v-if="props.isSingleView" class="flex justify-center space-x-2 mt-4">
    <button
      v-if="props.categoryId"
      class="btn btn-primary"
      @click="handleClickAddRole(props.categoryId)"
    >
      Add Role
    </button>
    <button v-else class="btn btn-primary" @click="handleClickUpdate(/*(role as any).id*/)">
      Update
    </button>
    <button
      class="btn btn-active"
      @click="
        () => {
          emits('closeModal')
          emits('reload')
        }
      "
    >
      Cancel
    </button>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/vue/24/outline'
import AddEntitlementForm from './AddEntitlementForm.vue'
import FormErrorMessage from '../../ui/FormErrorMessage.vue'
import type { EntitlementType } from '@/types'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { useToastStore } from '@/stores/useToastStore'

const { addErrorToast } = useToastStore()

const getEntitlementName = (typeId: number) => {
  const entitlement = entTypes.value?.entTypes?.find(
    (entType: EntitlementType) => entType.id === typeId
  )
  return entitlement ? entitlement.name : undefined
}

const getAvailableTypes = (index: number) => {
  return computed(() => {
    const selectedTypes = role?.value?.entitlements?.map(
      (entitlement) => entitlement.entitlementTypeId
    )
    return entTypes.value?.entTypes?.filter(
      (entType: EntitlementType) =>
        entType.id === -1 ||
        !selectedTypes?.includes(entType.id) ||
        role?.value?.entitlements[index].entitlementTypeId === entType.id
    )
  })
}

const emits = defineEmits(['closeModal', 'reload'])

const role = defineModel({
  default: {
    name: '',
    description: '',
    entitlements: [
      {
        entitlementTypeId: 0,
        value: ''
      }
    ]
  }
})

//#region validation
const rules = {
  role: {
    name: { required }
  }
}

const $v = useVuelidate(rules, { role })
//#endregion validation

const props = defineProps<{
  isSingleView?: boolean
  categoryId?: number /*
  _role?: Role*/
}>()
const roleEndPoint = ref('')

const { execute: executeFetchEntitlementTypes, data: entTypes } = useCustomFetch<{
  success: boolean
  entTypes: { id: number; name: string }
}>(`entitlement/types`, {
  immediate: false
})
  .get()
  .json()

const { execute: executeUpdateRole } = useCustomFetch(roleEndPoint, {
  immediate: false
})
  .put(role)
  .json()

const { execute: executeCreateRole } = useCustomFetch(roleEndPoint, {
  immediate: false
})
  .post(role)
  .json()

const handleClickUpdate = async () => {
  await $v.value.$validate()
  if ($v.value.$errors.length) {
    addErrorToast('Form invalid, arboting...')
    return
  }
  roleEndPoint.value = `role/`

  await executeUpdateRole()
  emits('reload')
  emits('closeModal')
}

const handleClickAddRole = async (id: number) => {
  await $v.value.$validate()
  if ($v.value.$errors.length) {
    addErrorToast('Form invalid, arboting...')
    return
  }
  roleEndPoint.value = `role/${id}`
  await executeCreateRole()
  emits('reload')
  emits('closeModal')
}

onMounted(async () => {
  await executeFetchEntitlementTypes()
})
</script>
