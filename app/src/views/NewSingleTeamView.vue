<template>
  <div class="min-h-screen bg-gray-50">
    <div class="flex flex-col">
      <!-- Main Content -->
      <main class="flex-1 p-4 sm:p-6">
        <div class="mb-6">
          <div class="breadcrumbs text-sm mb-4 overflow-x-auto">
            <ul class="flex">
              <li><a>Dashboard</a></li>
              <li><a>Team</a></li>
              <li>Celebrity Fanalyzer</li>
            </ul>
          </div>

          <h1 class="text-2xl font-bold">Team Page</h1>
        </div>

        <!-- Team Banner -->
        <div class="bg-gradient-to-r from-primary to-secondary rounded-xl overflow-hidden mb-6">
          <div class="p-4 sm:p-6 pt-16 sm:pt-32">
            <div class="flex flex-col sm:flex-row text-white">
              <img
                alt="Team Logo"
                src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                class="h-20 w-20 rounded-lg mb-4 sm:mb-0"
              />
              <div class="sm:ml-4 mt-2">
                <h2 class="text-2xl font-bold">Team Name</h2>
                <p class="text-gray-200">Team Description</p>
              </div>
            </div>
          </div>

          <div
            class="flex justify-start sm:justify-end bg-white border-t px-4 sm:px-6 py-3 overflow-x-auto"
          >
            <div class="flex gap-4 sm:gap-6">
              <button
                @click="activeTab = 'team'"
                :class="{ 'text-primary border-b-2 border-primary': activeTab === 'team' }"
                class="flex items-center btn btn-ghost gap-2 px-2 sm:px-4 py-2 rounded-lg whitespace-nowrap"
              >
                <UsersIcon class="h-5 w-5" />
                <span class="hidden sm:inline">Team Detail</span>
              </button>
              <button
                @click="activeTab = 'bank'"
                :class="{ 'text-primary border-b-2 border-primary': activeTab === 'bank' }"
                class="flex items-center btn btn-ghost gap-2 px-2 sm:px-4 py-2 rounded-lg whitespace-nowrap"
              >
                <CreditCardIcon class="h-5 w-5" />
                <span class="hidden sm:inline">Bank Account</span>
              </button>
              <button
                @click="activeTab = 'transactions'"
                :class="{
                  'text-primary border-b-2 border-primary': activeTab === 'transactions'
                }"
                class="flex items-center btn btn-ghost gap-2 px-2 sm:px-4 py-2 rounded-lg whitespace-nowrap"
              >
                <ArrowsRightLeftIcon class="h-5 w-5" />
                <span class="hidden sm:inline">Bank Transactions</span>
              </button>
              <button
                @click="activeTab = 'contracts'"
                :class="{
                  'text-primary border-b-2 border-primary': activeTab === 'contracts'
                }"
                class="flex items-center btn btn-ghost gap-2 px-2 sm:px-4 py-2 rounded-lg whitespace-nowrap"
              >
                <DocumentTextIcon class="h-5 w-5" />
                <span class="hidden sm:inline">Contracts Management</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Contracts Section -->
        <div v-if="activeTab === 'contracts'" class="bg-white rounded-xl shadow-sm">
          <div class="p-4 sm:p-6">
            <h3 class="text-xl font-bold mb-4">Contracts Management</h3>

            <div class="space-y-4 mb-6">
              <div class="flex items-center gap-2">
                <UserIcon class="h-5 w-5 text-secondary" />
                <span>Acting as: </span>
                <span class="font-medium">BOD Member</span>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                <UsersIcon class="h-5 w-5 text-secondary" />
                <span>Team Owner: </span>
                <span class="font-medium break-all"
                  >0x70997970C51812dc3A010C7d01b50e0d17dc79C8</span
                >
                <button class="p-1 hover:bg-gray-100 rounded">
                  <ClipboardIcon class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-3 px-4">Contract Type</th>
                    <th class="text-left py-3 px-4">Address</th>
                    <th class="text-left py-3 px-4">ContractCreator</th>
                    <th class="text-left py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="i in 6" :key="i" class="border-b border-gray-200">
                    <td class="py-3 px-4">Bank Contract</td>
                    <td class="py-3 px-4 break-all">0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</td>
                    <td class="py-3 px-4 break-all">0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</td>
                    <td class="py-3 px-4">
                      <button class="text-secondary hover:text-secondary-700">Action</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between mt-4">
              <div class="flex items-center gap-2 mb-2 sm:mb-0">
                <span class="text-sm text-gray-600">Rows per page:</span>
                <select class="border rounded px-2 py-1">
                  <option>5</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">1-5 of 20</span>
                <button class="p-1 rounded hover:bg-gray-100">
                  <ChevronLeftIcon class="h-5 w-5" />
                </button>
                <button class="p-1 rounded hover:bg-gray-100">
                  <ChevronRightIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Team Bank Account Section -->
        <div v-if="activeTab === 'bank'" class="bg-white rounded-xl shadow-sm mb-6">
          <div class="p-4 sm:p-6">
            <h3 class="text-xl font-bold mb-6">Team Bank Account</h3>

            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
                <div class="flex items-center gap-2 mb-2 sm:mb-0">
                  <UserIcon class="h-5 w-5 text-gray-500" />
                  <span class="text-gray-600">Bank Contract Owner</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-mono break-all"
                    >0x70997970C51812dc3A010C7d01b50e0d17dc79C8</span
                  >
                  <button class="p-1 hover:bg-gray-100 rounded">
                    <ClipboardIcon class="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
                <div class="flex items-center gap-2 mb-2 sm:mb-0">
                  <AtSignIcon class="h-5 w-5 text-gray-500" />
                  <span class="text-gray-600">Bank Proxy Address</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-mono break-all"
                    >0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</span
                  >
                  <button class="p-1 hover:bg-gray-100 rounded">
                    <ClipboardIcon class="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div class="flex items-center justify-between py-2">
                <div class="flex items-center gap-2">
                  <WalletIcon class="h-5 w-5 text-gray-500" />
                  <span class="text-gray-600">Bank Account Balance</span>
                </div>
                <span class="font-medium">19.30 MATIC</span>
              </div>

              <div class="flex items-center justify-between py-2">
                <div class="flex items-center gap-2">
                  <ActivityIcon class="h-5 w-5 text-gray-500" />
                  <span class="text-gray-600">Bank Account Status</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">Paused</span>
                  <InfoIcon class="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 mt-6">
              <button class="px-4 py-2 btn btn-primary rounded-lg">Deposit</button>
              <button class="px-4 py-2 btn btn-primary rounded-lg">Transfer</button>
              <button class="px-4 py-2 btn btn-primary rounded-lg">Send To Members</button>
            </div>
          </div>
        </div>

        <!-- Bank Transactions History Section -->
        <div v-if="activeTab === 'transactions'" class="bg-white rounded-xl shadow-sm">
          <div class="p-4 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 class="text-xl font-bold mb-4 sm:mb-0">Bank Transactions History</h3>
              <div class="flex flex-wrap gap-4">
                <button class="flex items-center btn btn-ghost gap-2 px-4 py-2 rounded-lg">
                  <DownloadIcon class="h-5 w-5" />
                  Deposit
                </button>
                <button class="flex items-center btn btn-ghost gap-2 px-4 py-2 rounded-lg">
                  <BuildingIcon class="h-5 w-5" />
                  Team Bank Account
                </button>
                <button class="flex items-center btn btn-ghost gap-2 px-4 py-2 rounded-lg">
                  <ArrowsRightLeftIcon class="h-5 w-5" />
                  Bank Transactions
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="text-left py-3 px-4">Name</th>
                    <th class="text-left py-3 px-4">Address</th>
                    <th class="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="i in 9" :key="i" class="border-b border-gray-200">
                    <td class="py-3 px-4">John Doe</td>
                    <td class="py-3 px-4 font-mono break-all">
                      0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button class="p-1 hover:bg-gray-100 rounded">
                        <MoreVerticalIcon class="h-5 w-5 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between mt-4">
              <div class="flex items-center gap-2 mb-2 sm:mb-0">
                <span class="text-sm text-gray-600">Rows per page:</span>
                <select class="border rounded px-2 py-1">
                  <option>5</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">1-5 of 20</span>
                <button class="p-1 rounded hover:bg-gray-100">
                  <ChevronLeftIcon class="h-5 w-5" />
                </button>
                <button class="p-1 rounded hover:bg-gray-100">
                  <ChevronRightIcon class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  UserIcon,
  UsersIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  ClipboardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AtSymbolIcon as AtSignIcon,
  WalletIcon,
  XCircleIcon as ActivityIcon,
  InformationCircleIcon as InfoIcon,
  ArrowDownCircleIcon as DownloadIcon,
  BuildingOfficeIcon as BuildingIcon,
  EllipsisVerticalIcon as MoreVerticalIcon
} from '@heroicons/vue/24/outline'

const activeTab = ref('team')
</script>
