<script lang="ts">
import { defineComponent } from 'vue';
import SideLayer from '~/components/app/SideLayer.vue';

export default defineComponent({
    components: {
        SideLayer
    }
})
</script>

<template>
    <div class="flex h-screen items-center justify-center relative">
        <SideLayer width="52%" />
        <div class="w-full lg:w-[48%] min-h-screen lg:ml-auto flex items-center justify-center">
            <slot />
        </div>
    </div>
</template>