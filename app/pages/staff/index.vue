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
        Hello Index <Button @click="openUrl('https://axiolot.com.ng', 'Axiolot Hub')" class="font-app">Visit
            PPSMB</Button>
        <br> {{ }}
        <NuxtLink to="/">Index</NuxtLink>
        <br>
        <NuxtLink to="/staff/new">Add New </NuxtLink>
    </div>
</template>