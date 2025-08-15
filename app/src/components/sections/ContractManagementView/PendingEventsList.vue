<template>
	<TableComponent 
		:rows="pendingEvents"
		:columns="columns"
	>
		<template #description-data="{ row }">
			{{  row.description }}
		</template>

		<template #requestedBy-data="{ row }">
			{{ row.requestedBy }}
		</template>

		<template #dateCreated-data="{ row }">
			{{ row.dateCreated }}
		</template>

		<template #actions-data="{ row }">
			<ButtonUI variant="success" size="sm">Approve</ButtonUI>
		</template>
	</TableComponent>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import TableComponent from '@/components/TableComponent.vue';
import ButtonUI from '@/components/ButtonUI.vue';

const pendingEvents = ref([
	{ index: 1, description: 'Transfer ownership to BOD', requestedBy: 'User1', dateCreated: '2023-01-01' },
	{ index: 2, description: 'Transfer ownership to Member', requestedBy: 'User2', dateCreated: '2023-01-02' },
	{ index: 3, description: 'Transfer ownership to BOD', requestedBy: 'User3', dateCreated: '2023-01-03', }
])

const columns=[
	{ key: 'index', label: '#' },
	{ key: 'description', label: 'Description' },
	{ key: 'requestedBy', label: 'Requested By' },
	{ key: 'dateCreated', label: 'Date Created' },
	{ key: 'actions', label: 'Actions' }
]
</script>