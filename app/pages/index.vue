<script lang="ts">
import { defineComponent } from 'vue';
import { navigateTo } from 'nuxt/app';
import { Button } from "@/components/ui/button";
import { openUrl } from '~/shared/urlHandler';

// navigateTo('/pin');

export default defineComponent({
    components: {
        Button,
    },
    methods: {
        openUrl,
    },
    mounted() {
    },
});
</script>

<template>
    <div>
        Hello Index <Button @click="openUrl('https://axiolot.com.ng', 'Axiolot Hub')" class="font-app">Visit
            PPSMB</Button>
    </div>
</template>