<template>
  <div id="add-action-form" class="flex flex-col gap-4">
    <!--<h2>Add Action</h2>
    <label class="input input-bordered flex items-center gap-4">
      Target
      <input
        type="text"
        class="grow"
        v-model="target"
        placeholder="Enter the target address"
        @focus="showTargetSuggestion = true"
        @change="
          () => {
            targetSuggestions = targetSuggestions.filter((t) => {
              return t.toLowerCase().includes(target.toLowerCase())
            })
          }
        "
      />
    </label>
    <div
      class="dropdown"
      :class="{ 'dropdown-open': !!targetSuggestions && targetSuggestions.length > 0 }"
      v-if="showTargetSuggestion"
    >
      <ul class="p-2 shadow menu dropdown-content bg-base-100 rounded-box w-full">
        <li v-for="(suggestion, index) in targetSuggestions" :key="index">
          <a
            @click="
              () => {
                target = suggestion
                showTargetSuggestion = false
              }
            "
          >
            {{ suggestion }} {{ suggestionContractName(suggestion) }}
          </a>
        </li>
      </ul>
    </div>
    <label class="input input-bordered flex items-center gap-4">
      Description
      <input type="text" class="grow" v-model="description" placeholder="Enter the description" />
    </label>
    <label class="input input-bordered flex items-center gap-4">
      Function Signature
      <input type="text" class="grow" v-model="data" placeholder="Enter the function signature" />
    </label>
    <div class="form-control">
      <LoadingButton v-if="loading" color="primary" class="w-full" />
      <button
        v-else
        class="btn btn-primary"
        @click.prevent="
          $emit('addAction', {
            targetAddress: target,
            description,
            data
          })
        "
      >
        Add
      </button>
    </div>-->
  </div>
</template>

<script setup lang="ts">
// import LoadingButton from '@/components/LoadingButton.vue'
// import type { Team } from '@/types'
// import { ref } from 'vue'

// const props = defineProps<{ team: Partial<Team>; loading: boolean }>()
// defineEmits(['addAction'])

// const target = ref('')
// const description = ref('')
// const data = ref('')
// const showTargetSuggestion = ref(false)
// const targetSuggestions = ref<string[]>([
//   props.team.bankAddress!,
//   ...(props.team.expenseAccountAddress ? [props.team.expenseAccountAddress] : [])
// ])

// const suggestionContractName = (contractAddress: string) => {
//   switch (contractAddress) {
//     case props.team.bankAddress:
//       return '(Bank Address)'
//     case props.team.expenseAccountAddress:
//       return '(Expense A/c Address)'
//     default:
//       break
//   }
// }
</script>
