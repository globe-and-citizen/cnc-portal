<template>
  <div data-test="contract-management" class="flex flex-col gap-y-4 py-6">
    <span class="text-3xl font-bold">Contract Management</span>
    <div class="divider m-0"></div>

    <div>
      <div class="overflow-x-auto">
        <table class="table table-zebra">
          <!-- head -->
          <thead class="text-sm font-bold">
            <tr>
              <th></th>
              <th>Type</th>
              <th>Address</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <!-- <MemberRow
              v-for="(member, index) in team.members"
              :ownerAddress="team.ownerAddress"
              :teamId="Number(team.id)"
              :member="{ ...member, index: index + 1 }"
              :key="member.address"
              @getTeam="emits('getTeam')"
            /> -->
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
