<template>
    <div class="min-h-screen  flex">
        <div class="grow flex flex-col items-center justify-center flex-auto auth p-10">
            <img src="../assets/Logo.png" alt="Logo" class="mb-6">
            <h1 class="mb-20">Hi, Welcome back</h1>
            <img src="../assets/login-illustration.png" alt="Login illustration">
        </div>
        <div class="w-[240px] grow flex flex-col justify-center p-10">
            <h2 class="pb-4">Sign in to CNC portal</h2>
            <!--<p class="pb-5">New User ? <span><a href="#" class="text-primary">Create an account</a></span></p>-->
            <div class="flex flex-col gap-5">
                <!--<input type="text" placeholder="Email address" class="input input-bordered w-full" />

                <label class="input input-bordered flex items-center gap-2">
                    <input type="password" class="grow" placeholder="Password" />
                    <span class="p-2 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M13.4999 12C13.4999 12.8284 12.8283 13.5 11.9999 13.5C11.1715 13.5 10.4999 12.8284 10.4999 12C10.4999 11.1716 11.1715 10.5 11.9999 10.5C12.8283 10.5 13.4999 11.1716 13.4999 12Z"
                                fill="#637381" />
                            <path fill-rule="evenodd" clip-rule="evenodd"
                                d="M11.7299 5C17.7099 4.82 21.2299 10.39 21.8699 11.5C22.0485 11.8094 22.0485 12.1906 21.8699 12.5C21.0099 14 17.7999 18.86 12.2699 19H12.0199C6.12989 19 2.75989 13.59 2.12989 12.5C1.95125 12.1906 1.95125 11.8094 2.12989 11.5C2.99989 10 6.19988 5.14 11.7299 5ZM8.49989 12C8.49989 13.933 10.0669 15.5 11.9999 15.5C13.9329 15.5 15.4999 13.933 15.4999 12C15.4999 10.067 13.9329 8.5 11.9999 8.5C10.0669 8.5 8.49989 10.067 8.49989 12Z"
                                fill="#637381" />
                        </svg>
                    </span>
                </label>

                <p class="text-right underline">Forgot password ?</p>-->
                <button class="btn btn-primary w-full" @click="signInWithEthereum">Sign In With Ethereum</button>
                <div class="flex justify-center items-center ">
                    <svg xmlns="http://www.w3.org/2000/svg" width="157" height="22" viewBox="0 0 157 22" fill="none">
                        <path d="M0 10.5H156" stroke="#919EAB" stroke-opacity="0.24" stroke-linecap="square"
                            stroke-dasharray="2 3" />
                    </svg>
                    <p class="p-2">OR</p>
                    <svg xmlns="http://www.w3.org/2000/svg" width="157" height="22" viewBox="0 0 157 22" fill="none">
                        <path d="M0 10.5H156" stroke="#919EAB" stroke-opacity="0.24" stroke-linecap="square"
                            stroke-dasharray="2 3" />
                    </svg>
                </div>
                <div class="flex justify-center gap-[8px]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"
                        class="m-2">
                        <path
                            d="M5.15152 10.1773C5.15152 9.63679 5.2413 9.11858 5.40152 8.63253L2.59698 6.49088C2.05039 7.60066 1.74243 8.85116 1.74243 10.1773C1.74243 11.5023 2.05001 12.7521 2.59584 13.8611L5.39887 11.7153C5.24016 11.2315 5.15152 10.7152 5.15152 10.1773Z"
                            fill="#637381" />
                        <path
                            d="M10.0758 5.26004C11.25 5.26004 12.3106 5.67612 13.144 6.35697L15.5682 3.93617C14.0909 2.65012 12.197 1.85579 10.0758 1.85579C6.78259 1.85579 3.95229 3.7391 2.59698 6.49087L5.40153 8.63253C6.04774 6.67092 7.88979 5.26004 10.0758 5.26004Z"
                            fill="#EB4335" />
                        <path
                            d="M10.0758 15.0946C7.88979 15.0946 6.04774 13.6837 5.40153 11.7221L2.59698 13.8634C3.95229 16.6155 6.78259 18.4988 10.0758 18.4988C12.1083 18.4988 14.0489 17.7771 15.5053 16.4249L12.8432 14.3668C12.0921 14.84 11.1462 15.0946 10.0758 15.0946Z"
                            fill="#34A853" />
                        <path
                            d="M18.0303 10.1773C18.0303 9.68558 17.9545 9.15603 17.8409 8.66431H10.0757V11.8794H14.5454C14.322 12.9756 13.7136 13.8183 12.8432 14.3668L15.5053 16.4249C17.0352 15.0049 18.0303 12.8897 18.0303 10.1773Z"
                            fill="#4285F4" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"
                        class="m-2">
                        <path
                            d="M14.1667 2.91667C14.1667 2.68655 13.9801 2.50001 13.75 2.50001H11.6667C9.48276 2.39122 7.62106 4.06675 7.5 6.25001V8.50001H5.41667C5.18655 8.50001 5 8.68655 5 8.91667V11.0833C5 11.3135 5.18655 11.5 5.41667 11.5H7.5V17.0833C7.5 17.3135 7.68655 17.5 7.91667 17.5H10.4167C10.6468 17.5 10.8333 17.3135 10.8333 17.0833V11.5H13.0167C13.2073 11.5027 13.3755 11.3758 13.425 11.1917L14.025 9.02501C14.0586 8.90023 14.0324 8.76693 13.9541 8.66415C13.8758 8.56136 13.7542 8.50073 13.625 8.50001H10.8333V6.25001C10.8763 5.82259 11.2371 5.49785 11.6667 5.50001H13.75C13.9801 5.50001 14.1667 5.31346 14.1667 5.08334V2.91667Z"
                            fill="#1877F2" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"
                        class="m-2">
                        <path
                            d="M6.73357 16.6667C9.22307 16.75 11.6405 15.823 13.436 14.0966C15.2315 12.3701 16.2525 9.9909 16.2669 7.50004C16.8316 6.80122 17.2509 5.99657 17.5002 5.13338C17.5382 4.99407 17.491 4.84542 17.3794 4.75368C17.2679 4.66195 17.1129 4.64421 16.9836 4.70838C16.3778 4.99998 15.6535 4.87256 15.1836 4.39171C14.5925 3.74449 13.7646 3.36418 12.8885 3.33749C12.0125 3.3108 11.1629 3.64 10.5336 4.25004C9.66604 5.09021 9.30235 6.3236 9.57524 7.50004C6.78357 7.66671 4.8669 6.34171 3.33357 4.52504C3.23944 4.41845 3.09119 4.3776 2.95576 4.42094C2.82032 4.46428 2.72333 4.58361 2.70857 4.72504C2.11033 8.04351 3.63929 11.384 6.5419 13.1C5.5916 14.1899 4.25708 14.8706 2.8169 15C2.65872 15.0263 2.53472 15.1502 2.50836 15.3083C2.482 15.4665 2.55911 15.6239 2.70024 15.7C3.95317 16.3262 5.33293 16.6569 6.73357 16.6667Z"
                            fill="#00AAEC" />
                    </svg>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
   import {signInWithEthereum} from '@/utils/loginUtil'
</script>

<style scoped >
    .auth {
        background-image: url('/src/assets/overlay_2.png');
        background-size: cover;
    }
</style>