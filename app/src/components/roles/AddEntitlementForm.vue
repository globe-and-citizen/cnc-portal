<template>
    <div class="space-y-2">
        <label class="input input-bordered flex items-center gap-2 input-md mt-4">
            <span class="w-24">Type</span>
            <select v-model="entitlement.type" class="grow bg-white">
                <option v-for="(item, index) in availableTypes" :key="item.id" :value="item.id">
                    {{ item.name }}
                </option>
            </select>
        </label>
        <label class="input input-bordered flex items-center gap-2 input-md">
            <span class="w-24">Value</span>
            <input
                type="text"
                class="grow"
                placeholder="Enter a short description"
                v-model="entitlement.rule"
            />
        </label>
    </div>
</template>

<script setup lang="ts">
import { ref, type ComputedRef } from "vue";
const entitlement = defineModel({
    default: {
        type: 0,
        rule: ''
    }
})

const props = defineProps<{
    availableTypes: ComputedRef<{id: number, name: string}[]>
}>();

const availableTypes = ref(props.availableTypes);
</script>