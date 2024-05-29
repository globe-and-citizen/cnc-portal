<template>
<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Toast Notification Demo</h1>
    <div class="grid grid-cols-4 gap-4">
        <button class="btn btn-info" @click="showInfoToast">Info</button>
        <button class="btn btn-success" @click="showSuccessToast">Success</button>
        <button class="btn btn-warning" @click="showWarningToast">Warning</button>
        <button class="btn btn-error" @click="showErrorToast">Error</button>
    </div>
    <ToastContainer position="bottom-center"/>
</div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/useToastStore';
import ToastContainer from '@/components/ToastContainer.vue';
import { ToastType } from "@/types";

const { addToast } = useToastStore();

const showInfoToast = () => {
    addToast('This is an info toast!', ToastType.Info, 5000);
};

const showSuccessToast = () => {
    addToast('This is a success toast!', ToastType.Success, 5000);
};

const showWarningToast = () => {
    addToast('This is a warning toast!', ToastType.Warning, 5000);
};

const showErrorToast = () => {
    addToast('This is an error toast!', ToastType.Error, 5000);
};
</script>

<style scoped>
.container {
max-width: 1200px;
}
.grid {
gap: 1rem;
}
</style>
  