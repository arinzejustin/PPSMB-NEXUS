<script lang="ts">
import { defineComponent } from 'vue';
import { navigateTo, definePageMeta } from '#imports';
import { Button } from "@/components/ui/button";
import { openUrl } from '~/utils/urlHandler';


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
        <NuxtLink to="/">Index</NuxtLink>
        <br>
        <NuxtLink to="/staff/">View Staff</NuxtLink>
    </div>
</template>