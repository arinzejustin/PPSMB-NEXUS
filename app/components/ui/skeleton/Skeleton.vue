<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';

interface Props {
  class?: HTMLAttributes["class"]
  animated?: boolean;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
  animated: true,
  color: 'bg-primary/20'
});

const hasRoundedClass = computed(() => {
  return /\brounded(-\w+)?\b/.test(props.class);
});

const containerClasses = computed(() => {
  return [
    'relative overflow-hidden',
    !hasRoundedClass.value ? 'rounded-md' : '',
    props.color,
    props.class,
    props.animated ? '' : 'animate-pulse'
  ]
    .filter(Boolean)
    .join(' ');
});
</script>

<template>
  <div :class="containerClasses">
    <div v-if="animated" :class="`${hasRoundedClass}`"
      class="absolute inset-0 bg-linear-to-r from-transparent via-primary/30 to-transparent animate-shimmer" />
  </div>
</template>
