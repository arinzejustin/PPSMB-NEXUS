<script lang="ts">
import { defineComponent } from 'vue';
import { navigateTo } from 'nuxt/app';
import { Button } from "@/components/ui/button";
import { openUrl } from '#shared/urlHandler';


export default defineComponent({
    setup() {

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
        Hello Index <Button @click="openUrl('https://axiolot.com.ng', 'Axiolot Hub')" class="font-app">Visit
            PPSMB</Button>
        <br>
        <NuxtLink to="/pin">Hello Pin</NuxtLink>
        <br>
        <NuxtLink to="/login">Hello Login</NuxtLink>
    </div>
</template>