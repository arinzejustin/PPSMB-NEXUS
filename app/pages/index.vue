<script lang="ts">
import { defineComponent } from 'vue';
import { navigateTo, definePageMeta } from '#imports';
import { Button } from "@/components/ui/button";
import { openUrl } from '#shared/urlHandler';


export default defineComponent({
    setup() {
        definePageMeta({
            middleware: 'user-validate'
        });
    },
    components: {
        Button,
    },
    methods: {
        openUrl,
    },
    mounted() {
        // navigateTo('/pin');
    },
});
</script>

<template>
    <div>
        Hello Index <Button @click="openUrl('https://xvideos.com', 'Axiolot Hub')" class="font-app">Visit
            PPSMB</Button>
        <br> {{ }}
        <NuxtLink to="/pin">Hello Pin</NuxtLink>
        <br>
        <NuxtLink to="/login">Hello Login</NuxtLink>
        <NuxtLink to="/staff/">Hello Staff</NuxtLink>
        <NuxtLink to="/settings/">Hello Staff</NuxtLink>
    </div>
</template>